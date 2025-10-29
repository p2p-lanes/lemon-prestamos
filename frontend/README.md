# Prestamos - Lemon Cash Mini App

Uncollateralized USDT lending protocol built as a Lemon Cash Mini App on Base blockchain.

## Features

- **Sign In With Ethereum (SIWE)**: Secure wallet authentication with backend verification
- **Credit-based Lending**: Dynamic credit limits that grow with successful repayments
- **Smart Contract Integration**: Direct interaction with lending vault on Base Sepolia
- **4 Main Screens**:
  - `/home` - Borrow USDT with credit meter and amount input
  - `/repay` - Two-step repayment flow (approve + repay)
  - `/activity` - Loan history with filters and statistics
  - `/profile` - Credit score and account statistics

## Tech Stack

- **Next.js 14** - App Router, TypeScript, Server Components
- **Lemon Cash SDK** - WebView communication with Lemon mobile app
- **ethers.js v6** - Blockchain data reading
- **viem** - SIWE signature verification
- **shadcn/ui** - Component library (Radix UI + Tailwind CSS)
- **Base Sepolia** - Testnet deployment

## Smart Contracts

- **Vault**: `0x63062Eb252dDA3291B4C1D6E4bc3Dd5a81F85a50`
- **USDT**: `0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52`
- **Network**: Base Sepolia (Chain ID: 84532)

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Environment Variables

No environment variables needed - all contract addresses are hardcoded for Base Sepolia.

For production deployment to Base Mainnet, update `ACTIVE_NETWORK` in `lib/contracts.ts`.

## Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend/`
3. Deploy with default settings (Next.js detected automatically)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/p2p-lanes/lemon-prestamos/tree/main/frontend)

## Testing in Lemon Cash

1. Deploy to Vercel
2. Get your deployment URL (e.g., `https://prestamos.vercel.app`)
3. Register your Mini App in Lemon Cash developer portal
4. Test in the Lemon Cash mobile app

**Important**: Deposits are blocked on testnet. Use [Circle's USDC Faucet](https://faucet.circle.com/) to get testnet USDT instead.

## Project Structure

```
frontend/
├── app/
│   ├── home/         # Borrow screen
│   ├── repay/        # Repayment screen
│   ├── activity/     # Loan history
│   ├── profile/      # User stats
│   └── api/auth/     # SIWE authentication
├── lib/
│   ├── contracts.ts  # Contract ABIs and addresses
│   ├── blockchain.ts # ethers.js setup and helpers
│   ├── lemon-sdk.ts  # Lemon SDK wrappers
│   └── wallet-context.tsx # Global wallet state
├── hooks/
│   └── use-loan-data.ts # Custom hook for loan data
└── components/ui/    # shadcn/ui components
```

## Authentication Flow

1. User opens app in Lemon Cash
2. Frontend requests nonce from `/api/auth/nonce`
3. Lemon SDK signs SIWE message with nonce
4. Frontend verifies signature at `/api/auth/verify`
5. Backend validates nonce and signature
6. User is authenticated

## Lending Mechanics

- **Initial Credit Limit**: 50 USDT
- **Base APR**: 10% (first 30 days)
- **Overdue APR**: 20% (after 30 days)
- **Credit Increase**: +20% per successful repayment
- **Minimum Loan Duration**: 7 days (prevents gaming the system)
- **Default Threshold**: 30 days overdue

## Security Notes

- **SIWE**: Frontend authentication only, cannot prevent direct smart contract access
- **Production**: Add whitelist to smart contract before mainnet deployment
- **Nonce Storage**: In-memory Map for MVP (use Redis for production)

## Learn More

- [Lemon Cash Mini Apps Documentation](https://lemoncash.mintlify.app/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Base Network](https://base.org/)
