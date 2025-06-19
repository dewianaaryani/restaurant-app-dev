// app/api/admin/sales/route.ts
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Define the Prisma result type (what we actually get from the database)
type PrismaOrderResult = {
  id: string;
  customer_id: string;
  table_id: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  order_time: Date; // This is Date from Prisma
  completed_time: Date | null; // This is Date from Prisma
  kasir_id: string | null;
  created_at: Date;
  updated_at: Date;
  table: {
    id: string;
    name: string;
    desc: string | null;
  };
  customer: {
    id: string;
    name: string | null;
    email: string;
  };
  order_items: {
    id: string;
    order_id: string;
    menu_id: string;
    price: number;
    quantity: number;
    subtotal: number;
    customization: string | null;
    menu: {
      id: string;
      name: string;
      category_id: string;
      category: {
        id: string;
        name: string;
      } | null;
    };
  }[];
};

// Define the API Order type for processing
interface APIOrder {
  id: string;
  customer_id: string;
  table_id: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  order_time: string;
  completed_time: string | null;
  kasir_id: string | null;
  created_at: Date;
  updated_at: Date;
  table: {
    id: string;
    name: string;
    desc: string | null;
  };
  customer: {
    id: string;
    name: string | null;
    email: string;
  };
  order_items: {
    id: string;
    order_id: string;
    menu_id: string;
    price: number;
    quantity: number;
    subtotal: number;
    customization: string | null;
    menu: {
      id: string;
      name: string;
      category_id: string;
      category: {
        id: string;
        name: string;
      } | null;
    };
  }[];
}

// Helper function to convert Prisma result to API format
function convertToAPIOrder(order: PrismaOrderResult): APIOrder {
  return {
    ...order,
    order_time: order.order_time.toISOString(),
    completed_time: order.completed_time?.toISOString() || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily"; // daily or weekly
    const days = parseInt(searchParams.get("days") || "30"); // number of days to fetch

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Fetch orders with related data - FIXED: Added table to include
    const ordersFromDb = await prisma.order.findMany({
      where: {
        payment_status: "paid",
        order_status: "completed",
        completed_time: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
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
        order_items: {
          include: {
            menu: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        completed_time: "desc",
      },
    });

    // Convert to API format
    const orders = ordersFromDb.map(convertToAPIOrder);

    // Calculate summary statistics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.total_amount,
      0
    );
    const totalOrders = orders.length;
    const uniqueCustomers = new Set(orders.map((order) => order.customer_id))
      .size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Process data based on type
    let salesData;
    if (type === "daily") {
      salesData = processDailySales(orders);
    } else {
      salesData = processWeeklySales(orders);
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue, // Keep as is for IDR
          totalOrders,
          uniqueCustomers,
          avgOrderValue: avgOrderValue, // Keep as is for IDR
        },
        salesData,
        orders: orders.map((order) => ({
          ...order,
          total_amount: order.total_amount, // Keep as is for IDR
          order_items: order.order_items.map((item) => ({
            ...item,
            price: item.price, // Keep as is for IDR
            subtotal: item.subtotal, // Keep as is for IDR
          })),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sales data",
      },
      { status: 500 }
    );
  }
}

// Helper function to process daily sales
function processDailySales(orders: APIOrder[]) {
  const dailyData = new Map<
    string,
    {
      date: string;
      revenue: number;
      orders: number;
      customers: Set<string>;
      avgOrderValue: number;
    }
  >();

  orders.forEach((order) => {
    // Handle null completed_time by falling back to order_time
    const orderDate = order.completed_time || order.order_time;
    const date = new Date(orderDate).toISOString().split("T")[0];
    const revenue = order.total_amount; // Keep as IDR

    if (!dailyData.has(date)) {
      dailyData.set(date, {
        date,
        revenue: 0,
        orders: 0,
        customers: new Set(),
        avgOrderValue: 0,
      });
    }

    const dayData = dailyData.get(date)!;
    dayData.revenue += revenue;
    dayData.orders += 1;
    dayData.customers.add(order.customer_id);
  });

  // Convert sets to counts and calculate averages
  const result = Array.from(dailyData.values()).map((day) => ({
    date: day.date,
    revenue: day.revenue,
    orders: day.orders,
    customers: day.customers.size,
    avgOrderValue: day.revenue / day.orders,
  }));

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// Helper function to process weekly sales
function processWeeklySales(orders: APIOrder[]) {
  const weeklyData = new Map<
    string,
    {
      week: string;
      weekStart: string;
      weekEnd: string;
      revenue: number;
      orders: number;
      customers: Set<string>;
      avgOrderValue: number;
      growth: number;
    }
  >();

  orders.forEach((order) => {
    // Handle null completed_time by falling back to order_time
    const orderDate = new Date(order.completed_time || order.order_time);
    const weekStart = new Date(orderDate);
    weekStart.setDate(orderDate.getDate() - orderDate.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

    const weekKey = weekStart.toISOString().split("T")[0];
    const revenue = order.total_amount; // Keep as IDR

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, {
        week: `Week of ${weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
        weekStart: weekKey,
        weekEnd: weekEnd.toISOString().split("T")[0],
        revenue: 0,
        orders: 0,
        customers: new Set(),
        avgOrderValue: 0,
        growth: 0,
      });
    }

    const weekData = weeklyData.get(weekKey)!;
    weekData.revenue += revenue;
    weekData.orders += 1;
    weekData.customers.add(order.customer_id);
  });

  // Convert sets to counts and calculate averages
  const sortedWeeks = Array.from(weeklyData.values())
    .map((week) => ({
      week: week.week,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      revenue: week.revenue,
      orders: week.orders,
      customers: week.customers.size,
      avgOrderValue: week.revenue / week.orders,
      growth: 0,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Calculate growth percentage
  sortedWeeks.forEach((week, index) => {
    if (index > 0) {
      const previousWeek = sortedWeeks[index - 1];
      week.growth =
        ((week.revenue - previousWeek.revenue) / previousWeek.revenue) * 100;
    }
  });

  return sortedWeeks;
}
