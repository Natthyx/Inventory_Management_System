import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { detectUniqueViolation, parseInventoryPayload, serializeInventory } from "@/lib/inventoryApi";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Invalid item identifier." }, { status: 400 });
    }

    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = parseInventoryPayload(jsonBody);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }

    const { name, sku, category, quantity, price, description, imageUrl } = parsed.data;

    const existingRows = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
    const existing = existingRows.at(0);
    if (!existing) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const [updatedRow] = await db
      .update(inventoryItems)
      .set({
        name,
        sku,
        category,
        quantity,
        price,
        description,
        imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, id))
      .returning();

    if (!updatedRow) {
      return NextResponse.json({ error: "Update failed unexpectedly." }, { status: 500 });
    }

    const item = serializeInventory(updatedRow);
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[items PUT]", error);
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Failed to update item.";

    if (detectUniqueViolation(error)) {
      return NextResponse.json({ error: "SKU must be unique." }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const [deletedRow] = await db.delete(inventoryItems).where(eq(inventoryItems.id, id)).returning({ id: inventoryItems.id });

    if (!deletedRow) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[items DELETE]", error);
    const message = error instanceof Error ? error.message : "Failed to delete item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
