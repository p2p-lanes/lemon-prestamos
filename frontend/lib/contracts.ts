/**
 * Smart Contract Configuration
 * Contains contract addresses and AB

Is for different networks
 */

export const CHAIN_CONFIG = {
  BASE_SEPOLIA: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    contracts: {
      VAULT: "0x63062Eb252dDA3291B4C1D6E4bc3Dd5a81F85a50",
      USDT: "0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52",
    },
  },
  BASE_MAINNET: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    contracts: {
      VAULT: "", // To be deployed
      USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    },
  },
} as const;

// Current active network (change for production)
export const ACTIVE_NETWORK = CHAIN_CONFIG.BASE_SEPOLIA;

// Contract ABIs (minimal - only functions we need)
export const VAULT_ABI = [
  // View functions
  "function getCreditLimit(address user) view returns (uint256)",
  "function getActiveLoan(address user) view returns (tuple(uint256 id, address borrower, uint256 principal, uint256 timestamp, bool isActive, bool isRepaid, bool isDefaulted))",
  "function calculateRepaymentAmount(address user) view returns (uint256)",
  "function getAllLoans() view returns (tuple(uint256 id, address borrower, uint256 principal, uint256 timestamp, bool isActive, bool isRepaid, bool isDefaulted)[])",
  "function getUserLoanCount(address user) view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function getTotalDefaultedAmount() view returns (uint256)",
  "function isLoanOverdue(address user) view returns (bool)",

  // State-changing functions
  "function borrow(uint256 amount) external",
  "function repay() external",
  "function repayDefaultedLoan() external",

  // Events
  "event LoanIssued(address indexed borrower, uint256 indexed loanId, uint256 amount, uint256 timestamp)",
  "event LoanRepaid(address indexed borrower, uint256 indexed loanId, uint256 principal, uint256 interest, uint256 timestamp)",
  "event LoanDefaulted(address indexed borrower, uint256 indexed loanId, uint256 principal, uint256 timestamp)",
] as const;

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

// Helper to format USDT amounts (6 decimals)
export function formatUSDT(amount: bigint): string {
  const value = Number(amount) / 1e6;
  return value.toFixed(2);
}

// Helper to parse USDT amounts (6 decimals)
export function parseUSDT(amount: string): bigint {
  const value = parseFloat(amount);
  return BigInt(Math.floor(value * 1e6));
}

// Constants from contract
export const CONSTANTS = {
  INITIAL_CREDIT_LIMIT: 5, // USDT
  CREDIT_INCREASE_FACTOR: 1.2, // 20% increase
  BASE_APR: 0.1, // 10%
  PUNITIVE_APR: 0.2, // 20%
  LOAN_DURATION: 30 * 24 * 60 * 60, // 30 days in seconds
  MIN_LOAN_DURATION: 7 * 24 * 60 * 60, // 7 days in seconds
} as const;
