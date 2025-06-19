import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { OrderItem } from "@/types";

interface CheckoutRequest {
  tableId: string; // Changed from tableNumber to tableId
  items: OrderItem[];
}

// Types for database models
type MenuItemWithAvailability = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body: CheckoutRequest = await request.json();
    const { tableId, items } = body;

    // Debug: Log the incoming data
    console.log("Checkout request body:", JSON.stringify(body, null, 2));
    console.log("Items received:", items);

    // Validate request data
    if (!tableId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Table ID and items are required" },
        { status: 400 }
      );
    }

    // Validate that the table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Invalid table selected" },
        { status: 400 }
      );
    }

    // Validate that all items have valid IDs and required fields
    const invalidItems = items.filter((item, index) => {
      const isInvalid =
        !item.id ||
        typeof item.id !== "string" ||
        !item.quantity ||
        item.quantity <= 0;
      if (isInvalid) {
        console.log(`Invalid item at index ${index}:`, {
          id: item.id,
          idType: typeof item.id,
          quantity: item.quantity,
          quantityType: typeof item.quantity,
          item: item,
        });
      }
      return isInvalid;
    });

    if (invalidItems.length > 0) {
      console.log("Invalid items found:", invalidItems);
      return NextResponse.json(
        {
          error: "All items must have valid ID and quantity",
          invalid_items: invalidItems,
          debug_info: {
            total_items: items.length,
            invalid_count: invalidItems.length,
          },
        },
        { status: 400 }
      );
    }

    // Extract valid menu IDs (filter out any null/undefined values)
    const menuIds = items
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));

    // Double-check we still have items after filtering
    if (menuIds.length === 0) {
      return NextResponse.json(
        { error: "No valid menu items found" },
        { status: 400 }
      );
    }

    // Validate that all menu items exist and are available
    const menuItems = await prisma.menu.findMany({
      where: {
        id: { in: menuIds },
        is_available: true,
      },
    });

    if (menuItems.length !== menuIds.length) {
      const foundIds = menuItems.map((item) => item.id);
      const missingIds = menuIds.filter((id) => !foundIds.includes(id));

      return NextResponse.json(
        {
          error: "Some menu items are not available or do not exist",
          missing_items: missingIds,
        },
        { status: 400 }
      );
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItemsData = items.map((item) => {
      const menuItem = menuItems.find(
        (menu: MenuItemWithAvailability) => menu.id === item.id
      );
      if (!menuItem) {
        throw new Error(`Menu item ${item.id} not found`);
      }

      // Validate quantity
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Invalid quantity for item ${item.id}`);
      }

      // Use the price from database, not from client
      const subtotal = menuItem.price * item.quantity;
      totalAmount += subtotal;

      return {
        menu_id: item.id,
        price: menuItem.price,
        quantity: item.quantity,
        subtotal: subtotal,
        customization: item.customization || null,
      };
    });

    // Create order with order items in a transaction
    const order = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            customer_id: session.user.id,
            table_id: tableId, // Changed from table_number to table_id
            order_status: "pending",
            payment_status: "pending",
            total_amount: totalAmount,
            order_time: new Date(),
            order_items: {
              create: orderItemsData,
            },
          },
          include: {
            order_items: {
              include: {
                menu: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            table: true, // Include table information
          },
        });

        return newOrder;
      }
    );

    // Return success response
    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          order_number: order.id.slice(-8).toUpperCase(),
          customer: order.customer,
          table: {
            id: order.table.id,
            name: order.table.name,
            desc: order.table.desc,
          },
          total_amount: order.total_amount,
          order_status: order.order_status,
          payment_status: order.payment_status,
          order_time: order.order_time,
          items: order.order_items.map((item: OrderItem) => ({
            id: item.id,
            menu_name: item.menu.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            customization: item.customization,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to process checkout" },
      { status: 500 }
    );
  }
}
