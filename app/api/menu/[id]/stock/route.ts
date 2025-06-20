// app/api/menu/[id]/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

// Validation schema for stock updates
const stockUpdateSchema = z.object({
  action: z.enum(["add", "set", "subtract"], {
    required_error: "Action is required (add, set, or subtract)",
  }),
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or greater"),
  reason: z.string().optional(), // Optional reason for logging
});

interface StockUpdateRequest {
  action: "add" | "set" | "subtract";
  quantity: number;
  reason?: string;
}

// PUT - Update stock for a specific menu item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body: StockUpdateRequest = await request.json();

    // Validate request body
    const validatedData = stockUpdateSchema.parse(body);
    const { action, quantity, reason } = validatedData;

    // Check if menu item exists
    const menuItem = await prisma.menu.findUnique({
      where: { id },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    if (!menuItem) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    // Calculate new stock based on action
    let newStock: number;
    let stockChange: number;

    switch (action) {
      case "add":
        newStock = menuItem.stock + quantity;
        stockChange = quantity;
        break;
      case "subtract":
        newStock = Math.max(0, menuItem.stock - quantity); // Prevent negative stock
        stockChange = -Math.min(quantity, menuItem.stock);
        break;
      case "set":
        newStock = quantity;
        stockChange = quantity - menuItem.stock;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Perform stock update and logging in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update menu item stock
      const updatedMenuItem = await tx.menu.update({
        where: { id },
        data: { stock: newStock },
        include: {
          category: {
            select: { name: true },
          },
        },
      });

      // Create log entry for stock change
      await tx.log.create({
        data: {
          user_id: session.user.id,
          action: "stock_updated",
          message: `Stock ${action} for "${menuItem.name}": ${
            stockChange > 0 ? "+" : ""
          }${stockChange} (${menuItem.stock} → ${newStock})${
            reason ? ` - Reason: ${reason}` : ""
          }`,
        },
      });

      return updatedMenuItem;
    });

    // Transform response data
    const transformedMenuItem = {
      id: result.id,
      category_id: result.category_id,
      categoryName: result.category.name,
      name: result.name,
      desc: result.desc,
      image: result.image,
      is_available: result.is_available,
      price: result.price,
      stock: result.stock,
      rating: 0, // You might want to calculate this from ratings table
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Stock updated successfully. ${
        action === "add"
          ? "Added"
          : action === "subtract"
          ? "Subtracted"
          : "Set"
      } ${quantity} items.`,
      menu_item: transformedMenuItem,
      stock_change: {
        previous_stock: menuItem.stock,
        new_stock: newStock,
        change: stockChange,
        action,
      },
    });
  } catch (error) {
    console.error("Stock update error:", error);

    // Log error to database if possible
    try {
      const session = await auth();
      const resolvedParams = await params;
      if (session?.user?.id) {
        await prisma.log.create({
          data: {
            user_id: session.user.id,
            action: "stock_error",
            message: `Stock update failed for menu item ${resolvedParams.id}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        });
      }
    } catch (logError) {
      console.error("Failed to log stock error:", logError);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }
}

// GET - Get current stock for a specific menu item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const menuItem = await prisma.menu.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        stock: true,
        is_available: true,
        category: {
          select: { name: true },
        },
      },
    });

    if (!menuItem) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: menuItem.id,
      name: menuItem.name,
      category: menuItem.category.name,
      current_stock: menuItem.stock,
      is_available: menuItem.is_available,
      stock_status:
        menuItem.stock <= 5 ? "low" : menuItem.stock <= 20 ? "medium" : "good",
    });
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock information" },
      { status: 500 }
    );
  }
}
