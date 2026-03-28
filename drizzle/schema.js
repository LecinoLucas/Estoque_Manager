import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";
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
/**
 * Products table - stores all mattress and accessories inventory
 */
export const products = mysqlTable("products", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    medida: mysqlEnum("medida", ["Solteiro", "Solteirão", "Casal", "Queen", "King"]).notNull(),
    categoria: mysqlEnum("categoria", [
        "Colchões",
        "Roupas de Cama",
        "Pillow Top",
        "Travesseiros",
        "Cabeceiras",
        "Box Baú",
        "Box Premium",
        "Box Tradicional"
    ]).notNull(),
    quantidade: int("quantidade").notNull().default(0),
    estoqueMinimo: int("estoqueMinimo").notNull().default(3),
    precoCusto: decimal("precoCusto", { precision: 10, scale: 2 }),
    precoVenda: decimal("precoVenda", { precision: 10, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
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
/**
 * Daily sales table - tracks products sold per day
 */
export const vendas = mysqlTable("vendas", {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull(),
    quantidade: int("quantidade").notNull(),
    dataVenda: timestamp("dataVenda").notNull(),
    userId: int("userId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
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
