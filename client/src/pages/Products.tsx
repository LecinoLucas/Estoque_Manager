import { trpc } from "@/lib/trpc";
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, AlertTriangle, FileDown } from "lucide-react";
import { downloadFileFromUrl } from "@/lib/download";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const ProductFormDialog = lazy(() => import("@/components/products/ProductFormDialog"));
const preloadProductFormDialog = () => import("@/components/products/ProductFormDialog");

type Product = {
  id: number;
  name: string;
  marca: string | null;
  medida: string;
  categoria: string;
  quantidade: number;
  estoqueMinimo: number;
};

type ProductFormData = {
  name: string;
  marca: string;
  medida: string;
  categoria: string;
  quantidade: number;
  estoqueMinimo: number;
};

const MEDIDAS = [
  "Solteiro",
  "Solteirão",
  "Casal",
  "Queen",
  "King",
  "Super King",
  "50x70",
  "45x65",
  "70x130",
  "70x150",
  "60x130",
  "30x50",
  "Medida Especial"
];
const CATEGORIAS = [
  "Colchões",
  "Roupas de Cama",
  "Pillow Top",
  "Travesseiros",
  "Cabeceiras",
  "Box Baú",
  "Box Premium",
  "Box Tradicional",
  "Acessórios",
  "Bicamas",
  "Camas"
];

