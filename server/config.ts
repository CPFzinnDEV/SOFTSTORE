import Stripe from "stripe";

// Environment variables
export const ENV = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_CLIENT_ID: process.env.STRIPE_CLIENT_ID || "",

  // AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || "",
  AWS_REGION: process.env.AWS_REGION || "us-east-1",

  // Email
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",

  // URLs
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:3000",

  // Node environment
  NODE_ENV: process.env.NODE_ENV || "development",

  // Platform settings
  PLATFORM_FEE_PERCENTAGE: 10, // 10% platform fee
};

// Initialize Stripe
export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

// Validate required environment variables
export function validateEnv() {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`[Config] Missing environment variables: ${missing.join(", ")}`);
  }
}

// Only initialize Stripe if API key is available
if (!ENV.STRIPE_SECRET_KEY) {
  console.warn("[Config] Stripe API key not configured");
}

