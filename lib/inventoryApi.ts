import { inventoryItems } from "@/db/schema";

export type InventoryTableRow = typeof inventoryItems.$inferSelect;

export function serializeInventory(row: InventoryTableRow) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    quantity: row.quantity,
    price: typeof row.price === "string" ? row.price : String(row.price),
    description: row.description,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type InventoryUpsertPayload = {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: string;
  description: string | null;
  imageUrl: string | null;
};

export function parseInventoryPayload(value: unknown):
  | { ok: false; message: string }
  | { ok: true; data: InventoryUpsertPayload } {
  if (!value || typeof value !== "object") {
    return { ok: false, message: "Invalid JSON body." };
  }

  const body = value as Record<string, unknown>;

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return { ok: false, message: "Name is required." };
  }

  if (typeof body.sku !== "string" || body.sku.trim().length === 0) {
    return { ok: false, message: "SKU is required." };
  }

  if (typeof body.category !== "string" || body.category.trim().length === 0) {
    return { ok: false, message: "Category is required." };
  }

  if (
    typeof body.quantity !== "number" ||
    !Number.isFinite(body.quantity) ||
    body.quantity < 0 ||
    !Number.isInteger(body.quantity)
  ) {
    return { ok: false, message: "Quantity must be a non‑negative integer." };
  }

  const priceRaw = body.price;
  if (typeof priceRaw !== "number" && typeof priceRaw !== "string") {
    return { ok: false, message: "Price is required." };
  }

  let priceNumeric: number;
  if (typeof priceRaw === "string") {
    priceNumeric = Number.parseFloat(priceRaw);
    if (!Number.isFinite(priceNumeric)) return { ok: false, message: "Price must be a valid decimal number." };
  } else {
    priceNumeric = priceRaw;
    if (!Number.isFinite(priceNumeric)) return { ok: false, message: "Price must be a valid decimal number." };
  }

  if (priceNumeric < 0) {
    return { ok: false, message: "Price cannot be negative." };
  }

  let description: string | null;
  if (body.description === null || typeof body.description === "undefined") {
    description = null;
  } else if (typeof body.description === "string") {
    description = body.description;
  } else {
    return { ok: false, message: "Invalid description payload." };
  }

  let imageUrl: string | null = null;
  if (typeof body.imageUrl === "string" && body.imageUrl.length > 0) imageUrl = body.imageUrl;
  else if (body.imageUrl === null || body.imageUrl === "") imageUrl = null;
  else if (typeof body.imageUrl !== "undefined") {
    return { ok: false, message: "Invalid image URL payload." };
  }

  const data: InventoryUpsertPayload = {
    name: body.name.trim(),
    sku: body.sku.trim(),
    category: body.category.trim(),
    quantity: body.quantity,
    price: priceNumeric.toFixed(2),
    description,
    imageUrl,
  };

  return { ok: true, data };
}

export function detectUniqueViolation(error: unknown): boolean {
  let current: unknown = error;

  for (let i = 0; i < 5 && current; i += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code: unknown }).code === "23505"
    ) {
      return true;
    }

    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause: unknown }).cause
        : null;
  }

  return false;
}
