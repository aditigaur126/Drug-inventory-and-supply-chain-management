import { NextResponse } from "next/server";
import prisma from "@/config/prisma.config";
import validateSession from "@/lib/validateSession";
import { getMissingTableMessage, isMissingTableError } from "@/lib/prismaErrors";

export async function POST(request: Request) {
  const sessionResult = await validateSession();
  if ("error" in sessionResult) {
    return NextResponse.json(
      { error: sessionResult.error },
      { status: sessionResult.status }
    );
  }

  const { userId } = sessionResult;

  try {
    const body = await request.json();
    const { donor_hospital_id, item_id, quantity_shared } = body;

    if (!donor_hospital_id || !item_id || !quantity_shared) {
      return NextResponse.json(
        {
          error:
            "donor_hospital_id, item_id, and quantity_shared are required",
        },
        { status: 400 }
      );
    }

    if (donor_hospital_id === userId) {
      return NextResponse.json(
        { error: "You cannot request stock from your own hospital" },
        { status: 400 }
      );
    }

    const [donorHospital, receiverHospital, item, donorInventory] = await Promise.all([
      prisma.hospital.findUnique({
        where: { id: donor_hospital_id },
        select: { id: true, hospitalName: true },
      }),
      prisma.hospital.findUnique({
        where: { id: userId },
        select: { id: true, hospitalName: true },
      }),
      prisma.item.findUnique({
        where: { item_id },
        select: { item_id: true, item_name: true },
      }),
      prisma.medicalInventory.findFirst({
        where: {
          hospital_id: donor_hospital_id,
          item_id,
        },
        orderBy: {
          expiry_date: "asc",
        },
      }),
    ]);

    if (!donorHospital || !receiverHospital) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!donorInventory || donorInventory.quantity < quantity_shared) {
      return NextResponse.json(
        { error: "Requested stock is not available at the donor hospital" },
        { status: 400 }
      );
    }

    // Use a raw insert to stay compatible with the production schema which may
    // not yet have the item_id / status / reviewed_at columns added in the
    // 20260427190159 migration.  We attempt the full Prisma create first and
    // fall back to a minimal raw insert that only touches columns that are
    // guaranteed to exist in the old schema.
    let requestRecord: any;
    try {
      requestRecord = await prisma.resourceSharing.create({
        data: {
          donor_hospital_id,
          receiver_hospital_id: userId,
          item_id,
          item_name: item.item_name,
          quantity_shared,
          status: "PENDING",
          sharing_date: new Date(),
        } as any,
      });
    } catch (createError: any) {
      // If the error is a missing column (migration not yet applied on production)
      // fall back to inserting only the columns that existed in the original schema.
      const missingColumn =
        createError?.message?.includes("item_id") ||
        createError?.message?.includes("status") ||
        createError?.message?.includes("reviewed_at") ||
        createError?.code === "42703"; // PostgreSQL "undefined_column"

      if (!missingColumn) throw createError;

      const sharingId = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "ResourceSharing"
          (sharing_id, donor_hospital_id, receiver_hospital_id, item_name, quantity_shared, sharing_date)
        VALUES
          (${sharingId}, ${donor_hospital_id}, ${userId}, ${item.item_name}, ${quantity_shared}, NOW())
      `;
      requestRecord = {
        sharing_id: sharingId,
        donor_hospital_id,
        receiver_hospital_id: userId,
        item_name: item.item_name,
        quantity_shared,
        sharing_date: new Date(),
      };
    }

    await prisma.notification.create({
      data: {
        hospital_id: donor_hospital_id,
        type: "RESOURCE_SHARING",
        message: `${receiverHospital.hospitalName} requested ${quantity_shared} units of ${item.item_name}.`,
        status: "UNREAD",
        visibility: true,
        item_name: item.item_name,
        current_quantity: quantity_shared,
      },
    });

    return NextResponse.json(
      {
        ...requestRecord,
        message: "Transfer request created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating transfer request:", error);

    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: getMissingTableMessage(error) },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create transfer request" },
      { status: 500 }
    );
  }
}
