import type { Dispatch, RefObject, SetStateAction } from "react";
import { Archive, Eye, EyeOff, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CatalogItem = {
  id: number;
  nome: string;
};

type SaleStatusCounts = {
  active: number;
  inactive: number;
  archived: number;
};

type ProductFiltersPanelProps = {
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  filterMedida: string;
  setFilterMedida: Dispatch<SetStateAction<string>>;
  filterCategoria: string;
  setFilterCategoria: Dispatch<SetStateAction<string>>;
  filterMarca: string;
  setFilterMarca: Dispatch<SetStateAction<string>>;
  medidasCatalogo: string[];
  tiposCatalogo: string[];
  marcasDb?: CatalogItem[];
  filterSaleStatus: "all" | "active" | "inactive";
  setFilterSaleStatus: Dispatch<SetStateAction<"all" | "active" | "inactive">>;
  includeArchived: boolean;
  setIncludeArchived: Dispatch<SetStateAction<boolean>>;
  clearFilters: () => void;
  saleStatusCounts: SaleStatusCounts;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
};

export function ProductFiltersPanel({
  searchInputRef,
  searchTerm,
  setSearchTerm,
  filterMedida,
  setFilterMedida,
  filterCategoria,
  setFilterCategoria,
  filterMarca,
  setFilterMarca,
  medidasCatalogo,
  tiposCatalogo,
  marcasDb,
  filterSaleStatus,
  setFilterSaleStatus,
  includeArchived,
  setIncludeArchived,
  clearFilters,
  saleStatusCounts,
  pageSize,
  setPageSize,
}: ProductFiltersPanelProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>Busque e filtre produtos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar por nome</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                id="search"
                placeholder="Digite o nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (!["Tab", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
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
                {medidasCatalogo.map((m) => (
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
                {tiposCatalogo.map((c) => (
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
        <div className="mt-4 space-y-2">
          <Label>Visualização de status</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filterSaleStatus === "all" ? "default" : "outline"}
              size="sm"
              className="min-h-10"
              onClick={() => setFilterSaleStatus("all")}
            >
              Todos ({saleStatusCounts.active + saleStatusCounts.inactive})
            </Button>
            <Button
              variant={filterSaleStatus === "active" ? "default" : "outline"}
              size="sm"
              className="gap-2 min-h-10"
              onClick={() => setFilterSaleStatus("active")}
            >
              <Eye className="h-4 w-4" />
              Ativos ({saleStatusCounts.active})
            </Button>
            <Button
              variant={filterSaleStatus === "inactive" ? "default" : "outline"}
              size="sm"
              className="gap-2 min-h-10"
              onClick={() => setFilterSaleStatus("inactive")}
            >
              <EyeOff className="h-4 w-4" />
              Inativos ({saleStatusCounts.inactive})
            </Button>
            <Button
              variant={includeArchived ? "default" : "outline"}
              size="sm"
              className="gap-2 min-h-10"
              onClick={() => setIncludeArchived((prev) => !prev)}
            >
              <Archive className="h-4 w-4" />
              {includeArchived ? "Ocultar arquivados" : "Mostrar arquivados"} ({saleStatusCounts.archived})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 min-h-10"
              onClick={clearFilters}
            >
              <RotateCcw className="h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="pageSize">Itens por página</Label>
          <div className="max-w-[220px]">
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger id="pageSize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}