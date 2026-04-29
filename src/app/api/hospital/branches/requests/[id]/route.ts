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

    const transferRequest = (await prisma.resourceSharing.findUnique({
      where: { sharing_id: id },
    })) as any;

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

    if (action === "REJECT") {
      const rejectedRequest = await prisma.resourceSharing.update({
        where: { sharing_id: id },
        data: {
          status: "REJECTED",
          reviewed_at: new Date(),
          reviewed_by_hospital_id: userId,
        } as any,
      });

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
        { ...rejectedRequest, message: "Transfer request rejected" },
        { status: 200 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const donorInventory = await tx.medicalInventory.findFirst({
        where: {
          hospital_id: transferRequest.donor_hospital_id,
          item_id: transferRequest.item_id ?? undefined,
        },
        orderBy: {
          expiry_date: "asc",
        },
      });

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

      const approvedRequest = await tx.resourceSharing.update({
        where: { sharing_id: id },
        data: {
          status: "APPROVED",
          reviewed_at: new Date(),
          reviewed_by_hospital_id: userId,
        } as any,
      });

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
