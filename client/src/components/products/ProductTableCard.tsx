import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductGridItem } from "./ProductGridItem";
import { ProductTableRow } from "./ProductTableRow";
import type { Product, ProductViewMode } from "./types";

type ProductTableCardProps = {
  header: ReactNode;
  summary: ReactNode;
  canManageProducts: boolean;
  isActionMode: boolean;
  viewMode: ProductViewMode;
  allVisibleSelected: boolean;
  toggleSelectAllVisible: (checked: boolean) => void;
  visibleItems: Product[];
  sortedVisibleItems: Product[];
  selectedIds: Set<number>;
  toggleSelectProduct: (id: number, checked: boolean) => void;
  handleEdit: (product: Product) => void;
  markSingleForDeletion: (id: number) => void;
  handleToggleSaleStatus: (product: Product) => void;
  handleArchive: (product: Product) => void;
  handleUnarchive: (product: Product) => void;
  togglingProductId: number | null;
  toggleSaleStatusPending: boolean;
  pendingDeletionCount: number;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  totalProducts: number;
};

export function ProductTableCard({
  header,
  summary,
  canManageProducts,
  isActionMode,
  viewMode,
  allVisibleSelected,
  toggleSelectAllVisible,
  visibleItems,
  sortedVisibleItems,
  selectedIds,
  toggleSelectProduct,
  handleEdit,
  markSingleForDeletion,
  handleToggleSaleStatus,
  handleArchive,
  handleUnarchive,
  togglingProductId,
  toggleSaleStatusPending,
  pendingDeletionCount,
  currentPage,
  setCurrentPage,
  pageSize,
  totalProducts,
}: ProductTableCardProps) {
  const totalPages = Math.ceil(totalProducts / pageSize);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>{header}</CardHeader>
      <CardContent>
        {summary}
        {viewMode === "table" ? (
          <div className="max-h-[68vh] overflow-auto rounded-md border touch-pan-y">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  {canManageProducts && isActionMode && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => toggleSelectAllVisible(Boolean(checked))}
                        aria-label="Selecionar todos os produtos visíveis"
                      />
                    </TableHead>
                  )}
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Medida</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.length > 0 ? (
                  sortedVisibleItems.map((product) => (
                    <ProductTableRow
                      key={product.id}
                      product={product}
                      canManageProducts={canManageProducts}
                      isActionMode={isActionMode}
                      isSelected={selectedIds.has(product.id)}
                      onSelect={toggleSelectProduct}
                      onEdit={handleEdit}
                      onDelete={markSingleForDeletion}
                      onToggleSaleStatus={handleToggleSaleStatus}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                      toggleLoading={togglingProductId === product.id && toggleSaleStatusPending}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canManageProducts && isActionMode ? 6 : 5} className="py-8 text-center text-muted-foreground">
                      {pendingDeletionCount > 0
                        ? "Todos os produtos desta página estão na Lixeira Temporária."
                        : "Nenhum produto encontrado"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : visibleItems.length > 0 ? (
          <div className="space-y-4">
            {canManageProducts && isActionMode && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span>Selecione produtos diretamente nos cards.</span>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => toggleSelectAllVisible(Boolean(checked))}
                    aria-label="Selecionar todos os produtos visíveis"
                  />
                  <span>Selecionar todos visíveis</span>
                </label>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sortedVisibleItems.map((product) => (
                <ProductGridItem
                  key={product.id}
                  product={product}
                  canManageProducts={canManageProducts}
                  isActionMode={isActionMode}
                  isSelected={selectedIds.has(product.id)}
                  onSelect={toggleSelectProduct}
                  onEdit={handleEdit}
                  onDelete={markSingleForDeletion}
                  onToggleSaleStatus={handleToggleSaleStatus}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  toggleLoading={togglingProductId === product.id && toggleSaleStatusPending}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border py-8 text-center text-muted-foreground">
            {pendingDeletionCount > 0
              ? "Todos os produtos desta página estão na Lixeira Temporária."
              : "Nenhum produto encontrado"}
          </div>
        )}

        {totalProducts > pageSize && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalProducts)} de {totalProducts} produtos
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm font-medium px-2">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}