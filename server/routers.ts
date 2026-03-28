import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/authRouter";
import { dashboardRouter } from "./routers/dashboardRouter";
import { encomendasRouter } from "./routers/encomendasRouter";
import { exportRouter } from "./routers/exportRouter";
import { marcasRouter } from "./routers/marcasRouter";
import { movimentacoesRouter } from "./routers/movimentacoesRouter";
import { productsRouter } from "./routers/productsRouter";
import { vendasRouter } from "./routers/vendasRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  products: productsRouter,
  vendas: vendasRouter,
  dashboard: dashboardRouter,
  encomendas: encomendasRouter,
  marcas: marcasRouter,
  movimentacoes: movimentacoesRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
