import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const describeDb = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" | "gerente" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "local",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describeDb("products.create", () => {
  it("should create a product with valid data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.create({
      name: "Test Product",
      medida: "Queen",
      categoria: "Colchões",
      quantidade: 10,
      estoqueMinimo: 3,
    });

    expect(result).toEqual({ success: true });
  });
});

describeDb("products.list", () => {
  it("should list products without filters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.list();

    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("should filter products by search term", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.list({
      searchTerm: "Test",
    });

    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });
});
