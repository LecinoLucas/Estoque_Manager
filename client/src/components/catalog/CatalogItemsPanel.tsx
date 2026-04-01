import type { LucideIcon } from "lucide-react";
import { Edit, LayoutGrid, List, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type CatalogViewMode = "cards" | "list";

export type CatalogPanelItem = {
  id: number;
  nome: string;
  subtitle?: string;
  codigo?: string;
  categoria?: string;
  brandId?: number;
  productTypeId?: number;
};

type CatalogItemsPanelProps = {
  icon: LucideIcon;
  title: string;
  count: number;
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: CatalogViewMode;
  onViewModeChange: (mode: CatalogViewMode) => void;
  activeLoading: boolean;
  items: CatalogPanelItem[];
  emptyMessage: string;
  onEdit: (item: CatalogPanelItem) => void;
  onDelete: (item: CatalogPanelItem) => void;
};

export function CatalogItemsPanel({
  icon: Icon,
  title,
  count,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  activeLoading,
  items,
  emptyMessage,
  onEdit,
  onDelete,
}: CatalogItemsPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title} ({count})
        </CardTitle>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          <div className="inline-flex h-9 items-center rounded-lg border bg-muted/30 p-1">
            <Button
              type="button"
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-2 px-3"
              onClick={() => onViewModeChange("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-2 px-3"
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Buscar ${title.toLowerCase()}...`}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeLoading ? (
          <p className="py-8 text-center text-muted-foreground">Carregando...</p>
        ) : items.length > 0 ? (
          viewMode === "cards" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0 pr-2">
                    <span className="block truncate font-medium">{item.nome}</span>
                    {item.subtitle ? (
                      <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{item.subtitle ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}