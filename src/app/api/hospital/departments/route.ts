import prisma from "@/config/prisma.config";
import validateSession from "@/lib/validateSession";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sessionResult = await validateSession();
  if ("error" in sessionResult) {
    return NextResponse.json(
      { error: sessionResult.error },
      { status: sessionResult.status }
    );
  }

  const { userId, hospitalName, email } = sessionResult;

  try {
    const departments = await prisma.departments.findMany({
      where: {
        hospital_id: userId,
      },
      select: {
        id: true,
        hospital_id: true,
        hod_name: true,
        hod_email: true,
        department: true,
      },
    });

    if (departments.length === 0) {
      return NextResponse.json(
        { message: "No departments found for this hospital", departments: [] },
        { status: 200 }
      );
    }
    return NextResponse.json(departments, { status: 200 });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
