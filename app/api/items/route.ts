import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { detectUniqueViolation, parseInventoryPayload, serializeInventory } from "@/lib/inventoryApi";

export async function GET() {
  try {
    const rows = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
    const items = rows.map(serializeInventory);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[items GET]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch items.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const [insertedRow] = await db
      .insert(inventoryItems)
      .values({
        name,
        sku,
        category,
        quantity,
        price,
        description,
        imageUrl,
      })
      .returning();

    const item = serializeInventory(insertedRow);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[items POST]", error);
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Failed to create item.";

    if (detectUniqueViolation(error)) {
      return NextResponse.json({ error: "SKU must be unique." }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
