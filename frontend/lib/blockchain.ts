/**
 * Blockchain Utilities
 * ethers.js integration for reading contract data
 */

import { ethers } from "ethers";
import { ACTIVE_NETWORK, VAULT_ABI, ERC20_ABI } from "./contracts";

// Create provider (read-only)
export function getProvider() {
  return new ethers.JsonRpcProvider(ACTIVE_NETWORK.rpcUrl);
}

// Create vault contract instance
export function getVaultContract(providerOrSigner?: ethers.Provider | ethers.Signer) {
  const provider = providerOrSigner || getProvider();
  return new ethers.Contract(
    ACTIVE_NETWORK.contracts.VAULT,
    VAULT_ABI,
    provider
  );
}

// Create USDT contract instance
export function getUSDTContract(providerOrSigner?: ethers.Provider | ethers.Signer) {
  const provider = providerOrSigner || getProvider();
  return new ethers.Contract(
    ACTIVE_NETWORK.contracts.USDT,
    ERC20_ABI,
    provider
  );
}

// Format address for display (0x1234...5678)
export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Calculate time remaining on loan
export function calculateTimeRemaining(timestamp: bigint): {
  days: number;
  hours: number;
  isOverdue: boolean;
} {
  const now = Math.floor(Date.now() / 1000);
  const loanTimestamp = Number(timestamp);
  const elapsed = now - loanTimestamp;
  const remaining = 30 * 24 * 60 * 60 - elapsed; // 30 days

  if (remaining <= 0) {
    return {
      days: 0,
      hours: 0,
      isOverdue: true,
    };
  }

  return {
    days: Math.floor(remaining / (24 * 60 * 60)),
    hours: Math.floor((remaining % (24 * 60 * 60)) / 3600),
    isOverdue: false,
  };
}

// Calculate APR based on loan age
export function getCurrentAPR(timestamp: bigint): number {
  const now = Math.floor(Date.now() / 1000);
  const loanTimestamp = Number(timestamp);
  const daysSinceLoan = (now - loanTimestamp) / (24 * 60 * 60);

  return daysSinceLoan > 30 ? 20 : 10; // 20% APR if overdue, else 10%
}

// Format transaction link
export function getTxLink(txHash: string): string {
  return `${ACTIVE_NETWORK.blockExplorer}/tx/${txHash}`;
}

// Format address link
export function getAddressLink(address: string): string {
  return `${ACTIVE_NETWORK.blockExplorer}/address/${address}`;
}

// Check if can repay (7 day minimum passed)
export function canRepay(timestamp: bigint): boolean {
  const now = Math.floor(Date.now() / 1000);
  const loanTimestamp = Number(timestamp);
  const elapsed = now - loanTimestamp;
  const minDuration = 7 * 24 * 60 * 60; // 7 days

  return elapsed >= minDuration;
}

// Format time ago
export function formatTimeAgo(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const loanTimestamp = Number(timestamp);
  const elapsed = now - loanTimestamp;

  const days = Math.floor(elapsed / (24 * 60 * 60));
  const hours = Math.floor((elapsed % (24 * 60 * 60)) / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}
