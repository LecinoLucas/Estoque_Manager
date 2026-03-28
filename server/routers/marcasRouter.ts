import { z } from "zod";
import * as db from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

export const marcasRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllMarcas();
  }),

  create: adminProcedure
    .input(
      z.object({
        nome: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.createMarca(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.updateMarca(input.id, { nome: input.nome });
    }),

  delete: adminProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.deleteMarca(input.id);
    }),
});
