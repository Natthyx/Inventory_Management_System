export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFormData {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: string;
  description: string;
  imageFile?: File | null;
  imageUrl?: string;
}

export const CATEGORIES = [
  "Electronics",
  "Office Supplies",
  "Furniture",
  "Clothing",
  "Food & Beverage",
  "Other",
] as const;

export type InventoryCategory = (typeof CATEGORIES)[number];
