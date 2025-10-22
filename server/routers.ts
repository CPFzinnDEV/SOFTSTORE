import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateLicenseKey } from "./auth";
import { stripe, ENV } from "./config";
import { storagePut, storageGet } from "./storage";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Products router
  products: router({
    // Create a new product (seller only)
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string(),
          summary: z.string(),
          priceSaleCents: z.number().optional(),
          priceRentCents: z.number().optional(),
          rentPeriodDays: z.number().optional(),
          tags: z.array(z.string()),
          version: z.string(),
          licenseType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "seller" && ctx.user?.role !== "admin") {
          throw new Error("Only sellers can create products");
        }

        const userId = ctx.user?.id;
        if (!userId) throw new Error("User ID required");

        const product = await db.createProduct({
          sellerId: userId,
          ...input,
          images: JSON.stringify([]),
          tags: JSON.stringify(input.tags),
          status: "draft",
        });

        return product;
      }),

    // Get presigned URL for file upload
    getUploadUrl: protectedProcedure
      .input(z.object({ productId: z.number(), fileName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new Error("User ID required");

        const product = await db.getProduct(input.productId);
        if (!product || product.sellerId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        const key = `products/${input.productId}/${Date.now()}-${input.fileName}`;
        const presignedUrl = await storagePut(key, Buffer.from(""), "application/octet-stream");

        // Store the S3 key in the product
        await db.updateProduct(input.productId, { s3Key: key });

        return presignedUrl;
      }),

    // Update product
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          priceSaleCents: z.number().optional(),
          priceRentCents: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new Error("User ID required");

        const product = await db.getProduct(input.id);
        if (!product || product.sellerId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        const { id, ...updates } = input;
        await db.updateProduct(id, updates);

        return { success: true };
      }),

    // Get product details
    get: publicProcedure.input(z.number()).query(async ({ input }) => {
      return db.getProduct(input);
    }),

    // List all published products
    list: publicProcedure
      .input(
        z.object({
          skip: z.number().default(0),
          take: z.number().default(20),
          type: z.enum(["sale", "rent"]).optional(),
        })
      )
      .query(async ({ input }) => {
        return db.getPublishedProducts();
      }),

    // Get seller's products
    mySelling: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) throw new Error("User ID required");
      return db.getProductsBySeller(ctx.user.id);
    }),
  }),

  // Purchases router
  purchases: router({
    // Create checkout session
    createCheckout: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          type: z.enum(["sale", "rent"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id || !ctx.user?.email) throw new Error("User ID and email required");

        const product = await db.getProduct(input.productId);
        if (!product) throw new Error("Product not found");

        const price =
          input.type === "sale" ? product.priceSaleCents : product.priceRentCents;
        if (!price) throw new Error("Product not available for this type");

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: ctx.user.email,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: product.title,
                  description: product.summary || "",
                },
                unit_amount: price,
              },
              quantity: 1,
            },
          ],
          success_url: `${ENV.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${ENV.FRONTEND_URL}/checkout/cancel`,
          metadata: {
            productId: input.productId.toString(),
            buyerId: ctx.user.id.toString(),
            type: input.type,
          },
        } as any);

        return { sessionId: session.id, url: session.url };
      }),

    // Get user's purchases
    myPurchases: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) throw new Error("User ID required");
      return db.getBuyerPurchases(ctx.user.id);
    }),

    // Get download URL for a purchase
    getDownloadUrl: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new Error("User ID required");

        const purchase = await db.getPurchase(input);
        if (!purchase || purchase.buyerId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        // Check if rental is still valid
        if (purchase.type === "rent" && purchase.endDate) {
          if (new Date() > purchase.endDate) {
            throw new Error("Rental period has expired");
          }
        }

        const product = await db.getProduct(purchase.productId);
        if (!product || !product.s3Key) {
          throw new Error("Product file not found");
        }

        // Generate presigned GET URL (valid for 1 hour)
        const downloadUrl = await storageGet(product.s3Key, 3600);
        return downloadUrl;
      }),
  }),

  // Seller dashboard router
  seller: router({
    // Get seller statistics
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) throw new Error("User ID required");
      if (ctx.user.role !== "seller" && ctx.user.role !== "admin") {
        throw new Error("Only sellers can access this");
      }

      const products = await db.getProductsBySeller(ctx.user.id);
      const transactions = await db.getSellerTransactions(ctx.user.id);

      const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.transactions?.netCents || 0), 0);
      const totalFees = transactions.reduce((sum: number, t: any) => sum + (t.transactions?.feeCents || 0), 0);

      return {
        productCount: products.length,
        totalRevenue: totalRevenue / 100,
        totalFees: totalFees / 100,
        recentTransactions: transactions.slice(0, 10),
      };
    }),

    // Start Stripe Connect onboarding
    startOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user?.id) throw new Error("User ID required");

      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");

      // Create or get Stripe connected account
      let stripeAccountId = user.stripeAccountId;
      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email,
          business_profile: {
            url: ENV.FRONTEND_URL,
          },
        } as any);
        stripeAccountId = account.id;
      }

      // Create onboarding link
      const link = await stripe.accountLinks.create({
        account: stripeAccountId,
        type: "account_onboarding",
        return_url: `${ENV.FRONTEND_URL}/seller/onboarding/return`,
        refresh_url: `${ENV.FRONTEND_URL}/seller/onboarding/refresh`,
      } as any);

      return { url: link.url };
    }),
  }),

  // Admin router
  admin: router({
    // Get all transactions
    allTransactions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin only");
      }
      return [];
    }),
  }),

  // Webhooks router (public)
  webhooks: router({
    stripeEvent: publicProcedure
      .input(z.object({ event: z.any() }))
      .mutation(async ({ input }) => {
        const event = input.event;

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          const { productId, buyerId, type } = session.metadata;

          // Create purchase record
          const licenseKey = generateLicenseKey();
          const purchaseResult = await db.createPurchase({
            buyerId: parseInt(buyerId),
            productId: parseInt(productId),
            type,
            startDate: new Date(),
            endDate:
              type === "rent"
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                : null,
            licenseKey,
            stripePaymentId: session.payment_intent || session.id,
            status: "completed",
          });

          // Get the purchase ID from the result
          const purchaseId = (purchaseResult as any)[0]?.insertId || 1;

          // Create transaction record
          const feeCents = Math.round((session.amount_total || 0) * (ENV.PLATFORM_FEE_PERCENTAGE / 100));
          const netCents = (session.amount_total || 0) - feeCents;

          await db.createTransaction({
            purchaseId,
            stripeData: JSON.stringify(session),
            amountCents: session.amount_total || 0,
            feeCents,
            netCents,
          });

          // Create license record
          await db.createLicense({
            purchaseId,
            licenseKey,
            activationsAllowed: 1,
            activationsCount: 0,
            expiresAt: type === "rent" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          });
        }

        return { received: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

