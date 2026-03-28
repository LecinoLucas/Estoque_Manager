import { z } from "zod";
import * as db from "../db";
import {
  managerOrAdminProcedure,
  protectedProcedure,
  router,
  withRateLimit,
} from "../_core/trpc";

export const dashboardRouter = router({
  stats: protectedProcedure
    .use(withRateLimit({ scope: "dashboard.stats", max: 120, windowMs: 60 * 1000 }))
    .query(async () => {
    return await db.getDashboardStats();
    }),
  topSelling: protectedProcedure
    .use(withRateLimit({ scope: "dashboard.top_selling", max: 120, windowMs: 60 * 1000 }))
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        limit: z.number().optional().default(5),
      }),
    )
    .query(async ({ input }) => {
      return await db.getTopSellingProducts(input.startDate, input.endDate, input.limit);
    }),
  salesByDate: protectedProcedure
    .use(withRateLimit({ scope: "dashboard.sales_by_date", max: 120, windowMs: 60 * 1000 }))
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getSalesByDateRange(input.startDate, input.endDate);
    }),
  salesByCategory: protectedProcedure
    .use(withRateLimit({ scope: "dashboard.sales_by_category", max: 120, windowMs: 60 * 1000 }))
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getSalesByCategory(input.startDate, input.endDate);
    }),
  salesByMedida: protectedProcedure
    .use(withRateLimit({ scope: "dashboard.sales_by_medida", max: 120, windowMs: 60 * 1000 }))
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getSalesByMedida(input.startDate, input.endDate);
    }),
  replenishmentSuggestions: managerOrAdminProcedure.query(async () => {
    return await db.getReplenishmentSuggestions();
  }),
});
