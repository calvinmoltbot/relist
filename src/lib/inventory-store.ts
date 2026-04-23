import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface InventoryItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  condition: string | null;
  size: string | null;
  costPrice: string | null;
  listedPrice: string | null;
  soldPrice: string | null;
  status: string;
  platform: string | null;
  photoUrls: string[] | null;
  thumbnailUrl: string | null;
  description: string | null;
  sourceType: string | null;
  sourceLocation: string | null;
  vintedUrl: string | null;
  listedAt: string | null;
  soldAt: string | null;
  shippedAt: string | null;
  lastEditedAt?: string | null;
  relistCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
  completenessScore?: number;
  completenessBand?: "green" | "amber" | "red";
  completenessGap?: string | null;
}

export interface NewInventoryItem {
  name: string;
  brand?: string;
  category?: string;
  condition?: string;
  size?: string;
  costPrice?: string;
  listedPrice?: string;
  description?: string;
  sourceType?: string;
  sourceLocation?: string;
  photoUrls?: string[];
}

export type ItemStatus = "all" | "sourced" | "listed" | "sold" | "shipped";
export type SortBy = "date" | "price" | "brand";

export interface InventoryFilters {
  status: ItemStatus;
  search: string;
  sortBy: SortBy;
  incompleteOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  hydrated: boolean;
  filters: InventoryFilters;
  fetchItems: () => Promise<void>;
  addItem: (item: NewInventoryItem) => Promise<void>;
  updateItem: (id: string, data: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setFilters: (filters: Partial<InventoryFilters>) => void;
  hydrate: (items: InventoryItem[]) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  hydrated: false,
  filters: {
    status: "all",
    search: "",
    sortBy: "date",
  },

  hydrate: (items) => {
    set({ items, hydrated: true, loading: false });
  },

  fetchItems: async () => {
    set({ loading: true });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.sortBy) params.set("sort", filters.sortBy);
      if (filters.incompleteOnly) params.set("incompleteOnly", "1");

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      set({ items: data.items, loading: false });
    } catch (err) {
      console.error("Failed to fetch items:", err);
      set({ loading: false });
    }
  },

  addItem: async (item) => {
    // Optimistic: create a temp item
    const tempId = `temp-${Date.now()}`;
    const optimistic: InventoryItem = {
      id: tempId,
      name: item.name,
      brand: item.brand ?? null,
      category: item.category ?? null,
      condition: item.condition ?? null,
      size: item.size ?? null,
      costPrice: item.costPrice ?? null,
      listedPrice: item.listedPrice ?? null,
      soldPrice: null,
      status: "sourced",
      platform: "vinted",
      photoUrls: item.photoUrls ?? null,
      thumbnailUrl: null,
      description: item.description ?? null,
      sourceType: item.sourceType ?? null,
      sourceLocation: item.sourceLocation ?? null,
      vintedUrl: null,
      listedAt: null,
      soldAt: null,
      shippedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ items: [optimistic, ...s.items] }));

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      // Replace optimistic with real
      set((s) => ({
        items: s.items.map((i) => (i.id === tempId ? data.item : i)),
      }));
    } catch {
      // Rollback
      set((s) => ({ items: s.items.filter((i) => i.id !== tempId) }));
    }
  },

  updateItem: async (id, data) => {
    // Optimistic
    const prev = get().items;
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }));

    try {
      await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      set({ items: prev });
    }
  },

  deleteItem: async (id) => {
    const prev = get().items;
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));

    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    } catch (err) {
      console.error("Failed to delete item:", err);
      set({ items: prev });
    }
  },

  setFilters: (partial) => {
    set((s) => ({ filters: { ...s.filters, ...partial } }));
  },
}));
