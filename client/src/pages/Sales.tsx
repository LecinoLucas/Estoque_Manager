import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface SaleItem {
  productId: number;
  productName: string;
  medida: string;
  quantidade: number;
  estoque: number;
}

const VENDEDORES = ["Cleonice", "Luciano", "Vanuza", "Thuanny"];

export default function Sales() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce: só dispara a query após 300ms sem digitar
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [vendedor, setVendedor] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [tipoTransacao, setTipoTransacao] = useState<"venda" | "troca" | "brinde" | "emprestimo" | "permuta">("venda");

  const utils = trpc.useUtils();
  // Busca no backend: envia searchTerm para o servidor que retorna todos os matches sem limite de página
  const { data: products, isLoading } = trpc.products.list.useQuery(
    debouncedSearch
      ? { searchTerm: debouncedSearch, page: 1, pageSize: 100 }
      : undefined,
    { enabled: !!debouncedSearch, placeholderData: (prev) => prev }
  );

  const registrarVendaMutation = trpc.vendas.registrar.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      utils.movimentacoes.list.invalidate();
      setSaleItems([]);
      toast.success("Venda registrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar venda: " + error.message);
    },
  });

  const addItem = () => {
    if (!selectedProductId) {
      toast.error("Selecione um produto");
      return;
    }

    const product = products?.items?.find(p => p.id === parseInt(selectedProductId));
    if (!product) return;

    // Allow negative stock for orders (encomendas)
    // if (product.quantidade < quantidade) {
    //   toast.error(`Estoque insuficiente. Disponível: ${product.quantidade}`);
    //   return;
    // }

    // Check if product already in cart
    const existingItem = saleItems.find(item => item.productId === product.id);
    if (existingItem) {
      // Update quantity
      setSaleItems(saleItems.map(item =>
        item.productId === product.id
          ? { ...item, quantidade: item.quantidade + quantidade }
          : item
      ));
    } else {
      // Add new item
      setSaleItems([...saleItems, {
        productId: product.id,
        productName: product.name,
        medida: product.medida,
        quantidade,
        estoque: product.quantidade,
      }]);
    }

    setSelectedProductId("");
    setQuantidade(1);
  };

  const removeItem = (productId: number) => {
    setSaleItems(saleItems.filter(item => item.productId !== productId));
  };

  const handleSubmit = () => {
    if (saleItems.length === 0) {
      toast.error("Adicione pelo menos um produto à venda");
      return;
    }

    if (!vendedor) {
      toast.error("Selecione o vendedor");
      return;
    }

    registrarVendaMutation.mutate({
      items: saleItems.map(item => ({
        productId: item.productId,
        quantidade: item.quantidade,
      })),
      vendedor,
      nomeCliente: nomeCliente || undefined,
      observacoes: observacoes || undefined,
      tipoTransacao,
    });
    setVendedor("");
    setNomeCliente("");
    setObservacoes("");
  };

  if (isLoading && !products) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Os produtos já vem filtrados do backend
  const filteredProducts = products?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Registrar Vendas</h1>
        <p className="text-muted-foreground mt-2">Registre as vendas do dia e atualize o estoque automaticamente</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Adicionar Produtos</CardTitle>
            <CardDescription>Selecione os produtos vendidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendedor">Vendedor Responsável</Label>
              <Select value={vendedor} onValueChange={setVendedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {VENDEDORES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeCliente">Nome do Cliente (Opcional)</Label>
              <Input
                id="nomeCliente"
                type="text"
                placeholder="Ex: Maria Silva"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoTransacao">Tipo de Transação</Label>
              <Select value={tipoTransacao} onValueChange={(value: any) => setTipoTransacao(value)}>
                <SelectTrigger id="tipoTransacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="troca">Troca</SelectItem>
                  <SelectItem value="brinde">Brinde</SelectItem>
                  <SelectItem value="emprestimo">Empréstimo</SelectItem>
                  <SelectItem value="permuta">Permuta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Buscar e Selecionar Produto</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Digite para buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione da lista filtrada" />
                  </SelectTrigger>
                  <SelectContent>
                    {!searchTerm ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Digite para buscar produto
                      </div>
                    ) : isLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Buscando...
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum produto encontrado para "{searchTerm}"
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} {product.marca && `- ${product.marca}`} ({product.medida}) - Estoque: {product.quantidade}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                  className="h-10 w-10 shrink-0"
                >
                  <span className="text-lg font-bold">-</span>
                </Button>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === '0') {
                      setQuantidade(1);
                    } else {
                      const parsed = parseInt(value);
                      if (!isNaN(parsed) && parsed > 0) {
                        setQuantidade(parsed);
                      }
                    }
                  }}
                  className="text-center text-lg font-semibold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantidade(quantidade + 1)}
                  className="h-10 w-10 shrink-0"
                >
                  <span className="text-lg font-bold">+</span>
                </Button>
              </div>
            </div>

            <Button onClick={addItem} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Adicionar à Venda
            </Button>
          </CardContent>
        </Card>

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
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
                    disabled={registrarVendaMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {registrarVendaMutation.isPending ? "Processando..." : "Confirmar Venda"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
