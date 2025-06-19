import prisma from "@/lib/db";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date();
    const startToday = startOfDay(today);
    const endToday = endOfDay(today);

    // For month comparison
    const startThisMonth = startOfMonth(today);
    const endThisMonth = endOfMonth(today);
    const lastMonth = subMonths(today, 1);
    const startLastMonth = startOfMonth(lastMonth);
    const endLastMonth = endOfMonth(lastMonth);

    // For day comparison
    const yesterday = subDays(today, 1);
    const startYesterday = startOfDay(yesterday);
    const endYesterday = endOfDay(yesterday);

    // === REVENUE CALCULATIONS ===

    // Total Revenue (all time)
    const totalRevenueResult = await prisma.order.aggregate({
      _sum: {
        total_amount: true,
      },
      where: {
        order_status: "completed",
      },
    });

    // Today Revenue
    const todayRevenueResult = await prisma.order.aggregate({
      _sum: {
        total_amount: true,
      },
      where: {
        order_status: "completed",
        completed_time: {
          gte: startToday,
          lte: endToday,
        },
      },
    });

    // This month revenue
    const thisMonthRevenueResult = await prisma.order.aggregate({
      _sum: {
        total_amount: true,
      },
      where: {
        order_status: "completed",
        completed_time: {
          gte: startThisMonth,
          lte: endThisMonth,
        },
      },
    });

    // Last month revenue (for comparison)
    const lastMonthRevenueResult = await prisma.order.aggregate({
      _sum: {
        total_amount: true,
      },
      where: {
        order_status: "completed",
        completed_time: {
          gte: startLastMonth,
          lte: endLastMonth,
        },
      },
    });

    // === ORDER CALCULATIONS ===

    // Orders today
    const ordersToday = await prisma.order.count({
      where: {
        order_time: {
          gte: startToday,
          lte: endToday,
        },
      },
    });

    // Orders yesterday (for comparison)
    const yesterdayOrders = await prisma.order.count({
      where: {
        order_time: {
          gte: startYesterday,
          lte: endYesterday,
        },
      },
    });

    // Completed today
    const completedToday = await prisma.order.count({
      where: {
        order_status: "completed",
        completed_time: {
          gte: startToday,
          lte: endToday,
        },
      },
    });

    // === CUSTOMER CALCULATIONS ===

    // Total Customers
    const totalCustomers = await prisma.user.count({
      where: { role: "customer" },
    });

    // New customers this month
    const newCustomersThisMonth = await prisma.user.count({
      where: {
        role: "customer",
        created_at: {
          gte: startThisMonth,
          lte: endThisMonth,
        },
      },
    });

    // New customers last month (for comparison)
    const newCustomersLastMonth = await prisma.user.count({
      where: {
        role: "customer",
        created_at: {
          gte: startLastMonth,
          lte: endLastMonth,
        },
      },
    });

    // === AVERAGE ORDER VALUE CALCULATIONS ===

    // Current month AOV
    const thisMonthOrders = await prisma.order.findMany({
      where: {
        order_status: "completed",
        completed_time: {
          gte: startThisMonth,
          lte: endThisMonth,
        },
      },
      select: { total_amount: true },
    });

    // Last month AOV (for comparison)
    const lastMonthOrders = await prisma.order.findMany({
      where: {
        order_status: "completed",
        completed_time: {
          gte: startLastMonth,
          lte: endLastMonth,
        },
      },
      select: { total_amount: true },
    });

    const thisMonthAOV =
      thisMonthOrders.length > 0
        ? thisMonthOrders.reduce((acc, order) => acc + order.total_amount, 0) /
          thisMonthOrders.length
        : 0;

    const lastMonthAOV =
      lastMonthOrders.length > 0
        ? lastMonthOrders.reduce((acc, order) => acc + order.total_amount, 0) /
          lastMonthOrders.length
        : 0;

    // === STATUS COUNTS ===

    // Pending Orders
    const pendingOrders = await prisma.order.count({
      where: { order_status: "pending" },
    });

    // Cooking Orders
    const cookingOrders = await prisma.order.count({
      where: { order_status: "cooking" },
    });

    // === RECENT ORDERS ===

    const recentOrders = await prisma.order.findMany({
      orderBy: { order_time: "desc" },
      take: 5,
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

    // === CALCULATE PERCENTAGE CHANGES ===

    // Revenue change (month over month)
    const thisMonthRevenue = thisMonthRevenueResult._sum.total_amount || 0;
    const lastMonthRevenue = lastMonthRevenueResult._sum.total_amount || 0;
    const revenueChange =
      lastMonthRevenue > 0
        ? Math.round(
            ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          )
        : thisMonthRevenue > 0
        ? 100
        : 0;

    // Orders change (day over day)
    const ordersChange =
      yesterdayOrders > 0
        ? Math.round(((ordersToday - yesterdayOrders) / yesterdayOrders) * 100)
        : ordersToday > 0
        ? 100
        : 0;

    // Customers change (month over month)
    const customersChange =
      newCustomersLastMonth > 0
        ? Math.round(
            ((newCustomersThisMonth - newCustomersLastMonth) /
              newCustomersLastMonth) *
              100
          )
        : newCustomersThisMonth > 0
        ? 100
        : 0;

    // AOV change (month over month)
    const avgOrderChange =
      lastMonthAOV > 0
        ? Math.round(((thisMonthAOV - lastMonthAOV) / lastMonthAOV) * 100)
        : thisMonthAOV > 0
        ? 100
        : 0;

    return NextResponse.json({
      stats: {
        totalRevenue: totalRevenueResult._sum.total_amount || 0,
        todayRevenue: todayRevenueResult._sum.total_amount || 0,
        revenueChange,
        ordersToday,
        ordersChange,
        totalCustomers,
        customersChange,
        averageOrderValue: Math.round(thisMonthAOV),
        avgOrderChange,
        pendingOrders,
        cookingOrders,
        completedToday,
      },
      recentOrders,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
