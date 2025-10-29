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
  try {
    const result = await callSmartContract({
      contractAddress: params.contractAddress as `0x${string}`,
      functionName: params.functionName,
      functionParams: params.functionParams,
      value: params.value || "0",
      chainId: ACTIVE_NETWORK.chainId as ChainId,
    });

    if (result.result === TransactionResult.SUCCESS) {
      return {
        success: true,
        txHash: result.data.txHash,
      };
    }

    if (result.result === TransactionResult.CANCELLED) {
      return {
        success: false,
        error: "User cancelled transaction",
      };
    }

    return {
      success: false,
      error: result.error?.message || "Transaction failed",
    };
  } catch (error) {
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
