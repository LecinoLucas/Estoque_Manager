import type { Dispatch, SetStateAction } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SaleItem = {
  productId: number;
  productName: string;
  medida: string;
  quantidade: number;
  estoque: number;
};

type SalesCartCardProps = {
  saleItems: SaleItem[];
  totalItems: number;
  totalUnits: number;
  lowStockItemsCount: number;
  updateSaleItemQuantity: (productId: number, nextQuantity: number) => void;
  removeItem: (productId: number) => void;
  observacoes: string;
  setObservacoes: Dispatch<SetStateAction<string>>;
  handleSubmit: () => void;
  submitPending: boolean;
  vendedor: string;
  clearSaleItems: () => void;
};

export function SalesCartCard({
  saleItems,
  totalItems,
  totalUnits,
  lowStockItemsCount,
  updateSaleItemQuantity,
  removeItem,
  observacoes,
  setObservacoes,
  handleSubmit,
  submitPending,
  vendedor,
  clearSaleItems,
}: SalesCartCardProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Itens da Venda
        </CardTitle>
        <CardDescription>
          {saleItems.length} item(ns) adicionado(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border bg-muted/20 p-2">
            <div className="text-xs text-muted-foreground">Produtos no carrinho</div>
            <div className="text-lg font-semibold">{totalItems}</div>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <div className="text-xs text-muted-foreground">Unidades totais</div>
            <div className="text-lg font-semibold">{totalUnits}</div>
          </div>
          <div className="rounded-md border bg-muted/20 p-2">
            <div className="text-xs text-muted-foreground">Alertas de estoque</div>
            <div className="text-lg font-semibold">{lowStockItemsCount}</div>
          </div>
        </div>

        {lowStockItemsCount > 0 ? (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Há itens acima do estoque disponível no carrinho.
          </div>
        ) : null}

        {saleItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum item adicionado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {saleItems.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div className="space-y-1 flex-1">
                  <p className="font-medium text-foreground">{item.productName}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.medida}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Qtd: {item.quantidade}
                    </Badge>
                    <Badge
                      variant={item.quantidade > item.estoque ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      Estoque: {item.estoque}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateSaleItemQuantity(item.productId, item.quantidade - 1)}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      updateSaleItemQuantity(item.productId, Number.isNaN(parsed) ? 1 : parsed);
                    }}
                    className="h-8 w-16 text-center text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateSaleItemQuantity(item.productId, item.quantidade + 1)}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (Opcional)</Label>
                <Input
                  id="observacoes"
                  type="text"
                  placeholder="Ex: Cor, especificações, nome do cliente, número do pedido..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use este campo para registrar detalhes importantes, especialmente para produtos sem estoque
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitPending || !vendedor || saleItems.length === 0}
                className="w-full"
                size="lg"
              >
                {submitPending ? "Processando..." : "Confirmar Venda"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearSaleItems}
                disabled={saleItems.length === 0 || submitPending}
                className="w-full"
              >
                Limpar Carrinho
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}