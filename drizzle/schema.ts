import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
} from "drizzle-orm/mysql-core";

// Users table with seller/buyer roles
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash"),
  role: mysqlEnum("role", ["buyer", "seller", "admin"]).default("buyer").notNull(),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  kycStatus: mysqlEnum("kycStatus", ["pending", "verified", "rejected"]).default("pending"),
  emailVerified: boolean("emailVerified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Products table
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  summary: varchar("summary", { length: 500 }),
  priceSaleCents: int("priceSaleCents"), // Price in cents for sale
  priceRentCents: int("priceRentCents"), // Price in cents for rental
  rentPeriodDays: int("rentPeriodDays"), // Rental period in days (7, 30, etc.)
  s3Key: varchar("s3Key", { length: 500 }), // S3 key for the uploaded file
  images: text("images"), // JSON array of image URLs
  tags: text("tags"), // JSON array of tags
  version: varchar("version", { length: 50 }),
  licenseType: varchar("licenseType", { length: 100 }), // MIT, GPL, Commercial, etc.
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Purchases table
export const purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  buyerId: int("buyerId").notNull(),
  productId: int("productId").notNull(),
  type: mysqlEnum("type", ["sale", "rent"]).notNull(),
  startDate: datetime("startDate").notNull(),
  endDate: datetime("endDate"), // For rentals, when access expires
  licenseKey: varchar("licenseKey", { length: 255 }).notNull().unique(),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Transactions table
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  purchaseId: int("purchaseId").notNull(),
  stripeData: text("stripeData"), // JSON with Stripe event data
  amountCents: int("amountCents").notNull(), // Total amount in cents
  feeCents: int("feeCents").notNull(), // Platform fee in cents
  netCents: int("netCents").notNull(), // Net amount to seller in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Licenses table
export const licenses = mysqlTable("licenses", {
  id: int("id").autoincrement().primaryKey(),
  purchaseId: int("purchaseId").notNull(),
  licenseKey: varchar("licenseKey", { length: 255 }).notNull().unique(),
  activationsAllowed: int("activationsAllowed").default(1),
  activationsCount: int("activationsCount").default(0),
  expiresAt: datetime("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Email verification tokens
export const emailTokens = mysqlTable("emailTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: datetime("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Webhook logs for debugging
export const webhookLogs = mysqlTable("webhookLogs", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  eventId: varchar("eventId", { length: 255 }).notNull(),
  payload: text("payload"), // JSON payload
  status: mysqlEnum("status", ["received", "processed", "failed"]).default("received"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

export type EmailToken = typeof emailTokens.$inferSelect;
export type InsertEmailToken = typeof emailTokens.$inferInsert;

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;

