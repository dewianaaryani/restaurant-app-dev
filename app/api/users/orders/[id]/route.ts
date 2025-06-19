// app/api/orders/[id]/route.ts
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch order with all related data
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        order_items: {
          include: {
            menu: {
              include: {
                ratings: {
                  orderBy: {
                    created_at: "desc",
                  },
                },
                category: true,
              },
            },
          },
        },
        table: {
          select: {
            id: true,
            name: true,
            desc: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 }
      );
    }

    // You might want to add authorization check here
    // to ensure the user can access this order

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
