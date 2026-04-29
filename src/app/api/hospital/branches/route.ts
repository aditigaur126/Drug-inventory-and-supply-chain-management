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

    // Query only columns that exist in the old production schema
    // item_id, status, reviewed_at will be added in a future migration
    const resourceSharing = await prisma.$queryRaw`
      SELECT 
        sharing_id,
        donor_hospital_id,
        receiver_hospital_id,
        item_name,
        quantity_shared,
        sharing_date
      FROM "ResourceSharing"
      ORDER BY sharing_date DESC
      LIMIT 50
    ` as any[];

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

    // Fetch hospital names for the sharing records
    const hospitalIds = new Set<string>();
    resourceSharing.forEach((sharing) => {
      hospitalIds.add(sharing.donor_hospital_id);
      hospitalIds.add(sharing.receiver_hospital_id);
    });

    const hospitals_map = await prisma.hospital.findMany({
      where: { id: { in: Array.from(hospitalIds) } },
      select: { id: true, hospitalName: true },
    });

    const hospitalMap = new Map(
      hospitals_map.map((h: any) => [h.id, h.hospitalName])
    );

    const transferHistory = resourceSharing
      .map((sharing) => ({
        id: sharing.sharing_id,
        fromHospitalId: sharing.donor_hospital_id,
        toHospitalId: sharing.receiver_hospital_id,
        from: hospitalMap.get(sharing.donor_hospital_id) || "Unknown",
        to: hospitalMap.get(sharing.receiver_hospital_id) || "Unknown",
        itemId: null, // Not in old schema yet
        medicine: sharing.item_name || "Unknown Item",
        quantity: sharing.quantity_shared,
        status: "PENDING", // Default for old schema
        reviewedAt: null, // Not in old schema yet
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
