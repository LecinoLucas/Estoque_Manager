import { z } from "zod";
import { STOCK_AUDIT_ACTION } from "@shared/stock-governance";
import * as db from "../db";
import { logAuditEvent } from "../_core/audit";
import { notifyOwner } from "../_core/notification";
import {
  adminProcedure,
  managerOrAdminProcedure,
  protectedProcedure,
  router,
  withRateLimit,
} from "../_core/trpc";

export const productsRouter = router({
  list: protectedProcedure
    .use(withRateLimit({ scope: "products.list", max: 180, windowMs: 60 * 1000 }))
    .input(
      z
        .object({
          searchTerm: z.string().optional(),
          medida: z.string().optional(),
          categoria: z.string().optional(),
          marca: z.string().optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(10000).default(25),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const pageSize = Math.min(input?.pageSize ?? 25, 100);
      const offset = (page - 1) * pageSize;
      if (!input || (!input.searchTerm && !input.medida && !input.categoria && !input.marca)) {
        return await db.getAllProducts(pageSize, offset);
      }
      return await db.searchProducts(input.searchTerm, input.medida, input.categoria, input.marca, pageSize, offset);
    }),

  getBrands: protectedProcedure.query(async () => {
    return await db.getAllBrands();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getProductById(input.id);
    }),

  create: managerOrAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        marca: z.string().optional(),
        medida: z.string().min(1),
        categoria: z.enum([
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
          "Camas",
        ]),
        quantidade: z.number().int().min(0),
        estoqueMinimo: z.number().int().min(0).default(3),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const created = await db.createProductWithInitialMovement(input, ctx.user.id);
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.PRODUCT_CREATED,
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: {
            productId: created.id,
            name: created.name,
            medida: created.medida,
          },
          metadata: {
            estoqueInicial: created.quantidade,
            estoqueMinimo: created.estoqueMinimo,
          },
        });
        return { success: true };
      } catch (error) {
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.PRODUCT_CREATED,
          status: "failed",
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          metadata: {
            error: error instanceof Error ? error.message : "unknown_error",
            input,
          },
        });
        throw error;
      }
    }),

  update: managerOrAdminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        marca: z.string().optional(),
        medida: z.string().min(1).optional(),
        categoria: z
          .enum([
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
            "Camas",
          ])
          .optional(),
        quantidade: z.number().int().min(0).optional(),
        estoqueMinimo: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;

      const currentProduct = await db.getProductById(id);
      if (!currentProduct) {
        throw new Error("Product not found");
      }

      try {
        await db.updateProduct(id, updates);

        if (updates.quantidade !== undefined && updates.quantidade !== currentProduct.quantidade) {
          const tipo = updates.quantidade > currentProduct.quantidade ? "entrada" : "saida";
          const quantidadeDiff = Math.abs(updates.quantidade - currentProduct.quantidade);

          await db.createMovimentacao({
            productId: id,
            tipo,
            quantidade: quantidadeDiff,
            quantidadeAnterior: currentProduct.quantidade,
            quantidadeNova: updates.quantidade,
            observacao: "Ajuste manual de estoque",
            userId: ctx.user.id,
          });

          if (updates.quantidade <= 1 || updates.quantidade <= (updates.estoqueMinimo ?? currentProduct.estoqueMinimo)) {
            await notifyOwner({
              title: "⚠️ Estoque Baixo",
              content: `O produto "${currentProduct.name}" (${currentProduct.medida}) está com apenas ${updates.quantidade} unidade(s) em estoque.`,
            });
          }
        }

        const updatedProduct = await db.getProductById(id);
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.PRODUCT_UPDATED,
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: {
            productId: id,
            name: currentProduct.name,
            medida: currentProduct.medida,
          },
          metadata: {
            before: {
              quantidade: currentProduct.quantidade,
              estoqueMinimo: currentProduct.estoqueMinimo,
              precoCusto: currentProduct.precoCusto,
              precoVenda: currentProduct.precoVenda,
            },
            after: updatedProduct
              ? {
                  quantidade: updatedProduct.quantidade,
                  estoqueMinimo: updatedProduct.estoqueMinimo,
                  precoCusto: updatedProduct.precoCusto,
                  precoVenda: updatedProduct.precoVenda,
                }
              : null,
            updates,
          },
        });

        return { success: true };
      } catch (error) {
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.PRODUCT_UPDATED,
          status: "failed",
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: { productId: id, name: currentProduct.name, medida: currentProduct.medida },
          metadata: {
            error: error instanceof Error ? error.message : "unknown_error",
            attemptedUpdates: updates,
          },
        });
        throw error;
      }
    }),

  delete: managerOrAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const currentProduct = await db.getProductById(input.id);
      try {
        await db.deleteProduct(input.id);
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.PRODUCT_DELETED,
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: {
            productId: input.id,
            name: currentProduct?.name ?? null,
            medida: currentProduct?.medida ?? null,
          },
          metadata: {
            previousStock: currentProduct?.quantidade ?? null,
          },
        });
        return { success: true };
      } catch (error) {
        await logAuditEvent({
          action: STOCK_AUDIT_ACTION.PRODUCT_DELETED,
          status: "failed",
          actor: {
            id: ctx.user.id,
            email: ctx.user.email,
            role: ctx.user.role,
            openId: ctx.user.openId,
            ip: ctx.req.ip,
          },
          target: {
            productId: input.id,
            name: currentProduct?.name ?? null,
            medida: currentProduct?.medida ?? null,
          },
          metadata: {
            error: error instanceof Error ? error.message : "unknown_error",
          },
        });
        throw error;
      }
    }),

  lowStock: managerOrAdminProcedure.query(async () => {
    return await db.getLowStockProducts();
  }),

  negativeStock: managerOrAdminProcedure.query(async () => {
    return await db.getNegativeStockProducts();
  }),

  updatePrice: adminProcedure
    .input(
      z.object({
        id: z.number(),
        precoCusto: z.number().nullable(),
        precoVenda: z.number().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateProductPrice(input.id, input.precoCusto, input.precoVenda, ctx.user.id);
      return { success: true };
    }),

  priceHistory: adminProcedure
    .input(
      z.object({
        productId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getPriceHistory(input.productId);
    }),

  exportPDF: adminProcedure
    .use(withRateLimit({ scope: "products.export_pdf", max: 12, windowMs: 60 * 1000 }))
    .input(
      z.object({
        search: z.string().optional(),
        medida: z.string().optional(),
        categoria: z.string().optional(),
        marca: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { generateProductsPDF } = await import("../pdfExport");
      const products = await db.getProductsFiltered(input);
      return await generateProductsPDF(products);
    }),
});
