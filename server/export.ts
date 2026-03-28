import * as db from "./db";

export interface ExportData {
  products: Array<{
    name: string;
    medida: string;
    categoria: string;
    quantidade: number;
    estoqueMinimo: number;
  }>;
  stats: {
    totalProducts: number;
    totalItems: number;
    lowStockCount: number;
  };
  exportDate: string;
}

export async function getExportData(): Promise<ExportData> {
  const productsResult = await db.getAllProducts();
  const stats = await db.getDashboardStats();
  
  return {
    products: productsResult.items.map(p => ({
      name: p.name,
      medida: p.medida,
      categoria: p.categoria,
      quantidade: p.quantidade,
      estoqueMinimo: p.estoqueMinimo,
    })),
    stats: {
      totalProducts: stats.totalProducts,
      totalItems: stats.totalItems,
      lowStockCount: stats.lowStockCount,
    },
    exportDate: new Date().toISOString(),
  };
}
