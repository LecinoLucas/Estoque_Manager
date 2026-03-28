import * as db from "../db";
import { managerOrAdminProcedure, router, withRateLimit } from "../_core/trpc";

export const exportRouter = router({
  getData: managerOrAdminProcedure
    .use(withRateLimit({ scope: "export.get_data", max: 30, windowMs: 60 * 1000 }))
    .query(async () => {
    const allProductsResult = await db.getAllProducts();
    const stats = await db.getDashboardStats();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const topSelling = await db.getTopSellingProducts(startOfMonth, endOfMonth, 10);

    return {
      products: allProductsResult.items.map((p) => ({
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
      topSelling: topSelling.map((t) => ({
        name: t.name,
        medida: t.medida,
        categoria: t.categoria,
        quantidadeVendida: t.quantidadeVendida,
      })),
      exportDate: new Date().toISOString(),
    };
    }),
});
