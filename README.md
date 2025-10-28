# Prestamos - Uncollateralized Lending on Lemon Cash

A mini app for Lemon Cash that provides uncollateralized USDT lending using an ERC4626 vault architecture.

## Overview

Prestamos allows users to:
- Borrow USDT without collateral based on credit limits
- Start with 5 USDT borrowing limit
- Increase their limit by 20% with each successful repayment
- Repay loans with 10% APR (20% APR for late payments after 30 days)

Liquidity providers can:
- Deposit USDT into the vault and receive shares
- Earn interest from loan repayments proportionally
- Withdraw their funds at any time

## Architecture

### Smart Contracts

**LendingVault.sol** - Main contract implementing:
- ERC4626 vault standard for liquidity management
- Uncollateralized lending with progressive credit limits
- APR-based interest calculation
- One active loan per user
- **Default tracking mechanism** (loans can be marked as defaulted)
- **Default recovery** (defaulted loans can still be repaid with reduced credit increase)

**MockUSDT.sol** - Test token for Base Sepolia testnet (6 decimals, like real USDT)

### Key Features

- **Initial Credit Limit**: 5 USDT for new users
- **Credit Growth**: 20% increase per successful repayment (10% for defaulted loans)
- **Interest Rate**: 10% APR (base), 20% APR (after 30 days overdue)
- **Loan Duration**: 30 days recommended
- **Late Payments**: No penalties, users can repay anytime with higher interest
- **Default Threshold**: Loans can be marked as defaulted (typically after 90 days)
- **Default Impact**: Defaulted loans reduce vault's totalAssets until repaid
- **Default Recovery**: Borrowers can still repay defaulted loans, but get smaller credit increase

## Setup

### Prerequisites

- Node.js v22.10.0 or later (LTS)
- npm or yarn
- A wallet with Base Sepolia ETH for deployment

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your `.env` file:
```env
PRIVATE_KEY=your_private_key_without_0x
ALCHEMY_API_KEY=riB9BhOYQqR-NEKNc6mr0
BASESCAN_API_KEY=2T867QJTQR59A4KJIMD7I33KSKTWIANPKH
```

### Compile Contracts

```bash
npm run compile
```

### Check Vault Status

View comprehensive vault statistics, transaction history, and borrower information:

```bash
npm run status
```

This displays:
- Quick stats (total assets, liquidity, utilization rate)
- Recent loan transactions
- Active loans table
- Borrower information
- Contract addresses and links

## Deployment

### Deploy to Base Sepolia (Testnet)

#### Step 1: Deploy MockUSDT

```bash
npx hardhat run scripts/deploy-mock-usdt.ts --network baseSepolia
```

Save the deployed address and add it to your `.env`:
```env
MOCK_USDT_ADDRESS=0x...
```

#### Step 2: Deploy LendingVault

```bash
npx hardhat run scripts/deploy-vault.ts --network baseSepolia
```

Save the vault address to your `.env`:
```env
VAULT_ADDRESS=0x...
```

#### Step 3: Verify Contracts on BaseScan

```bash
# Verify MockUSDT
npx hardhat verify --network baseSepolia <MOCK_USDT_ADDRESS>

# Verify LendingVault
npx hardhat verify --network baseSepolia <VAULT_ADDRESS> "<MOCK_USDT_ADDRESS>"
```

#### Step 4: Fund the Vault with Initial Liquidity

```bash
# Set amount in .env (optional, defaults to 1000 USDT)
DEPOSIT_AMOUNT=1000

# Fund the vault
npx hardhat run scripts/fund-vault.ts --network baseSepolia
```

### Deploy to Base Mainnet

```bash
# Make sure you have the mainnet USDT address in your config (already set)
# USDT on Base: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2

npx hardhat run scripts/deploy-vault.ts --network base

# Verify on BaseScan
npx hardhat verify --network base <VAULT_ADDRESS> "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
```

## Smart Contract Functions

### For Borrowers

- `borrow(uint256 amount)` - Borrow USDT up to credit limit
- `repay()` - Repay active loan with interest (20% credit increase)
- `repayDefaultedLoan()` - Repay a defaulted loan (10% credit increase)
- `getCreditLimit(address user)` - Check available credit limit
- `getActiveLoan(address user)` - Get current loan details
- `calculateRepaymentAmount(address user)` - Calculate amount owed
- `isLoanOverdue(address user)` - Check if loan is past 90-day threshold

