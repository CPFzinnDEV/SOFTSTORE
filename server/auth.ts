import { randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a unique license key
 */
export function generateLicenseKey(): string {
  const uuid = randomBytes(16).toString("hex");
  const hash = randomBytes(16).toString("hex");
  return `${uuid}-${hash}`.toUpperCase();
}

/**
 * Generate an email verification token
 */
export function generateEmailToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate JWT token
 */
export function generateJWT(payload: Record<string, any>, secret: string, expiresIn: string = "7d"): string {
  // Using a simple JWT implementation - in production, use jsonwebtoken library
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = parseExpiration(expiresIn);
  
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    })
  ).toString("base64url");

  const crypto = require("crypto");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

/**
 * Parse expiration time string to seconds
 */
function parseExpiration(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 604800; // default 7 days

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case "s":
      return num;
    case "m":
      return num * 60;
    case "h":
      return num * 3600;
    case "d":
      return num * 86400;
    default:
      return 604800;
  }
}

