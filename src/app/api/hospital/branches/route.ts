import { NextResponse } from "next/server";
import prisma from "@/config/prisma.config";
import validateSession from "@/lib/validateSession";
import { getMissingTableMessage, isMissingTableError } from "@/lib/prismaErrors";

export async function GET() {
  const sessionResult = await validateSession();
  if ("error" in sessionResult) {
    return NextResponse.json(
      { error: sessionResult.error },
      { status: sessionResult.status }
    );
  }

  const { userId } = sessionResult;

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

    const inventory = await prisma.medicalInventory.findMany({
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
            item_name: true,
          },
        },
      },
    });

    const resourceSharing = await prisma.resourceSharing.findMany({
      include: {
        donorHospital: {
          select: { hospitalName: true },
        },
        receiverHospital: {
          select: { hospitalName: true },
        },
      },
      orderBy: {
        sharing_date: "desc",
      },
      take: 50,
    });

    const flattenedInventory = inventory.map((entry) => ({
      id: entry.id,
      name: entry.item.item_name,
      branchId: entry.hospital.id,
      branchName: entry.hospital.hospitalName,
      state: entry.hospital.state,
      pincode: entry.hospital.pincode,
      stock: entry.quantity,
      critical: entry.threshold_quantity,
      capacity: Math.max(entry.threshold_quantity * 4, entry.quantity + 50),
    }));

    const transferHistory = resourceSharing.map((sharing) => ({
      id: sharing.sharing_id,
      from: sharing.donorHospital.hospitalName,
      to: sharing.receiverHospital.hospitalName,
      medicine: sharing.item_name,
      quantity: sharing.quantity_shared,
      status: "Approved",
      date: sharing.sharing_date,
    }));

    return NextResponse.json(
      {
        hospitals,
        inventory: flattenedInventory,
        transferHistory,
        currentHospitalId: userId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Branches API error:", error);

    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: getMissingTableMessage(error) },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Unable to load branches data." },
      { status: 500 }
    );
  }
}
