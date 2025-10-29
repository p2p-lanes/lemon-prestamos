/**
 * Lemon SDK Wrapper
 * Integration with @lemoncash/mini-app-sdk
 */

import {
  authenticate,
  callSmartContract,
  isWebView,
  ChainId,
  TransactionResult,
} from "@lemoncash/mini-app-sdk";
import { ACTIVE_NETWORK } from "./contracts";

// Debug logging helper
async function debugLog(level: "info" | "warn" | "error", message: string, data?: any) {
  try {
    // Log to console for local debugging
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');

    // Send to backend for Vercel logs
    await fetch("/api/debug/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error("Failed to send log to backend:", err));
  } catch (error) {
    console.error("Debug log error:", error);
  }
}

// Check if running in Lemon app
export function isLemonApp(): boolean {
  return isWebView();
}

// Authenticate user with SIWE
export async function authenticateUser(nonce: string) {
  try {
    const result = await authenticate({
      nonce,
      chainId: ACTIVE_NETWORK.chainId as ChainId,
    });

    if (result.result === TransactionResult.SUCCESS) {
      return {
        success: true,
        wallet: result.data.wallet,
        signature: result.data.signature,
        message: result.data.message,
      };
    }

    if (result.result === TransactionResult.CANCELLED) {
      return {
        success: false,
        error: "User cancelled authentication",
      };
    }

    return {
      success: false,
      error: result.error || "Authentication failed",
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Call smart contract function (borrow, repay, approve)
export async function callContract(params: {
  contractAddress: string;
  functionName: string;
  functionParams: (string | number)[];
  value?: string;
}) {
  const requestData = {
    contractAddress: params.contractAddress,
    functionName: params.functionName,
    functionParams: params.functionParams,
    value: params.value || "0",
    chainId: ACTIVE_NETWORK.chainId,
    network: ACTIVE_NETWORK.name
  };

  await debugLog("info", "🚀 Calling smart contract", requestData);

  try {
    const result = await callSmartContract({
      contractAddress: params.contractAddress as `0x${string}`,
      functionName: params.functionName,
      functionParams: params.functionParams,
      value: params.value || "0",
      chainId: ACTIVE_NETWORK.chainId as ChainId,
    });

    await debugLog("info", "📦 Lemon SDK Result", {
      resultType: result.result,
      fullResult: result
    });

    if (result.result === TransactionResult.SUCCESS) {
      await debugLog("info", "✅ Transaction successful", {
        txHash: result.data.txHash
      });
      return {
        success: true,
        txHash: result.data.txHash,
      };
    }

    if (result.result === TransactionResult.CANCELLED) {
      await debugLog("warn", "❌ User cancelled transaction", {});
      return {
        success: false,
        error: "User cancelled transaction",
      };
    }

    await debugLog("error", "❌ Transaction failed", {
      errorObject: result.error,
      errorMessage: result.error?.message,
      errorCode: result.error?.code,
      fullError: JSON.stringify(result.error)
    });

    return {
      success: false,
      error: result.error?.message || "Transaction failed",
    };
  } catch (error) {
    await debugLog("error", "💥 Exception in callContract", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      errorObject: error
    });
    console.error("Contract call error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Borrow USDT
export async function borrowUSDT(amount: string) {
  return callContract({
    contractAddress: ACTIVE_NETWORK.contracts.VAULT,
    functionName: "borrow",
    functionParams: [amount], // Amount in USDT (6 decimals)
  });
}

// Repay loan
export async function repayLoan() {
  return callContract({
    contractAddress: ACTIVE_NETWORK.contracts.VAULT,
    functionName: "repay",
    functionParams: [],
  });
}

// Approve USDT spending
export async function approveUSDT(amount: string) {
  return callContract({
    contractAddress: ACTIVE_NETWORK.contracts.USDT,
    functionName: "approve",
    functionParams: [ACTIVE_NETWORK.contracts.VAULT, amount],
  });
}

// Repay defaulted loan
export async function repayDefaultedLoan() {
  return callContract({
    contractAddress: ACTIVE_NETWORK.contracts.VAULT,
    functionName: "repayDefaultedLoan",
    functionParams: [],
  });
}
