/** Shared defaults & types for `/api/items` pagination and client consumers. */

export const INVENTORY_PAGE_SIZE_DEFAULT = 25;
export const INVENTORY_PAGE_SIZE_MAXIMUM = 100;

export interface InventoryListPaginationBrief {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface InventoryListStatsBrief {
  totalItems: number;
  lowStockSkuCount: number;
  /** Sum of quantity × unit price across the filtered set (decimal text). */
  totalPortfolioValue: string;
}
