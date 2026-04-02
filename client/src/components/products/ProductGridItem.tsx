import { memo, useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "./types";

type ProductGridItemProps = {
  product: Product;
  canManageProducts: boolean;
  isActionMode: boolean;
  isSelected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onToggleSaleStatus: (product: Product) => void;
  onArchive: (product: Product) => void;
  onUnarchive: (product: Product) => void;
  toggleLoading: boolean;
};

function QuantityBadge({ product }: { product: Product }) {
  if (product.quantidade < 0) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="px-2.5 py-1 text-sm bg-white text-foreground hover:bg-white">
          <span className="font-semibold text-purple-700">{product.quantidade}</span>
        </Badge>
        <span className="text-xs font-medium text-purple-800">
          {Math.abs(product.quantidade)} encomenda(s)
        </span>
      </div>
    );
  }
  if (product.quantidade <= 1) {
    return (
      <Badge variant="outline" className="px-2.5 py-1 text-sm bg-white text-foreground hover:bg-white">
        <span className="font-semibold text-red-700">{product.quantidade}</span>
      </Badge>
    );
  }
  if (product.quantidade <= product.estoqueMinimo) {
    return (
      <Badge variant="outline" className="px-2.5 py-1 text-sm bg-white text-foreground hover:bg-white">
        <span className="font-semibold text-orange-700">{product.quantidade}</span>
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="px-2.5 py-1 text-sm bg-white text-foreground hover:bg-white">
      <span className="font-semibold text-slate-700">{product.quantidade}</span>
    </Badge>
  );
}

export const ProductGridItem = memo(function ProductGridItem({
  product,
  canManageProducts,
  isActionMode,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleSaleStatus,
  onArchive,
  onUnarchive,
  toggleLoading,
}: ProductGridItemProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <Card className="border-border shadow-sm transition-colors hover:bg-accent/20">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="truncate text-sm font-semibold" title={product.name}>{product.name}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{product.medida}</span>
                <span>{product.categoria}</span>
                <span>{product.marca || "Sem marca"}</span>
              </div>
            </div>
            {canManageProducts && isActionMode ? (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(product.id, Boolean(checked))}
                aria-label={`Selecionar produto ${product.name}`}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <QuantityBadge product={product} />
            <Badge variant={product.arquivado ? "secondary" : product.ativoParaVenda ? "default" : "outline"}>
              {product.arquivado ? "Arquivado" : product.ativoParaVenda ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(true)}>
              Detalhes
            </Button>
            {canManageProducts && isActionMode ? (
              <Button variant="destructive" size="sm" onClick={() => onDelete(product.id)}>
                Excluir
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-card text-card-foreground sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>Detalhes completos do produto</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Marca:</span> {product.marca || "-"}</div>
            <div><span className="text-muted-foreground">Medida:</span> {product.medida}</div>
            <div><span className="text-muted-foreground">Categoria:</span> {product.categoria}</div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              {product.arquivado ? "Arquivado" : product.ativoParaVenda ? "Ativo" : "Inativo"}
            </div>
            <div><span className="text-muted-foreground">Quantidade:</span> {product.quantidade}</div>
            <div><span className="text-muted-foreground">Estoque mínimo:</span> {product.estoqueMinimo}</div>
            {!product.ativoParaVenda && !product.arquivado && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Motivo da inativação:</span>{" "}
                {product.motivoInativacao || "Sem motivo informado"}
              </div>
            )}
            {product.arquivado && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Motivo do arquivamento:</span>{" "}
                {product.motivoArquivamento || "Sem motivo informado"}
              </div>
            )}
          </div>
          <DialogFooter>
            {canManageProducts && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onToggleSaleStatus(product)}
                  disabled={toggleLoading || product.arquivado}
                  title={product.ativoParaVenda ? "Inativar para novas vendas" : "Ativar para novas vendas"}
                >
                  {product.ativoParaVenda ? "Inativar venda" : "Ativar venda"}
                </Button>
                {product.arquivado ? (
                  <Button variant="outline" onClick={() => onUnarchive(product)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Desarquivar
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onArchive(product)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar catálogo
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    onEdit(product);
                  }}
                >
                  Editar
                </Button>
                {isActionMode ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      onDelete(product.id);
                    }}
                  >
                    Excluir
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Ative "Assumir ação" para excluir</span>
                )}
              </>
            )}
            <Button variant="secondary" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
