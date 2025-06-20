import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { OrderItem } from "@/types";

interface CheckoutRequest {
  tableId: string;
  items: OrderItem[];
}

type MenuItemWithAvailability = {
  id: string;
  name: string;
  price: number;
  stock: number;
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
        },
        { status: 400 }
      );
    }

    // Extract valid menu IDs
    const menuIds = items
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));

    if (menuIds.length === 0) {
      return NextResponse.json(
        { error: "No valid menu items found" },
        { status: 400 }
      );
    }

    // Validate that all menu items exist, are available, and have sufficient stock
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

    // Check stock availability
    const stockErrors = [];
    for (const item of items) {
      const menuItem = menuItems.find((menu) => menu.id === item.id);
      if (menuItem && menuItem.stock < item.quantity) {
        stockErrors.push({
          menu_id: item.id,
          menu_name: menuItem.name,
          requested: item.quantity,
          available: menuItem.stock,
        });
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Insufficient stock for some items",
          stock_errors: stockErrors,
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

      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Invalid quantity for item ${item.id}`);
      }

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

    // Create order with order items, update stock, and log in a transaction
    const order = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            customer_id: session.user.id,
            table_id: tableId,
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
            table: true,
          },
        });

        // Update stock for each menu item
        for (const item of items) {
          await tx.menu.update({
            where: { id: item.id },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Create log entry for order creation
        await tx.log.create({
          data: {
            user_id: session.user.id,
            action: "order_created",
            message: `Order ${newOrder.id
              .slice(-8)
              .toUpperCase()} created for table ${table.name} with ${
              items.length
            } items. Total: ${totalAmount}`,
          },
        });

        // Create log entries for stock updates
        for (const item of items) {
          const menuItem = menuItems.find((menu) => menu.id === item.id);
          if (menuItem) {
            await tx.log.create({
              data: {
                user_id: session.user.id,
                action: "stock_updated",
                message: `Stock reduced for ${menuItem.name}: -${
                  item.quantity
                } (Order: ${newOrder.id.slice(-8).toUpperCase()})`,
              },
            });
          }
        }

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

    // Log error to database if possible
    try {
      const session = await auth();
      if (session?.user?.id) {
        await prisma.log.create({
          data: {
            user_id: session.user.id,
            action: "order_error",
            message: `Order creation failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return NextResponse.json(
      { error: "Failed to process checkout" },
      { status: 500 }
    );
  }
}
