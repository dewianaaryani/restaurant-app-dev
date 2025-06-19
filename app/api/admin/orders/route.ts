import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        order_time: "desc",
      },
      include: {
        customer: true,
        kasir: true,
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
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
