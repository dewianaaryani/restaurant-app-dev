import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { subDays, startOfDay } from "date-fns";
import { OrderStatus } from "@/types";

export async function GET() {
  try {
    const now = new Date();
    const yesterday = subDays(startOfDay(now), 1); // mulai dari kemarin jam 00:00
    const todayEnd = new Date(); // sekarang (sampai waktu saat ini)

    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: yesterday, // greater than or equal to yesterday 00:00
          lte: todayEnd, // less than or equal to now
        },
      },
      orderBy: {
        created_at: "desc",
      },
      include: {
        order_items: {
          include: {
            menu: true,
          },
        },
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { message: "Failed to load orders" },
      { status: 500 }
    );
  }
}

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cooking"],
  cooking: ["ready"],
  ready: ["completed"],
  completed: [],
};

export async function PUT(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { order_id, order_status } = body;

    // Input validation
    if (!order_id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!order_status) {
      return NextResponse.json(
        { error: "Order status is required" },
        { status: 400 }
      );
    }
    // Check if order exists and get current status
    const existingOrder = await prisma.order.findUnique({
      where: { id: order_id },
      select: {
        id: true,
        order_status: true,
        customer_id: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentStatus = existingOrder.order_status as OrderStatus;

    // Check if status transition is valid
    if (!VALID_TRANSITIONS[currentStatus].includes(order_status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${order_status}'`,
          validTransitions: VALID_TRANSITIONS[currentStatus],
        },
        { status: 400 }
      );
    }

    // Skip update if status is the same
    if (currentStatus === order_status) {
      return NextResponse.json({
        success: true,
        message: "Order status is already up to date",
        order: existingOrder,
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: order_id },
      data: {
        order_status,
        updated_at: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order_items: {
          include: {
            menu: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Order status successfully updated to '${order_status}'`,
      order: updatedOrder,
      previousStatus: currentStatus,
    });
  } catch (error) {
    console.error("Error updating order status:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
