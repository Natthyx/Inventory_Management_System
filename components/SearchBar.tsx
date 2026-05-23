'use client';

import { CATEGORIES } from "@/lib/types";

interface SearchBarProps {
  searchQuery: string;
  categoryFilter: string;
  onSearchQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export function SearchBar({ searchQuery, categoryFilter, onSearchQueryChange, onCategoryChange }: SearchBarProps) {
  return (
    <div className="card flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
      <label className="flex w-full flex-1 flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
        Search inventory
        <input
          className="input-field"
          value={searchQuery}
          placeholder="Find by name or SKU…"
          onChange={(event) => onSearchQueryChange(event.target.value)}
          aria-label="Search inventory by name or SKU"
        />
      </label>

      <label className="flex w-full flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-gray-700 lg:w-72">
        Category
        <select
          value={categoryFilter}
          aria-label="Filter by category"
          className="input-field"
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
