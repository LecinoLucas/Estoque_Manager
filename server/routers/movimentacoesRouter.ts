import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const movimentacoesRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllMovimentacoes();
  }),

  byProduct: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return await db.getMovimentacoesByProduct(input.productId);
    }),
});
