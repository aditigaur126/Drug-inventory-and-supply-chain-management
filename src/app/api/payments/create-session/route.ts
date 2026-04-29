import { NextResponse } from "next/server";
import validateSession from "@/lib/validateSession";
import prisma from "@/config/prisma.config";

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
    const { orderId, totalAmount, paymentMethod } = body;

    if (!orderId || !totalAmount || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, totalAmount, paymentMethod" },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to user's hospital
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        hospital_id: userId,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Create payment record in database
    const payment = await (prisma as any).payment.create({
      data: {
        order_id: orderId,
        amount: totalAmount,
        payment_method: paymentMethod,
        status: "PENDING",
        transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    // For demo purposes, auto-approve payments
    // In production, this would integrate with Stripe/PayPal
    const approvedPayment = await (prisma as any).payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        paid_at: new Date(),
      },
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: orderId },
      data: { payment_status: true },
    });

    return NextResponse.json(
      {
        success: true,
        payment_id: approvedPayment.id,
        transaction_id: approvedPayment.transaction_id,
        status: "SUCCESS",
        message: "Payment processed successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
