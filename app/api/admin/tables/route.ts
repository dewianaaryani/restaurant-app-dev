// app/api/tables/route.ts
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/tables - Get all tables
export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(tables);
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}

// POST /api/tables - Create new table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, desc } = body;

    // Validation
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: "Name must be 255 characters or less" },
        { status: 400 }
      );
    }

    const table = await prisma.table.create({
      data: {
        name: name.trim(),
        desc: desc ? desc.trim() : null,
      },
    });

    return NextResponse.json(table, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 }
    );
  }
}
