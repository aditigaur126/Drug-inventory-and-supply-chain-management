import { NextResponse } from "next/server";
import prisma from "@/config/prisma.config";
import validateSession from "@/lib/validateSession";
import { getMissingTableMessage, isMissingTableError } from "@/lib/prismaErrors";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionResult = await validateSession();
  if ("error" in sessionResult) {
    return NextResponse.json(
      { error: sessionResult.error },
      { status: sessionResult.status }
    );
  }

  const { userId } = sessionResult;
  const { id } = params;

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "APPROVE").toUpperCase();

    // Check which new columns exist in production (migration may not be applied yet)
    const colCheck = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ResourceSharing'
        AND column_name IN ('item_id', 'status', 'reviewed_at')
    `;
    const existingCols = new Set(colCheck.map((r) => r.column_name));

    // Build a safe query using only columns that exist
    const selectCols = [
      `sharing_id`,
      `donor_hospital_id`,
      `receiver_hospital_id`,
      `item_name`,
      `quantity_shared`,
      `sharing_date`,
      existingCols.has("item_id") ? `item_id` : `NULL::text AS item_id`,
      existingCols.has("status") ? `status` : `'PENDING' AS status`,
    ].join(", ");

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ${selectCols} FROM "ResourceSharing" WHERE sharing_id = $1 LIMIT 1`,
      id
    );

    const transferRequest = rows[0] ?? null;

    if (!transferRequest) {
      return NextResponse.json(
        { error: "Transfer request not found" },
        { status: 404 }
      );
    }

    if (transferRequest.donor_hospital_id !== userId) {
      return NextResponse.json(
        { error: "Only the donor hospital can process this request" },
        { status: 403 }
      );
    }

    if (transferRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 409 }
      );
    }

    // Helper: update status safely — fall back to raw SQL if columns missing
    const updateStatus = async (
      tx: typeof prisma,
      status: string
    ): Promise<void> => {
      try {
        await (tx as any).resourceSharing.update({
          where: { sharing_id: id },
          data: { status, reviewed_at: new Date(), reviewed_by_hospital_id: userId } as any,
        });
      } catch {
        await (tx as any).$executeRaw`
          UPDATE "ResourceSharing"
          SET status = ${status}
          WHERE sharing_id = ${id}
        `;
      }
    };

    if (action === "REJECT") {
      await updateStatus(prisma, "REJECTED");

      await prisma.notification.create({
        data: {
          hospital_id: transferRequest.receiver_hospital_id,
          type: "RESOURCE_SHARING",
          message: `Your request for ${transferRequest.quantity_shared} units of ${transferRequest.item_name} was rejected.`,
          status: "UNREAD",
          visibility: true,
          item_name: transferRequest.item_name,
          current_quantity: transferRequest.quantity_shared,
        },
      });

      return NextResponse.json(
        { sharing_id: id, status: "REJECTED", message: "Transfer request rejected" },
        { status: 200 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // item_id may be null for requests created before the migration.
      // Fall back to matching by item_name via the Item table.
      let donorInventory: any;
      if (transferRequest.item_id) {
        donorInventory = await tx.medicalInventory.findFirst({
          where: {
            hospital_id: transferRequest.donor_hospital_id,
            item_id: transferRequest.item_id,
          },
          orderBy: { expiry_date: "asc" },
        });
      } else {
        // Resolve item_id from item_name
        const matchedItem = await tx.item.findFirst({
          where: { item_name: transferRequest.item_name },
          select: { item_id: true },
        });
        if (!matchedItem) {
          throw new Error(`Item "${transferRequest.item_name}" not found in the system`);
        }
        transferRequest.item_id = matchedItem.item_id;
        donorInventory = await tx.medicalInventory.findFirst({
          where: {
            hospital_id: transferRequest.donor_hospital_id,
            item_id: matchedItem.item_id,
          },
          orderBy: { expiry_date: "asc" },
        });
      }

      if (!donorInventory || donorInventory.quantity < transferRequest.quantity_shared) {
        throw new Error("Requested stock is no longer available");
      }

      const receiverDepartments = await tx.departments.findMany({
        where: {
          hospital_id: transferRequest.receiver_hospital_id,
        },
        orderBy: {
          department: "asc",
        },
        take: 1,
      });

      if (receiverDepartments.length === 0) {
        throw new Error("Receiver hospital has no departments configured");
      }

      const receiverDepartment = receiverDepartments[0];
      const remainingDonorQuantity = donorInventory.quantity - transferRequest.quantity_shared;

      if (remainingDonorQuantity > 0) {
        await tx.medicalInventory.update({
          where: { id: donorInventory.id },
          data: {
            quantity: remainingDonorQuantity,
          },
        });
      } else {
        await tx.medicalInventory.delete({
          where: { id: donorInventory.id },
        });
      }

      const receiverInventory = await tx.medicalInventory.findFirst({
        where: {
          hospital_id: transferRequest.receiver_hospital_id,
          item_id: donorInventory.item_id,
        },
        orderBy: {
          expiry_date: "asc",
        },
      });

      if (receiverInventory) {
        await tx.medicalInventory.update({
          where: { id: receiverInventory.id },
          data: {
            quantity: receiverInventory.quantity + transferRequest.quantity_shared,
          },
        });
      } else {
        await tx.medicalInventory.create({
          data: {
            hospital_id: transferRequest.receiver_hospital_id,
            department_id: receiverDepartment.id,
            item_id: donorInventory.item_id,
            batch_number: `TRANSFER-${id.slice(0, 8)}`,
            expiry_date: donorInventory.expiry_date,
            quantity: transferRequest.quantity_shared,
            threshold_quantity: donorInventory.threshold_quantity,
          },
        });
      }

      await updateStatus(tx as any, "APPROVED");
      const approvedRequest = { sharing_id: id, status: "APPROVED" };

      await tx.notification.create({
        data: {
          hospital_id: transferRequest.receiver_hospital_id,
          type: "RESOURCE_SHARING",
          message: `Your request for ${transferRequest.quantity_shared} units of ${transferRequest.item_name} was approved and transferred.`,
          status: "UNREAD",
          visibility: true,
          item_name: transferRequest.item_name,
          current_quantity: transferRequest.quantity_shared,
        },
      });

      return approvedRequest;
    });

    return NextResponse.json(
      { ...result, message: "Transfer approved and stock moved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing transfer request:", error);

    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: getMissingTableMessage(error) },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process transfer request",
      },
      { status: 500 }
    );
  }
}
