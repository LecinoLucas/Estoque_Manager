import { memo, useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Product } from "./types";

type ProductTableRowProps = {
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

export const ProductTableRow = memo(function ProductTableRow({
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
}: ProductTableRowProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <TableRow>
        {canManageProducts && isActionMode && (
          <TableCell>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(product.id, Boolean(checked))}
              aria-label={`Selecionar produto ${product.name}`}
            />
          </TableCell>
        )}
        <TableCell>
          {product.quantidade < 0 ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-700 hover:bg-purple-700 text-white text-sm px-2.5 py-1">
                {product.quantidade}
              </Badge>
              <span className="text-xs text-purple-700 font-medium">
                {Math.abs(product.quantidade)} encomenda(s)
              </span>
            </div>
          ) : product.quantidade <= 1 ? (
            <Badge variant="destructive" className="text-sm px-2.5 py-1">
              {product.quantidade}
            </Badge>
          ) : product.quantidade <= product.estoqueMinimo ? (
            <Badge className="bg-orange-600 hover:bg-orange-600 text-white text-sm px-2.5 py-1">
              {product.quantidade}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-sm px-2.5 py-1 font-semibold">
              {product.quantidade}
            </Badge>
          )}
        </TableCell>
        <TableCell className="font-medium max-w-[38vw] sm:max-w-[26rem] truncate" title={product.name}>
          {product.name}
        </TableCell>
        <TableCell>
          <span className="text-sm">{product.medida}</span>
        </TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground">{product.marca || "-"}</span>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(true)}>
            Detalhes
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-card text-card-foreground sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>Detalhes completos do produto</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Desarquivar
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onArchive(product)}>
                    <Archive className="h-4 w-4 mr-2" />
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
                  <span className="text-xs text-muted-foreground">
                    Ative "Assumir ação" para excluir
                  </span>
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