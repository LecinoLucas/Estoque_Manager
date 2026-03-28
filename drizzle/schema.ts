import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "gerente"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Brands table - stores product brands
 */
export const marcas = mysqlTable("marcas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Marca = typeof marcas.$inferSelect;
export type InsertMarca = typeof marcas.$inferInsert;

/**
 * Products table - stores all mattress and accessories inventory
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  marca: varchar("marca", { length: 100 }),
  medida: varchar("medida", { length: 100 }).notNull(),
  categoria: mysqlEnum("categoria", [
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
    "Camas"
  ]).notNull(),
  quantidade: int("quantidade").notNull().default(0),
  estoqueMinimo: int("estoqueMinimo").notNull().default(3),
  precoCusto: decimal("precoCusto", { precision: 10, scale: 2 }),
  precoVenda: decimal("precoVenda", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Stock movements table - tracks all inventory changes (entries and exits)
 */
export const movimentacoes = mysqlTable("movimentacoes", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  tipo: mysqlEnum("tipo", ["entrada", "saida"]).notNull(),
  quantidade: int("quantidade").notNull(),
  quantidadeAnterior: int("quantidadeAnterior").notNull(),
  quantidadeNova: int("quantidadeNova").notNull(),
  observacao: text("observacao"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Movimentacao = typeof movimentacoes.$inferSelect;
export type InsertMovimentacao = typeof movimentacoes.$inferInsert;

/**
 * Daily sales table - tracks products sold per day
 */
export const vendas = mysqlTable("vendas", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  quantidade: int("quantidade").notNull(),
  dataVenda: timestamp("dataVenda").notNull(),
  vendedor: varchar("vendedor", { length: 100 }),
  nomeCliente: varchar("nomeCliente", { length: 200 }),
  tipoTransacao: mysqlEnum("tipoTransacao", ["venda", "troca", "brinde", "emprestimo", "permuta"]).default("venda").notNull(),
  status: mysqlEnum("status", ["concluida", "cancelada"]).default("concluida").notNull(),
  motivoCancelamento: text("motivoCancelamento"),
  observacoes: text("observacoes"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Venda = typeof vendas.$inferSelect;
export type InsertVenda = typeof vendas.$inferInsert;

/**
 * Price history table - tracks all price changes for products
 */
export const historicoPrecos = mysqlTable("historicoPrecos", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  precoCustoAnterior: decimal("precoCustoAnterior", { precision: 10, scale: 2 }),
  precoCustoNovo: decimal("precoCustoNovo", { precision: 10, scale: 2 }),
  precoVendaAnterior: decimal("precoVendaAnterior", { precision: 10, scale: 2 }),
  precoVendaNovo: decimal("precoVendaNovo", { precision: 10, scale: 2 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoPreco = typeof historicoPrecos.$inferSelect;
export type InsertHistoricoPreco = typeof historicoPrecos.$inferInsert;

/**
 * Orders table - tracks custom and pre-registered product orders
 */
export const encomendas = mysqlTable("encomendas", {
  id: int("id").autoincrement().primaryKey(),
  // Product reference (null if custom product)
  productId: int("productId"),
  // Custom product fields (used when productId is null)
  nomeProduto: varchar("nomeProduto", { length: 255 }),
  medidaProduto: varchar("medidaProduto", { length: 100 }),
  // Order details
  quantidade: int("quantidade").notNull(),
  nomeCliente: varchar("nomeCliente", { length: 200 }).notNull(),
  telefoneCliente: varchar("telefoneCliente", { length: 20 }),
  dataCompra: timestamp("dataCompra"),
  prazoEntregaDias: int("prazoEntregaDias"), // Prazo em dias úteis (alternativa a dataEntrega manual)
  dataEntrega: timestamp("dataEntrega").notNull(),
  pedidoFeito: boolean("pedidoFeito").default(false).notNull(),
  status: mysqlEnum("status", ["pendente", "em_producao", "pronto", "entregue", "cancelado"]).default("pendente").notNull(),
  observacoes: text("observacoes"),
  vendedor: varchar("vendedor", { length: 100 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Encomenda = typeof encomendas.$inferSelect;
export type InsertEncomenda = typeof encomendas.$inferInsert;
