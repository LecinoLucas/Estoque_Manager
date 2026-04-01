import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type StockSummary = {
  critical: number;
  low: number;
  negative: number;
};

type ProductSelectionSummaryProps = {
  canManageProducts: boolean;
  isActionMode: boolean;
  selectedCount: number;
  markSelectedForDeletion: () => void;
  clearSelection: () => void;
  stockSummary: StockSummary;
  includeArchived: boolean;
  archivedCount: number;
};

export function ProductSelectionSummary({
  canManageProducts,
  isActionMode,
  selectedCount,
  markSelectedForDeletion,
  clearSelection,
  stockSummary,
  includeArchived,
  archivedCount,
}: ProductSelectionSummaryProps) {
  return (
    <>
      {canManageProducts && isActionMode && selectedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2">
          <span className="text-sm">
            {selectedCount} produto(s) selecionado(s) para possível exclusão.
          </span>
          <Button variant="destructive" size="sm" onClick={markSelectedForDeletion}>
            Marcar para exclusão
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Limpar seleção
          </Button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="destructive">Crítico (≤1): {stockSummary.critical}</Badge>
        <Badge className="bg-orange-600 hover:bg-orange-600 text-white">Baixo (≤ mín.): {stockSummary.low}</Badge>
        <Badge className="bg-purple-700 hover:bg-purple-700 text-white">Negativo: {stockSummary.negative}</Badge>
        {includeArchived && (
          <Badge variant="secondary">Arquivados: {archivedCount}</Badge>
        )}
      </div>
    </>
  );
}