// app/api/admin/sales/export/route.ts
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Define the Prisma result type (what we actually get from the database)
type PrismaOrderResult = {
  id: string;
  customer_id: string;
  table_id: string; // Changed from table_number to table_id
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
  table_id: string; // Changed from table_number to table_id
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, startDate, endDate } = body;

    // Fetch orders for the specified date range - FIXED: Added table to include
    const ordersFromDb = await prisma.order.findMany({
      where: {
        payment_status: "paid",
        order_status: "completed",
        completed_time: {
          gte: new Date(startDate),
          lte: new Date(endDate),
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

    // Process the data based on type
    let reportData;
    if (type === "daily") {
      reportData = processDailySales(orders);
    } else {
      reportData = processWeeklySales(orders);
    }

    // Calculate summary for the export
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.total_amount,
      0
    );
    const totalOrders = orders.length;
    const uniqueCustomers = new Set(orders.map((order) => order.customer_id))
      .size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group orders by table for additional insights
    const tablePerformance = new Map<
      string,
      { name: string; revenue: number; orders: number }
    >();
    orders.forEach((order) => {
      const tableKey = order.table.id;
      if (!tablePerformance.has(tableKey)) {
        tablePerformance.set(tableKey, {
          name: order.table.name,
          revenue: 0,
          orders: 0,
        });
      }
      const tableData = tablePerformance.get(tableKey)!;
      tableData.revenue += order.total_amount;
      tableData.orders += 1;
    });

    const topTables = Array.from(tablePerformance.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        type,
        period: {
          startDate,
          endDate,
        },
        summary: {
          totalRevenue,
          totalOrders,
          uniqueCustomers,
          avgOrderValue,
        },
        reportData,
        tablePerformance: topTables,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating export data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate export data",
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
      tables: Set<string>;
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
        tables: new Set(),
        avgOrderValue: 0,
      });
    }

    const dayData = dailyData.get(date)!;
    dayData.revenue += revenue;
    dayData.orders += 1;
    dayData.customers.add(order.customer_id);
    dayData.tables.add(order.table_id);
  });

  // Convert sets to counts and calculate averages
  const result = Array.from(dailyData.values()).map((day) => ({
    date: day.date,
    revenue: day.revenue,
    orders: day.orders,
    customers: day.customers.size,
    tables: day.tables.size,
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
      tables: Set<string>;
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
        tables: new Set(),
        avgOrderValue: 0,
        growth: 0,
      });
    }

    const weekData = weeklyData.get(weekKey)!;
    weekData.revenue += revenue;
    weekData.orders += 1;
    weekData.customers.add(order.customer_id);
    weekData.tables.add(order.table_id);
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
      tables: week.tables.size,
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
