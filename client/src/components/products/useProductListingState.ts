import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Product, ProductViewMode } from "./types";

const PRODUCTS_TRASH_STORAGE_KEY = "products-trash-pending-v1";
const PRODUCTS_SORT_RISK_STORAGE_KEY = "products-sort-risk-v1";
const PRODUCTS_VIEW_MODE_STORAGE_KEY = "products-view-mode-v1";

type UseProductListingStateParams = {
  canManageProducts: boolean;
};

export function useProductListingState({
  canManageProducts,
}: UseProductListingStateParams) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isActionMode, setIsActionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingDeletionIds, setPendingDeletionIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_TRASH_STORAGE_KEY);
      if (!raw) return new Set<number>();
      const parsed = JSON.parse(raw) as { ids?: number[] };
      return new Set((parsed.ids ?? []).filter((id) => Number.isFinite(id)));
    } catch {
      return new Set<number>();
    }
  });
  const [pendingDeletionSnapshot, setPendingDeletionSnapshot] = useState<Record<number, Product>>(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_TRASH_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as { snapshot?: Record<number, Product> };
      return parsed.snapshot ?? {};
    } catch {
      return {};
    }
  });
  const [lastDeleteSummary, setLastDeleteSummary] = useState<{ successCount: number; failCount: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterMedida, setFilterMedida] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterMarca, setFilterMarca] = useState("all");
  const [filterSaleStatus, setFilterSaleStatus] = useState<"all" | "active" | "inactive">("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortByStockRisk, setSortByStockRisk] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_SORT_RISK_STORAGE_KEY);
      return raw === "1";
    } catch {
      return false;
    }
  });
  const [viewMode, setViewMode] = useState<ProductViewMode>(() => {
    try {
      return localStorage.getItem(PRODUCTS_VIEW_MODE_STORAGE_KEY) === "cards" ? "cards" : "table";
    } catch {
      return "table";
    }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterMedida, filterCategoria, filterMarca, filterSaleStatus, includeArchived, pageSize]);

  useEffect(() => {
    if (canManageProducts) return;
    setIsActionMode(false);
    setSelectedIds(new Set());
  }, [canManageProducts]);

  useEffect(() => {
    try {
      const payload = {
        ids: Array.from(pendingDeletionIds),
        snapshot: pendingDeletionSnapshot,
      };
      localStorage.setItem(PRODUCTS_TRASH_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore localStorage failures (private mode / storage blocked)
    }
  }, [pendingDeletionIds, pendingDeletionSnapshot]);

  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_SORT_RISK_STORAGE_KEY, sortByStockRisk ? "1" : "0");
    } catch {
      // Ignore localStorage failures (private mode / storage blocked)
    }
  }, [sortByStockRisk]);

  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Ignore localStorage failures (private mode / storage blocked)
    }
  }, [viewMode]);

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, []);

  const queryParams = useMemo(() => ({
    searchTerm: debouncedSearchTerm || undefined,
    medida: filterMedida === "all" ? undefined : filterMedida || undefined,
    categoria: filterCategoria === "all" ? undefined : filterCategoria || undefined,
    marca: filterMarca === "all" ? undefined : filterMarca || undefined,
    includeArchived,
    page: currentPage,
    pageSize,
  }), [debouncedSearchTerm, filterMedida, filterCategoria, filterMarca, includeArchived, currentPage, pageSize]);

  const handleToggleActionMode = useCallback(() => {
    setIsActionMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFilterMedida("all");
    setFilterCategoria("all");
    setFilterMarca("all");
    setFilterSaleStatus("all");
    setIncludeArchived(false);
    setCurrentPage(1);
  }, []);

  const restorePendingDeletion = useCallback((id: number) => {
    setPendingDeletionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setPendingDeletionSnapshot((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const undoPendingDeletions = useCallback(() => {
    if (pendingDeletionIds.size === 0) return;
    setPendingDeletionIds(new Set());
    setPendingDeletionSnapshot({});
    setLastDeleteSummary(null);
    toast.success("Exclusão desfeita. Nenhum produto foi removido.");
  }, [pendingDeletionIds.size]);

  const openDeleteConfirm = useCallback(() => {
    if (pendingDeletionIds.size === 0) {
      toast.warning("Nenhum produto marcado para exclusão.");
      return;
    }
    setIsDeleteConfirmOpen(true);
  }, [pendingDeletionIds.size]);

  return {
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isActionMode,
    handleToggleActionMode,
    selectedIds,
    setSelectedIds,
    pendingDeletionIds,
    setPendingDeletionIds,
    pendingDeletionSnapshot,
    setPendingDeletionSnapshot,
    lastDeleteSummary,
    setLastDeleteSummary,
    searchTerm,
    setSearchTerm,
    filterMedida,
    setFilterMedida,
    filterCategoria,
    setFilterCategoria,
    filterMarca,
    setFilterMarca,
    filterSaleStatus,
    setFilterSaleStatus,
    debouncedSearchTerm,
    includeArchived,
    setIncludeArchived,
    sortByStockRisk,
    setSortByStockRisk,
    viewMode,
    setViewMode,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchInputRef,
    queryParams,
    clearFilters,
    restorePendingDeletion,
    undoPendingDeletions,
    openDeleteConfirm,
  };
}