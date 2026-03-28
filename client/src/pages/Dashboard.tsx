import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, TrendingDown, Activity, FileDown, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

const DashboardCharts = lazy(() => import("@/components/dashboard/DashboardCharts"));

export default function Dashboard() {
  const { user } = useAuth();
  const canViewStockAlerts = user?.role === "admin" || user?.role === "gerente";
  const [showReplenishmentModal, setShowReplenishmentModal] = useState(false);
  const [showEncomendasModal, setShowEncomendasModal] = useState(false);
  const [enableInsights, setEnableInsights] = useState(false);
  
  const queryOptions = { staleTime: 60_000, refetchOnWindowFocus: false };
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, queryOptions);
  const { data: lowStock, isLoading: lowStockLoading } = trpc.products.lowStock.useQuery(undefined, {
    ...queryOptions,
    enabled: canViewStockAlerts,
  });
  const exportQuery = trpc.export.getData.useQuery(undefined, {
    enabled: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Keep stable dates so query keys don't churn on rerenders
  const { startOfMonth, endOfMonth } = useMemo(() => {
    const now = new Date();
    return {
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }, []);

  const { data: topSelling } = trpc.dashboard.topSelling.useQuery({
    startDate: startOfMonth,
    endDate: endOfMonth,
    limit: 5,
  }, queryOptions);
  
  // Get sales data for charts
  const { data: salesByDate } = trpc.dashboard.salesByDate.useQuery(
    {
      startDate: startOfMonth,
      endDate: endOfMonth,
    },
    {
      ...queryOptions,
      enabled: enableInsights,
    },
  );
  
  const { data: salesByCategory } = trpc.dashboard.salesByCategory.useQuery(
    {
      startDate: startOfMonth,
      endDate: endOfMonth,
    },
    {
      ...queryOptions,
      enabled: enableInsights,
    },
  );
  
  const { data: salesByMedida } = trpc.dashboard.salesByMedida.useQuery(
    {
      startDate: startOfMonth,
      endDate: endOfMonth,
    },
    {
      ...queryOptions,
      enabled: enableInsights,
    },
  );
  
  const { data: replenishmentSuggestions } = trpc.dashboard.replenishmentSuggestions.useQuery(undefined, {
    ...queryOptions,
    enabled: showReplenishmentModal && canViewStockAlerts,
  });
  const { data: negativeStockProducts } = trpc.products.negativeStock.useQuery(undefined, {
    ...queryOptions,
    enabled: canViewStockAlerts && showEncomendasModal,
  });
  
  const handleExportPDF = async () => {
    const data = exportQuery.data ?? (await exportQuery.refetch()).data;
    if (!data) {
      toast.error("Dados não disponíveis para exportação");
      return;
    }
    exportToPDF(data);
    toast.success("Relatório PDF exportado com sucesso!");
  };

  const handleExportExcel = async () => {
    const data = exportQuery.data ?? (await exportQuery.refetch()).data;
    if (!data) {
      toast.error("Dados não disponíveis para exportação");
      return;
    }
    exportToExcel(data);
    toast.success("Relatório Excel exportado com sucesso!");
  };

  useEffect(() => {
    if (statsLoading || lowStockLoading || enableInsights) return;
    const timeoutId = window.setTimeout(() => setEnableInsights(true), 300);
    return () => window.clearTimeout(timeoutId);
  }, [statsLoading, lowStockLoading, enableInsights]);

  if (statsLoading || (canViewStockAlerts && lowStockLoading)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Visão geral do seu estoque</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens em Estoque</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Unidades totais</p>
          </CardContent>
        </Card>

        {canViewStockAlerts && (
          <Card 
            className="border-border shadow-sm border-destructive/50 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowReplenishmentModal(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.lowStockCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Clique para ver detalhes</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimentações</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats?.recentMovements || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimas 24 horas</p>
          </CardContent>
        </Card>

        {canViewStockAlerts && (
          <Card 
            className="border-border shadow-sm border-purple-600/50 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowEncomendasModal(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Encomendas</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats?.negativeStockCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Clique para ver detalhes</p>
            </CardContent>
          </Card>
        )}
      </div>

      {topSelling && topSelling.length > 0 && (
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingDown className="h-5 w-5 text-accent" />
              Produtos Mais Vendidos do Mês
            </CardTitle>
            <CardDescription>
              Top 5 produtos com maior saída neste mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSelling.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{product.name}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {product.medida}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {product.categoria}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-accent">
                      {product.quantidadeVendida}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      unidades vendidas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {enableInsights ? (
        <Suspense
          fallback={
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border shadow-md">
                <CardHeader>
                  <CardTitle className="text-foreground">Carregando gráficos...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] rounded-md bg-muted animate-pulse" />
                </CardContent>
              </Card>
            </div>
          }
        >
          <DashboardCharts
            salesByDate={salesByDate}
            salesByCategory={salesByCategory}
            salesByMedida={salesByMedida}
          />
        </Suspense>
      ) : null}

      {/* Modal de Sugestões de Reposição */}
      <Dialog open={showReplenishmentModal} onOpenChange={setShowReplenishmentModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Sugestões de Reposição Automática
            </DialogTitle>
            <DialogDescription>
              Produtos que precisam ser repostos baseado no histórico de vendas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {replenishmentSuggestions && replenishmentSuggestions.length > 0 ? (
              replenishmentSuggestions.map((suggestion) => (
                <div
                  key={suggestion.productId}
                  className="p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-foreground">{suggestion.name}</p>
                        <Badge 
                          variant={suggestion.prioridade === "alta" ? "destructive" : "default"}
                          className={suggestion.prioridade === "media" ? "bg-orange-600" : ""}
                        >
                          {suggestion.prioridade === "alta" ? "Prioridade Alta" : 
                           suggestion.prioridade === "media" ? "Prioridade Média" : "Prioridade Baixa"}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {suggestion.medida}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.categoria}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Estoque atual: </span>
                          <span className="font-medium text-foreground">{suggestion.quantidadeAtual}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Média diária: </span>
                          <span className="font-medium text-foreground">{suggestion.mediaDiaria}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dias restantes: </span>
                          <span className={`font-medium ${
                            suggestion.diasRestantes < 3 ? "text-destructive" :
                            suggestion.diasRestantes < 7 ? "text-orange-600" :
                            "text-foreground"
                          }`}>
                            {suggestion.diasRestantes}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quantidade sugerida: </span>
                          <span className="font-bold text-accent">{suggestion.quantidadeSugerida}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma sugestão de reposição no momento
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Encomendas (Estoque Negativo) */}
      <Dialog open={canViewStockAlerts && showEncomendasModal} onOpenChange={setShowEncomendasModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Produtos Encomendados (Estoque Negativo)
            </DialogTitle>
            <DialogDescription>
              Produtos vendidos que precisam ser repostos urgentemente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {negativeStockProducts && negativeStockProducts.length > 0 ? (
              negativeStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-4 rounded-lg bg-muted/50 border border-destructive/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-2">{product.name}</p>
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {product.medida}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {product.categoria}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {product.marca}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Estoque: </span>
                        <span className="font-bold text-destructive">{product.quantidade}</span>
                        <span className="text-muted-foreground ml-2">
                          (Faltam {Math.abs(product.quantidade)} unidades)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto com estoque negativo
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
