import { NextResponse } from "next/server";
import prisma from "@/config/prisma.config";
import validateSession from "@/lib/validateSession";

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
    const { item_id, quantity, department } = body;

    // Input validation
    if (!item_id || !quantity || !department) {
      return NextResponse.json(
        { error: "Invalid input data: item_id, quantity, and department are required" },
        { status: 400 }
      );
    }

    const departmentRecord = await prisma.departments.findFirst({
      where: {
        department: department,
        hospital_id: userId,
      },
    });

    if (!departmentRecord) {
      return NextResponse.json(
        { error: `Department '${department}' not found for this hospital` },
        { status: 404 }
      );
    }

    // Get or create cart
    let cart = await prisma.cart.findFirst({
      where: { hospital_id: userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          hospital: { connect: { id: userId } },
        },
      });
    }

    // Get item price
    const item = await prisma.item.findUnique({
      where: { item_id },
      select: { unit_price: true }, // Fetch only unit_price
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Add item to cart
    const cartItem = await prisma.cartItem.create({
      data: {
        cart: { connect: { id: cart.id } },
        item: { connect: { item_id } },
        quantity,
        unit_price: item.unit_price,
        department: { connect: { id: departmentRecord.id } },
      },
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        item: {
          select: {
            item_id: true,
            item_name: true,
            description: true,
            supplier: true,
            category: true,
          },
        }, // Fetch only item_id
        department: {
          select: {
            id: true,
            department: true,
          },
        }, // Fetch only department id and name
      },
    });

    return NextResponse.json(cartItem, { status: 201 });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return NextResponse.json(
      { error: "Error adding item to cart" },
      { status: 500 }
    );
  }
}

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
    const cart = await prisma.cart.findFirst({
      where: { hospital_id: userId },
      select: {
        id: true, // Cart ID
        cartItems: {
          select: {
            id: true, // Cart item ID
            quantity: true, // Item quantity
            unit_price: true, // Unit price of the item
            item: {
              select: {
                item_id: true,
                item_name: true,
                description: true,
                supplier: true,
                category: true,
              },
            }, // Only fetch item ID and name
            department: {
              select: {
                id: true,
                department: true,
              },
            }, // Only fetch department ID and name
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ cartItems: [] }, { status: 200 });
    }

    return NextResponse.json(cart.cartItems, { status: 200 });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json({ error: "Error fetching cart" }, { status: 500 });
  }
}



export async function DELETE(
  request: Request,
  { params }: { params?: { id?: string } } = {}
) {
  try {
    const id = params?.id;

    if (!id) {
      // Clear all cart items
      const deletedItems = await prisma.cartItem.deleteMany();
      return NextResponse.json(
        { message: "All cart items cleared", count: deletedItems.count },
        { status: 200 }
      );
    }

    // Delete specific cart item
    const deletedCartItem = await prisma.cartItem.delete({
      where: { id },
      select: {
        id: true,
        quantity: true,
        item: {
          select: {
            item_id: true,
            item_name: true,
            description: true,
            supplier: true,
            category: true,
          },
        },
        department: {
          select: {
            id: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(deletedCartItem, { status: 200 });
  } catch (error: any) {
    console.error("Error in cart operation:", error);

    // Handle specific Prisma errors
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // General error response
    return NextResponse.json(
      { error: "Error in cart operation" },
      { status: 500 }
    );
  }
}

