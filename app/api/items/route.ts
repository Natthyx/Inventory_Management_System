import { NextResponse } from "next/server";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { detectUniqueViolation, parseInventoryPayload, serializeInventory } from "@/lib/inventoryApi";
import {
  INVENTORY_PAGE_SIZE_DEFAULT,
  INVENTORY_PAGE_SIZE_MAXIMUM,
  type InventoryListPaginationBrief,
  type InventoryListStatsBrief,
} from "@/lib/inventoryList";
import { CATEGORIES } from "@/lib/types";

const CATEGORY_LOOKUP = new Set<string>(CATEGORIES);

function clampIntegerIncomingQuery(candidate: unknown, fallback: number, lowerBoundInclusive: number, upperBoundInclusive: number) {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return fallback;
  }

  const scannedNumerically = Number.parseInt(candidate.trim(), 10);

  if (!Number.isFinite(scannedNumerically)) {
    return fallback;
  }

  return Math.min(upperBoundInclusive, Math.max(lowerBoundInclusive, scannedNumerically));
}

function synthesizeFilteringWhereClause(filters: {
  trimmedCategorySlug: string;
  searchNeedleLowercase: string;
}): SQL | undefined {
  const combinedPredicatesCollected = [];

  const categoryTrimmed = filters.trimmedCategorySlug.trim();

  if (categoryTrimmed.length > 0 && CATEGORY_LOOKUP.has(categoryTrimmed)) {
    combinedPredicatesCollected.push(eq(inventoryItems.category, categoryTrimmed));
  }

  const searchNeedleCompact = filters.searchNeedleLowercase.trim();

  if (searchNeedleCompact.length > 0) {
    combinedPredicatesCollected.push(
      sql`(POSITION(${searchNeedleCompact} IN LOWER(CAST(${inventoryItems.name} AS text))) > 0 OR POSITION(${searchNeedleCompact} IN LOWER(CAST(${inventoryItems.sku} AS text))) > 0)`,
    );
  }

  if (combinedPredicatesCollected.length === 0) {
    return undefined;
  }

  if (combinedPredicatesCollected.length === 1) {
    return combinedPredicatesCollected[0];
  }

  return and(...combinedPredicatesCollected);
}

export async function GET(request: Request) {
  try {
    const parsedUrlInstance = new URL(request.url);

    const pageInitiallyRequestedRaw = clampIntegerIncomingQuery(parsedUrlInstance.searchParams.get("page"), 1, 1, 999_999);

    const preferredPageStride = clampIntegerIncomingQuery(
      parsedUrlInstance.searchParams.get("pageSize"),
      INVENTORY_PAGE_SIZE_DEFAULT,
      1,
      INVENTORY_PAGE_SIZE_MAXIMUM,
    );

    const categoryFilterDecoded = parsedUrlInstance.searchParams.get("category") ?? "";

    const searchSnippetNeedleDecodedLowercase = (parsedUrlInstance.searchParams.get("q") ?? "").trim().toLowerCase();

    const whereClauseFinalizedUnified = synthesizeFilteringWhereClause({
      trimmedCategorySlug: categoryFilterDecoded,
      searchNeedleLowercase: searchSnippetNeedleDecodedLowercase,
    });

    const aggregatedRollupQueryEngine = db
      .select({
        filteredInclusiveCountDistinct: sql<number>`cast(count(*) as int)`.mapWith(Number),
        inclusiveLowStockAccumulator: sql<number>`
          cast(coalesce(sum(case when ${inventoryItems.quantity} <= 5 then 1 else 0 end), 0) as int)`.mapWith(Number),
        liquidValueRepresentedAsTextBrief: sql<string>`
          cast(
            coalesce(
              sum(${inventoryItems.quantity} * cast(${inventoryItems.price} as numeric)),
              0
            )
            AS text
          )
        `,
      })
      .from(inventoryItems);

    const rollupRowSingletonResolved = (
      await (whereClauseFinalizedUnified
        ? aggregatedRollupQueryEngine.where(whereClauseFinalizedUnified)
        : aggregatedRollupQueryEngine)
    )[0];

    const cumulativeMatchingSkuRowCountInclusive = rollupRowSingletonResolved?.filteredInclusiveCountDistinct ?? 0;

    const totalWholePagesRoundingUpwardInclusive = Math.max(
      1,
      Math.ceil(cumulativeMatchingSkuRowCountInclusive / preferredPageStride),
    );

    const effectivePageChosenAfterClamp = Math.min(pageInitiallyRequestedRaw, totalWholePagesRoundingUpwardInclusive);

    const startingRowOffsetExclusive = Math.max(0, (effectivePageChosenAfterClamp - 1) * preferredPageStride);

    const selectionQueryHydratedHydrateBuilder = db.select().from(inventoryItems);

    const narrowedSelectionHydrateQueryConstructed = (
      whereClauseFinalizedUnified
        ? selectionQueryHydratedHydrateBuilder.where(whereClauseFinalizedUnified)
        : selectionQueryHydratedHydrateBuilder
    )
      .orderBy(desc(inventoryItems.createdAt))
      .limit(preferredPageStride)
      .offset(startingRowOffsetExclusive);

    const materializedHydratedSkuRowsCollected = await narrowedSelectionHydrateQueryConstructed;

    const serializedInventoryHydratedHydratePayloadCollected = materializedHydratedSkuRowsCollected.map(serializeInventory);

    const paginationEnvelopeBrief: InventoryListPaginationBrief = {
      page: effectivePageChosenAfterClamp,
      pageSize: preferredPageStride,
      totalItems: cumulativeMatchingSkuRowCountInclusive,
      totalPages: totalWholePagesRoundingUpwardInclusive,
      hasNextPage: effectivePageChosenAfterClamp < totalWholePagesRoundingUpwardInclusive,
      hasPreviousPage: effectivePageChosenAfterClamp > 1,
    };

    const statisticsRollupHydratedHydrateEnvelope: InventoryListStatsBrief = {
      totalItems: cumulativeMatchingSkuRowCountInclusive,
      lowStockSkuCount: rollupRowSingletonResolved?.inclusiveLowStockAccumulator ?? 0,
      totalPortfolioValue: rollupRowSingletonResolved?.liquidValueRepresentedAsTextBrief ?? "0",
    };

    return NextResponse.json({
      items: serializedInventoryHydratedHydratePayloadCollected,
      pagination: paginationEnvelopeBrief,
      stats: statisticsRollupHydratedHydrateEnvelope,
    });
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
