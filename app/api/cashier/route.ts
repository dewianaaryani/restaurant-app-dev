import prisma from "@/lib/db";
import { startOfDay, subDays } from "date-fns";
import { NextResponse } from "next/server";

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

    console.log("orders", orders);
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { message: "Failed to load orders" },
      { status: 500 }
    );
  }
}
