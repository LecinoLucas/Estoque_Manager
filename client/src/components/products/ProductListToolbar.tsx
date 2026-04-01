import type { Dispatch, SetStateAction } from "react";
import { FileDown, LayoutGrid, List, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import type { ProductViewMode } from "./types";

type ProductListToolbarProps = {
  isFetching: boolean;
  visibleCount: number;
  totalCount: number;
  canManageProducts: boolean;
  isActionMode: boolean;
  handleToggleActionMode: () => void;
  sortByStockRisk: boolean;
  setSortByStockRisk: (updater: (prev: boolean) => boolean) => void;
  viewMode: ProductViewMode;
  setViewMode: Dispatch<SetStateAction<ProductViewMode>>;
  pendingDeletionCount: number;
  undoPendingDeletions: () => void;
  openDeleteConfirm: () => void;
  isAdmin: boolean;
  handleExportPDF: () => void;
  exportPending: boolean;
};

export function ProductListToolbar({
  isFetching,
  visibleCount,
  totalCount,
  canManageProducts,
  isActionMode,
  handleToggleActionMode,
  sortByStockRisk,
  setSortByStockRisk,
  viewMode,
  setViewMode,
  pendingDeletionCount,
  undoPendingDeletions,
  openDeleteConfirm,
  isAdmin,
  handleExportPDF,
  exportPending,
}: ProductListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <CardTitle className="flex items-center gap-2">
          Lista de Produtos
          {isFetching && (
            <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </CardTitle>
        <CardDescription>
          {visibleCount} exibido(s) de {totalCount} encontrado(s)
        </CardDescription>
      </div>
      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        {canManageProducts && (
          <Button
            variant={isActionMode ? "default" : "outline"}
            className="min-h-10"
            onClick={handleToggleActionMode}
          >
            {isActionMode ? "Encerrar ação" : "Assumir ação"}
          </Button>
        )}
        <Button
          variant={sortByStockRisk ? "default" : "outline"}
          className="min-h-10"
          onClick={() => setSortByStockRisk((prev) => !prev)}
          title="Ordenar por risco de estoque"
        >
          {sortByStockRisk ? "Risco: ON" : "Risco: OFF"}
        </Button>
        <div className="inline-flex h-10 items-center rounded-lg border bg-muted/30 p-1">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-2 px-3"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
            Tabela
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-2 px-3"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </Button>
        </div>
        {canManageProducts && isActionMode && pendingDeletionCount > 0 && (
          <>
            <Badge variant="destructive">{pendingDeletionCount} marcado(s)</Badge>
            <Button variant="outline" onClick={undoPendingDeletions}>
              <Undo2 className="h-4 w-4 mr-2" />
              Desfazer marcações
            </Button>
            <Button variant="destructive" onClick={openDeleteConfirm}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir definitivamente
            </Button>
          </>
        )}
        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={exportPending}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {exportPending ? "Gerando..." : "Exportar PDF"}
          </Button>
        )}
      </div>
    </div>
  );
}