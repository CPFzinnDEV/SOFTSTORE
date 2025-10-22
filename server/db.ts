import { eq, and, desc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  products,
  purchases,
  transactions,
  licenses,
  Product,
  Purchase,
  Transaction,
  License,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      email: user.email || "",
    };
    const updateSet: Record<string, any> = {};

    const textFields = ["name", "email"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Products
export async function createProduct(product: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(products).values(product);
  return result;
}

export async function updateProduct(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(products).set(updates).where(eq(products.id, id));
}

export async function getProduct(id: number): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProductsBySeller(sellerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(products).where(eq(products.sellerId, sellerId));
}

export async function getPublishedProducts(filters?: {
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  type?: "sale" | "rent";
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(products)
    .where(eq(products.status, "published"));

  // Add filters if needed
  return query;
}

// Purchases
export async function createPurchase(purchase: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(purchases).values(purchase);
  return result;
}

export async function getPurchase(id: number): Promise<Purchase | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(purchases).where(eq(purchases.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPurchaseByStripeId(stripePaymentId: string): Promise<Purchase | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(purchases)
    .where(eq(purchases.stripePaymentId, stripePaymentId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePurchase(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(purchases).set(updates).where(eq(purchases.id, id));
}

export async function getBuyerPurchases(buyerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(purchases).where(eq(purchases.buyerId, buyerId));
}

// Transactions
export async function createTransaction(transaction: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(transactions).values(transaction);
  return result;
}

export async function getSellerTransactions(sellerId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all products by seller, then all purchases for those products, then all transactions
  const sellerProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sellerId, sellerId));

  if (sellerProducts.length === 0) return [];

  const productIds = sellerProducts.map((p) => p.id);

  return db
    .select()
    .from(transactions)
    .innerJoin(purchases, eq(transactions.purchaseId, purchases.id))
    .where(
      and(
        ...productIds.map((id) => eq(purchases.productId, id))
      )
    )
    .orderBy(desc(transactions.createdAt));
}

// Licenses
export async function createLicense(license: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(licenses).values(license);
  return result;
}

export async function getLicenseByKey(licenseKey: string): Promise<License | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(licenses)
    .where(eq(licenses.licenseKey, licenseKey))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLicenseByPurchaseId(purchaseId: number): Promise<License | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(licenses)
    .where(eq(licenses.purchaseId, purchaseId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateLicense(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(licenses).set(updates).where(eq(licenses.id, id));
}

