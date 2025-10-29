/**
 * POST /api/auth/nonce
 * Generate a cryptographically secure nonce for SIWE authentication
 */

import { NextResponse } from "next/server";
import crypto from "crypto";

// In-memory nonce storage (use Redis for production)
const nonceStore = new Map<string, { timestamp: number; used: boolean }>();

// Clean up expired nonces (older than 5 minutes)
function cleanupExpiredNonces() {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  for (const [nonce, data] of nonceStore.entries()) {
    if (now - data.timestamp > fiveMinutes) {
      nonceStore.delete(nonce);
    }
  }
}

export async function POST() {
  try {
    // Clean up old nonces
    cleanupExpiredNonces();

    // Generate cryptographically secure nonce (32 bytes = 64 hex chars)
    const nonce = crypto.randomBytes(32).toString("hex");

    // Store nonce with timestamp
    nonceStore.set(nonce, {
      timestamp: Date.now(),
      used: false,
    });

    return NextResponse.json({
      nonce,
      expiresIn: 300, // 5 minutes
    });
  } catch (error) {
    console.error("Error generating nonce:", error);
    return NextResponse.json(
      { error: "Failed to generate nonce" },
      { status: 500 }
    );
  }
}

// Export nonce store for verification route
export { nonceStore };