export default function Products() {
  const { user } = useAuth();
  const canManageProducts = user?.role === "admin" || user?.role === "gerente";
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterMedida, setFilterMedida] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterMarca, setFilterMarca] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  // Debounce search term to prevent excessive queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterMedida, filterCategoria, filterMarca]);

  useEffect(() => {
    if (!canManageProducts) return;
    const timeoutId = window.setTimeout(() => {
      void preloadProductFormDialog();
    }, 900);
    return () => window.clearTimeout(timeoutId);
  }, [canManageProducts]);

  // Memoize query params to prevent infinite re-renders
  const queryParams = useMemo(() => ({
    searchTerm: debouncedSearchTerm || undefined,
    medida: filterMedida === "all" ? undefined : filterMedida || undefined,
    categoria: filterCategoria === "all" ? undefined : filterCategoria || undefined,
    marca: filterMarca === "all" ? undefined : filterMarca || undefined,
    page: currentPage,
    pageSize: PAGE_SIZE,
  }), [debouncedSearchTerm, filterMedida, filterCategoria, filterMarca, currentPage]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    marca: "",
    medida: "",
    categoria: "",
    quantidade: 0,
    estoqueMinimo: 1,
  });

  const utils = trpc.useUtils();
  const { data: products, isLoading, isFetching } = trpc.products.list.useQuery(queryParams, {
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: marcasDb } = trpc.marcas.list.useQuery(undefined, {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      setIsCreateOpen(false);
      resetForm();
      toast.success("Produto criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      setIsEditOpen(false);
      setEditingProduct(null);
      toast.success("Produto atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.products.lowStock.invalidate();
      setDeleteId(null);
      toast.success("Produto excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir produto: " + error.message);
    },
  });

  const exportPDFMutation = trpc.products.exportPDF.useMutation({
    onSuccess: async (data) => {
      try {
        await downloadFileFromUrl(data.url, {
          fileName: `produtos-${Date.now()}.pdf`,
        });
        toast.success("PDF baixado com sucesso!");
      } catch (error) {
        toast.error("Erro ao baixar PDF");
        // Fallback: abrir em nova aba
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar PDF");
    },
  });

  const handleExportPDF = () => {
    exportPDFMutation.mutate({ 
      search: debouncedSearchTerm,
      medida: filterMedida === 'all' ? undefined : filterMedida,
      categoria: filterCategoria === 'all' ? undefined : filterCategoria,
      marca: filterMarca === 'all' ? undefined : filterMarca
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      marca: "",
      medida: "",
      categoria: "",
      quantidade: 0,
      estoqueMinimo: 1,
    });
  };

  const handleCreate = useCallback(() => {
    if (!formData.name || !formData.medida || !formData.categoria) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate(formData as never);
  }, [createMutation, formData]);

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      marca: product.marca || "",
      medida: product.medida,
      categoria: product.categoria,
      quantidade: product.quantidade,
      estoqueMinimo: product.estoqueMinimo,
    });
    setIsEditOpen(true);
  }, []);

  const handleUpdate = useCallback(() => {
    if (!editingProduct) return;
    updateMutation.mutate({
      id: editingProduct.id,
      ...formData,
    } as never);
  }, [editingProduct, formData, updateMutation]);

  const handleDelete = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  }, [deleteId, deleteMutation]);

  if (isLoading && !products) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-2">
            {canManageProducts ? "Gerencie seu catálogo de produtos" : "Visualize o catálogo de produtos (somente leitura)"}
          </p>
        </div>
        {canManageProducts && (
          <Button
            className="gap-2"
            onMouseEnter={() => {
              void preloadProductFormDialog();
            }}
            onFocus={() => {
              void preloadProductFormDialog();
            }}
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        )}
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busque e filtre produtos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por nome</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Digite o nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    // Prevent default behavior for all keys except navigation keys
                    if (!['Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                      e.stopPropagation();
                    }
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterMedida">Filtrar por medida</Label>
              <Select value={filterMedida} onValueChange={setFilterMedida}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {MEDIDAS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterCategoria">Filtrar por categoria</Label>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterMarca">Filtrar por marca</Label>
              <Select value={filterMarca} onValueChange={setFilterMarca}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {marcasDb?.map((marca) => (
                    <SelectItem key={marca.id} value={marca.nome}>{marca.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Lista de Produtos
                {isFetching && (
                  <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </CardTitle>
              <CardDescription>
                {products?.total || 0} produto(s) encontrado(s)
              </CardDescription>
            </div>
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={exportPDFMutation.isPending}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {exportPDFMutation.isPending ? "Gerando..." : "Exportar PDF"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Medida</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Quantidade</TableHead>
                {canManageProducts && <TableHead>Estoque Mín.</TableHead>}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.items && products.items.length > 0 ? (
                products.items.map((product) => (
                  <ProductTableRow
                    key={product.id}
                    product={product}
                    canManageProducts={canManageProducts}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canManageProducts ? 8 : 7} className="text-center text-muted-foreground py-8">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {products && products.total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, products.total)} de {products.total} produtos
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm font-medium px-2">
                  Página {currentPage} de {Math.ceil(products.total / PAGE_SIZE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(products.total / PAGE_SIZE), p + 1))}
                  disabled={currentPage >= Math.ceil(products.total / PAGE_SIZE)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Suspense fallback={null}>
        <ProductFormDialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}
          title="Criar Novo Produto"
          description="Adicione um novo produto ao estoque"
          submitLabel="Criar Produto"
          isSubmitting={createMutation.isPending}
          formData={formData}
          setFormData={setFormData}
          medidas={MEDIDAS}
          categorias={CATEGORIAS}
          marcas={marcasDb}
          inputIdPrefix="create-product"
          onSubmit={handleCreate}
          onCancel={() => {
            setIsCreateOpen(false);
            resetForm();
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ProductFormDialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingProduct(null);
          }}
          title="Editar Produto"
          description="Atualize as informações do produto"
          submitLabel="Salvar Alterações"
          isSubmitting={updateMutation.isPending}
          formData={formData}
          setFormData={setFormData}
          medidas={MEDIDAS}
          categorias={CATEGORIAS}
          marcas={marcasDb}
          inputIdPrefix="edit-product"
          onSubmit={handleUpdate}
          onCancel={() => {
            setIsEditOpen(false);
            setEditingProduct(null);
          }}
        />
      </Suspense>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type ProductTableRowProps = {
  product: Product;
  canManageProducts: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
};

const ProductTableRow = memo(function ProductTableRow({ product, canManageProducts, onEdit, onDelete }: ProductTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{product.marca || "-"}</span>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{product.medida}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{product.categoria}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className={`font-semibold ${
              product.quantidade < 0
                ? "text-purple-600"
                : product.quantidade <= 1
                  ? "text-destructive"
                  : product.quantidade <= product.estoqueMinimo
                    ? "text-orange-500"
                    : "text-foreground"
            }`}
          >
            {product.quantidade}
          </span>
          {product.quantidade < 0 && (
            <Badge variant="destructive" className="text-xs bg-purple-600">
              {Math.abs(product.quantidade)} encomendadas
            </Badge>
          )}
          {canManageProducts && product.quantidade >= 0 && product.quantidade <= product.estoqueMinimo && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </TableCell>
      {canManageProducts && <TableCell>{product.estoqueMinimo}</TableCell>}
      <TableCell className="text-right">
        {canManageProducts ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(product.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Somente leitura</span>
        )}
      </TableCell>
    </TableRow>
  );
});
