import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { products } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const describeDb = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

describeDb("Products with Custom Measures", () => {
  let testProductId: number;

  it("should create a product with custom measure (50x70)", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(products).values({
      name: "TRAVESSEIRO RELAX DREAM 50X70",
      marca: "LAMOUR",
      medida: "50x70",
      categoria: "Travesseiros",
      quantidade: 36,
      estoqueMinimo: 3,
    });

    testProductId = Number(result[0].insertId);
    expect(testProductId).toBeGreaterThan(0);
  });

  it("should retrieve the product with custom measure", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, testProductId));

    expect(product).toBeDefined();
    expect(product.name).toBe("TRAVESSEIRO RELAX DREAM 50X70");
    expect(product.medida).toBe("50x70");
    expect(product.categoria).toBe("Travesseiros");
    expect(product.quantidade).toBe(36);
  });

  it("should create products with various custom measures", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const customProducts = [
      { name: "TRAVESSEIRO 40x60", medida: "40x60", categoria: "Travesseiros" as const },
      { name: "TRAVESSEIRO 70x50", medida: "70x50", categoria: "Travesseiros" as const },
      { name: "CABECEIRA 160x120", medida: "160x120", categoria: "Cabeceiras" as const },
    ];

    for (const prod of customProducts) {
      const result = await db.insert(products).values({
        name: prod.name,
        marca: "TEST",
        medida: prod.medida,
        categoria: prod.categoria,
        quantidade: 10,
        estoqueMinimo: 3,
      });

      expect(Number(result[0].insertId)).toBeGreaterThan(0);
    }
  });

  it("should still accept standard mattress measures", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const standardMeasures = ["Solteiro", "Solteirão", "Casal", "Queen", "King"];

    for (const medida of standardMeasures) {
      const result = await db.insert(products).values({
        name: `Colchão Teste ${medida}`,
        marca: "TEST",
        medida: medida,
        categoria: "Colchões",
        quantidade: 5,
        estoqueMinimo: 3,
      });

      expect(Number(result[0].insertId)).toBeGreaterThan(0);
    }
  });
});
