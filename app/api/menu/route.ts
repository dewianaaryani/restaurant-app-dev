// app/api/menu/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

// Validation schema for menu items (price in IDR)
const menuItemSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters"),
  desc: z.string().optional(),
  price: z.number().int().positive("Price must be a positive integer in IDR"),
  image: z.string().max(255).optional(),
  category_id: z.string().min(1, "Category is required"),
  is_available: z.boolean().default(true),
});

interface MenuWhereInput {
  category_id?: string;
  is_available?: boolean;
  OR?: Array<{
    name?: { contains: string; mode: "insensitive" };
    desc?: { contains: string; mode: "insensitive" };
  }>;
}

// GET - Fetch all menu items with categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");
    const available = searchParams.get("available");

    const where: MenuWhereInput = {};

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { desc: { contains: search, mode: "insensitive" } },
      ];
    }

    if (available !== null) {
      where.is_available = available === "true";
    }

    const menuItems = await prisma.menu.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            desc: true,
          },
        },
        ratings: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: [{ category_id: "asc" }, { name: "asc" }],
    });

    // Transform the data
    const transformedItems = menuItems.map((item) => {
      // Calculate average rating from ratings relationship
      const avgRating =
        item.ratings.length > 0
          ? item.ratings.reduce((sum, r) => sum + r.rating, 0) /
            item.ratings.length
          : 4.5; // Default rating when no ratings exist

      return {
        id: item.id,
        category_id: item.category_id,
        categoryName: item.category.name,
        name: item.name,
        desc: item.desc,
        stock: item.stock,
        price: item.price, // Keep as integer IDR (e.g., 25000 = Rp 25,000)
        image: item.image,
        is_available: item.is_available,
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
      };
    });

    return NextResponse.json(transformedItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new menu item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = menuItemSchema.parse(body);

    // Check if category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: validatedData.category_id },
    });

    if (!categoryExists) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 400 }
      );
    }

    // Check if menu item name already exists in the same category
    const existingItem = await prisma.menu.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: "insensitive",
        },
        category_id: validatedData.category_id,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "Menu item with this name already exists in this category" },
        { status: 400 }
      );
    }

    const menuItem = await prisma.menu.create({
      data: {
        name: validatedData.name,
        desc: validatedData.desc || null,
        price: validatedData.price, // Store as IDR integer
        image: validatedData.image || null,
        category_id: validatedData.category_id,
        is_available: validatedData.is_available,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            desc: true,
          },
        },
      },
    });

    const transformedItem = {
      id: menuItem.id,
      category_id: menuItem.category_id,
      categoryName: menuItem.category.name,
      name: menuItem.name,
      desc: menuItem.desc,
      price: menuItem.price, // Return as IDR integer
      image: menuItem.image,
      is_available: menuItem.is_available,
      //TODO FIX RATINHG
      rating: 4.5, // Default rating for new items
      created_at: menuItem.created_at.toISOString(),
      updated_at: menuItem.updated_at.toISOString(),
    };

    return NextResponse.json(transformedItem, { status: 201 });
  } catch (error) {
    console.error("Error creating menu item:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
