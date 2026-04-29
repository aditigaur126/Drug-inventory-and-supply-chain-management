import { NextResponse } from "next/server";
import prisma from "@/config/prisma.config";
import validateSession from "@/lib/validateSession";
import { getMissingTableMessage, isMissingTableError } from "@/lib/prismaErrors";

type BranchInventoryEntry = {
  id: string;
  hospital: {
    id: string;
    hospitalName: string;
    state: string;
    pincode: string;
  } | null;
  item: {
    item_id: string;
    item_name: string;
  } | null;
  quantity: number;
  threshold_quantity: number;
};

type BranchInventoryItem = BranchInventoryEntry & {
  hospital: NonNullable<BranchInventoryEntry["hospital"]>;
  item: NonNullable<BranchInventoryEntry["item"]>;
};

export async function GET() {
  const sessionResult = await validateSession();
  if ("error" in sessionResult) {
    return NextResponse.json(
      { error: sessionResult.error },
      { status: sessionResult.status }
    );
  }

  const { userId, hospitalName } = sessionResult;

  try {
    const hospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        hospitalName: true,
        state: true,
        pincode: true,
        region: true,
      },
      orderBy: {
        hospitalName: "asc",
      },
    });

    const inventory = (await prisma.medicalInventory.findMany({
      include: {
        hospital: {
          select: {
            id: true,
            hospitalName: true,
            state: true,
            pincode: true,
          },
        },
        item: {
          select: {
            item_id: true,
            item_name: true,
          },
        },
      },
      orderBy: {
        expiry_date: "asc",
      },
    })) as BranchInventoryEntry[];

    const resourceSharing = await prisma.resourceSharing.findMany({
      include: {
        donorHospital: {
          select: { id: true, hospitalName: true },
        },
        receiverHospital: {
          select: { id: true, hospitalName: true },
        },
      },
      orderBy: {
        sharing_date: "desc",
      },
      take: 50,
    }) as any[];

    const flattenedInventory = inventory
      .filter(
        (entry): entry is BranchInventoryItem => Boolean(entry.hospital && entry.item)
      )
      .map((entry) => ({
        id: entry.id,
        itemId: entry.item.item_id,
        name: entry.item.item_name,
        branchId: entry.hospital.id,
        branchName: entry.hospital.hospitalName,
        state: entry.hospital.state,
        pincode: entry.hospital.pincode,
        stock: entry.quantity,
        critical: entry.threshold_quantity,
        capacity: Math.max(entry.threshold_quantity * 4, entry.quantity + 50),
      }));

    const transferHistory = (resourceSharing as any[])
      .filter((sharing) => sharing.donorHospital && sharing.receiverHospital)
      .map((sharing) => ({
        id: sharing.sharing_id,
        fromHospitalId: sharing.donor_hospital_id,
        toHospitalId: sharing.receiver_hospital_id,
        from: sharing.donorHospital?.hospitalName || "Unknown",
        to: sharing.receiverHospital?.hospitalName || "Unknown",
        itemId: sharing.item_id || null, // May not exist in old schema
        medicine: sharing.item_name || "Unknown Item",
        quantity: sharing.quantity_shared,
        status: sharing.status || "PENDING", // Default if column doesn't exist
        reviewedAt: sharing.reviewed_at || null, // May not exist in old schema
        date: sharing.sharing_date,
      }));

    return NextResponse.json(
      {
        hospitals,
        inventory: flattenedInventory,
        transferHistory,
        currentHospitalId: userId,
        currentHospitalName: hospitalName,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Branches API error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      type: error?.constructor?.name,
      stack: error?.stack,
    });

    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: getMissingTableMessage(error) },
        { status: 503 }
      );
    }

    // Return detailed error for debugging (will remove after fix)
    return NextResponse.json(
      {
        error: "Unable to load branches data.",
        message: error?.message || "Unknown error",
        code: error?.code || null,
        type: error?.constructor?.name || null,
      },
      { status: 500 }
    );
  }
}
