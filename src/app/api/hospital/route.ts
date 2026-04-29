import prisma from "@/config/prisma.config";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const hospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        hospitalName: true,
        state: true,
        admin_email: true,
        admin_name: true,
        contact_number: true,
        region: true,
        departments: true,
        orders: {
          select: {
            order_date: true,
          },
          orderBy: {
            order_date: "desc",
          },
          take: 1,
        },
      }
    }).then((hospitals) =>
      hospitals.map((hospital) => ({
        id: hospital.id,
        name: hospital.hospitalName,
        location: `${hospital.region}, ${hospital.state}`,
        contactPerson: hospital.admin_name,
        contactEmail: hospital.admin_email,
        contactPhone: hospital.contact_number,
        status: hospital.departments?.length ? "Active" : "Pending",
        lastOrderDate:
          hospital.orders[0]?.order_date?.toISOString().split("T")[0] ?? "",
      }))
    );

    return NextResponse.json({
      success: true,
      data: hospitals,
      total: hospitals.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching hospitals:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch hospitals",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}