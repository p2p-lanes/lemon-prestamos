# Quick Start Guide

## Ready to Deploy? Follow These Steps:

### 1. Setup (1 minute)
```bash
# Copy environment file
cp .env.example .env

# Edit .env and add your private key
# PRIVATE_KEY=your_key_here (without 0x)
```

### 2. Get Test ETH (2 minutes)
Visit: https://www.alchemy.com/faucets/base-sepolia

### 3. Deploy Everything (5 minutes)
```bash
# Deploy MockUSDT
npm run deploy:mock-usdt
# Copy the address → add to .env as MOCK_USDT_ADDRESS

# Deploy Vault
npm run deploy:vault:sepolia
# Copy the address → add to .env as VAULT_ADDRESS

# Fund the vault with test USDT
npm run fund:vault
```

### 4. Verify on BaseScan (2 minutes)
```bash
npx hardhat verify --network baseSepolia <MOCK_USDT_ADDRESS>
npx hardhat verify --network baseSepolia <VAULT_ADDRESS> "<MOCK_USDT_ADDRESS>"
```

## Done! 🎉

Your contracts are now live on Base Sepolia testnet.

### Contract Addresses to Use in Your Frontend:
- **USDT**: `<YOUR_MOCK_USDT_ADDRESS>`
- **Vault**: `<YOUR_VAULT_ADDRESS>`

### Next Steps:
1. Build the frontend mini app (Next.js)
2. Integrate with `@lemoncash/mini-app-sdk`
3. Test in Lemon mobile app
4. Deploy to Base mainnet when ready

---

## Key Functions for Frontend Integration

### For Users (Borrowing):
```typescript
// Check credit limit
const limit = await vault.getCreditLimit(userAddress);

// Borrow USDT
await vault.borrow(amount); // amount in USDT with 6 decimals

// Get active loan
const loan = await vault.getActiveLoan(userAddress);

// Calculate repayment amount
const repayAmount = await vault.calculateRepaymentAmount(userAddress);

// Repay loan (need to approve USDT first)
await usdt.approve(vaultAddress, repayAmount);
await vault.repay();
```

### For Activity Feed:
```typescript
// Get all loans for public activity page
const allLoans = await vault.getAllLoans();
```

### Read-Only Functions (No Gas):
```typescript
await vault.getCreditLimit(address)
await vault.getActiveLoan(address)
await vault.calculateRepaymentAmount(address)
await vault.getAllLoans()
await vault.getTotalLoans()
await vault.totalAssets()
```

---

## Testing the Contract

```bash
# Start Hardhat console
npx hardhat console --network baseSepolia

# In console:
const vault = await ethers.getContractAt("LendingVault", "YOUR_VAULT_ADDRESS");
const [signer] = await ethers.getSigners();

// Test borrow
await vault.borrow(ethers.parseUnits("5", 6));
console.log("Borrowed 5 USDT!");

// Check loan
const loan = await vault.getActiveLoan(await signer.getAddress());
console.log("Loan details:", loan);
```

---

## Troubleshooting

**"Module not found" errors?**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**"Insufficient funds"?**
- Get more Base Sepolia ETH from faucet

**Need help?**
- Check `DEPLOYMENT.md` for detailed guide
- Check `README.md` for full documentation
