export const STOCK_ACTION_PREFIX = "stock.";

export const STOCK_AUDIT_ACTION = {
  PRODUCT_CREATED: "stock.product_created",
  PRODUCT_UPDATED: "stock.product_updated",
  PRODUCT_DELETED: "stock.product_deleted",
  SALE_REGISTERED_PUBLIC: "stock.sale_registered_public",
  SALE_REGISTERED: "stock.sale_registered",
  SALE_CANCELLED: "stock.sale_cancelled",
  SALE_EDITED: "stock.sale_edited",
  SALE_DELETED: "stock.sale_deleted",
} as const;

export type StockAuditAction = (typeof STOCK_AUDIT_ACTION)[keyof typeof STOCK_AUDIT_ACTION];

export const STOCK_AUDIT_LABEL: Record<StockAuditAction, string> = {
  [STOCK_AUDIT_ACTION.PRODUCT_CREATED]: "Produto criado com estoque inicial",
  [STOCK_AUDIT_ACTION.PRODUCT_UPDATED]: "Produto/estoque atualizado",
  [STOCK_AUDIT_ACTION.PRODUCT_DELETED]: "Produto removido",
  [STOCK_AUDIT_ACTION.SALE_REGISTERED_PUBLIC]: "Venda pública registrada",
  [STOCK_AUDIT_ACTION.SALE_REGISTERED]: "Venda registrada",
  [STOCK_AUDIT_ACTION.SALE_CANCELLED]: "Venda cancelada",
  [STOCK_AUDIT_ACTION.SALE_EDITED]: "Venda editada",
  [STOCK_AUDIT_ACTION.SALE_DELETED]: "Venda excluída",
};
