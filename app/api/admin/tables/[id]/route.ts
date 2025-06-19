import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/tables/[id] - Get single table
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableId = id;
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }
}

// PUT /api/tables/[id] - Update table
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const tableId = id;
    // Check if table exists
    const existingTable = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        name: name.trim(),
        desc: desc ? desc.trim() : null,
      },
    });

    return NextResponse.json(table);
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { error: "Failed to update table" },
      { status: 500 }
    );
  }
}

// DELETE /api/tables/[id] - Delete table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableId = id;
    // Check if table exists
    const existingTable = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    await prisma.table.delete({
      where: { id: tableId },
    });

    return NextResponse.json(
      { message: "Table deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
}