### For Liquidity Providers

- `deposit(uint256 assets, address receiver)` - Deposit USDT, receive vault shares
- `withdraw(uint256 assets, address receiver, address owner)` - Withdraw USDT, burn shares
- `totalAssets()` - View total vault assets (liquidity + outstanding loans)
- `balanceOf(address account)` - Check vault shares owned

### Public View Functions

- `getAllLoans()` - Get all loans (for /activity page)
- `getDefaultedLoans()` - Get all currently defaulted loans
- `getTotalLoans()` - Get total number of loans issued
- `getTotalDefaultedAmount()` - Get total amount currently defaulted
- `getUserLoanCount(address user)` - Get user's successful repayment count

### Admin Functions (Owner Only)

- `pause()` / `unpause()` - Emergency controls
- `rescueFunds(uint256 amount)` - Emergency withdrawal
- `setCreditLimit(address user, uint256 newLimit)` - Manual credit limit override
- `markAsDefaulted(address borrower)` - Mark a loan as defaulted

## Interest Calculation

### On-Time Repayment (≤ 30 days)
```
Interest = Principal × 10% APR × (Days Elapsed / 365)
```

### Late Repayment (> 30 days)
```
Interest = Principal × 20% APR × (Days Elapsed / 365)
```

### Example
- Borrow: 5 USDT
- Repay after 30 days: 5.041 USDT
- Repay after 60 days: 5.164 USDT (20% APR kicks in)

## Credit Limit Progression

```
Start: 5 USDT
After 1st repayment: 6 USDT (5 × 1.20)
After 2nd repayment: 7.2 USDT (6 × 1.20)
After 3rd repayment: 8.64 USDT
After 4th repayment: 10.37 USDT
...and so on
```

## Network Information

### Base Sepolia (Testnet)
- Chain ID: 84532
- RPC: https://base-sepolia.g.alchemy.com/v2/riB9BhOYQqR-NEKNc6mr0
- Explorer: https://sepolia.basescan.org
- Faucet: https://www.alchemy.com/faucets/base-sepolia

### Base Mainnet
- Chain ID: 8453
- RPC: https://base-mainnet.g.alchemy.com/v2/riB9BhOYQqR-NEKNc6mr0
- Explorer: https://basescan.org
- USDT Address: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2

## Testing

### Unit Tests

```bash
npm test
```

Note: Comprehensive test suite exists in `test/LendingVault.test.ts` but requires Hardhat 2.x compatibility. Currently using manual testing scripts (see below).

### Manual Testing Scripts

Check vault status:
```bash
npm run status
```

Borrow USDT:
```bash
npx tsx scripts/borrow.ts <borrower-number> <amount>
# Example: npx tsx scripts/borrow.ts 1 3
```

Repay loan:
```bash
npx tsx scripts/repay.ts <borrower-number>
# Example: npx tsx scripts/repay.ts 1
```

Mark loan as defaulted (admin only):
```bash
npx tsx scripts/mark-defaulted.ts <borrower-number>
# Example: npx tsx scripts/mark-defaulted.ts 2
```

All testing scripts provide detailed output with transaction links.

## Frontend Integration

Use the Lemon Cash Mini App SDK to integrate with these contracts:

```typescript
import { authenticate, callSmartContract } from '@lemoncash/mini-app-sdk';

// Get user's wallet
const auth = await authenticate();

// Borrow 5 USDT
await callSmartContract({
  contractAddress: VAULT_ADDRESS,
  functionName: 'borrow',
  functionParams: ['5000000'], // 5 USDT with 6 decimals
  value: '0',
});

// Repay loan
await callSmartContract({
  contractAddress: VAULT_ADDRESS,
  functionName: 'repay',
  functionParams: [],
  value: '0',
});
```

## Security Considerations

- Contracts use OpenZeppelin's audited libraries
- ReentrancyGuard on all state-changing functions
- Pausable for emergency stops
- ERC4626 standard for vault security

## Deployed Contracts

### Base Sepolia (Testnet)
- **MockUSDT**: `0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52`
- **LendingVault**: `0x63062Eb252dDA3291B4C1D6E4bc3Dd5a81F85a50`
- **Explorer**: https://sepolia.basescan.org/address/0x63062Eb252dDA3291B4C1D6E4bc3Dd5a81F85a50

### Base Mainnet (Production)
- **USDT**: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`
- **LendingVault**: (not yet deployed)

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
