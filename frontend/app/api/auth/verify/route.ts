/**
 * POST /api/auth/verify
 * Verify SIWE (Sign In With Ethereum) signature
 */

import { NextResponse } from "next/server";
import { verifySiweMessage } from "viem";
import { nonceStore } from "../nonce/route";

export async function POST(request: Request) {
  try {
    const { wallet, signature, message, nonce } = await request.json();

    // Validate required fields
    if (!wallet || !signature || !message || !nonce) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check nonce exists
    const nonceData = nonceStore.get(nonce);
    if (!nonceData) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    // Check nonce hasn't been used
    if (nonceData.used) {
      return NextResponse.json(
        { error: "Nonce already used" },
        { status: 401 }
      );
    }

    // Check nonce hasn't expired (5 minutes)
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - nonceData.timestamp > fiveMinutes) {
      nonceStore.delete(nonce);
      return NextResponse.json(
        { error: "Nonce expired" },
        { status: 401 }
      );
    }

    // Verify SIWE signature (supports ERC-6492 for contract wallets)
    const isValid = await verifySiweMessage({
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Mark nonce as used
    nonceData.used = true;
    nonceStore.set(nonce, nonceData);

    // Success - user is authenticated
    return NextResponse.json({
      verified: true,
      wallet: wallet,
    });
  } catch (error) {
    console.error("Error verifying SIWE signature:", error);
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
