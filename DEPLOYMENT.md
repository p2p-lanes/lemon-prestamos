# Deployment Guide

Step-by-step guide to deploy Prestamos to Base Sepolia and Base Mainnet.

## Prerequisites

1. **Get Base Sepolia ETH**
   - Visit: https://www.alchemy.com/faucets/base-sepolia
   - Request testnet ETH for gas fees

2. **Set up your private key**
   - Create `.env` file: `cp .env.example .env`
   - Add your private key (without 0x prefix)
   - **NEVER commit .env to git!**

## Base Sepolia Deployment (Testnet)

### Step 1: Deploy MockUSDT

```bash
npm run deploy:mock-usdt
```

**Expected Output:**
```
Deploying MockUSDT to baseSepolia
MockUSDT deployed to: 0x123...
```

**Action:** Copy the address and add to `.env`:
```env
MOCK_USDT_ADDRESS=0x123...
```

### Step 2: Verify MockUSDT on BaseScan

```bash
npx hardhat verify --network baseSepolia <MOCK_USDT_ADDRESS>
```

### Step 3: Deploy LendingVault

```bash
npm run deploy:vault:sepolia
```

**Expected Output:**
```
Deploying LendingVault to baseSepolia
Using Mock USDT: 0x123...
LendingVault deployed to: 0x456...
```

**Action:** Copy the address and add to `.env`:
```env
VAULT_ADDRESS=0x456...
```

### Step 4: Verify LendingVault on BaseScan

```bash
npx hardhat verify --network baseSepolia <VAULT_ADDRESS> "<MOCK_USDT_ADDRESS>"
```

### Step 5: Fund the Vault with Initial Liquidity

```bash
# Optional: Set custom amount in .env
DEPOSIT_AMOUNT=1000

npm run fund:vault
```

**This will:**
1. Mint test USDT to your wallet (if needed)
2. Approve the vault to spend USDT
3. Deposit USDT and receive vault shares

### Step 6: Test Borrowing

You can test the borrow function from Hardhat console:

```bash
npx hardhat console --network baseSepolia
```

```javascript
const vault = await ethers.getContractAt("LendingVault", "VAULT_ADDRESS");
const usdt = await ethers.getContractAt("MockUSDT", "MOCK_USDT_ADDRESS");

// Check credit limit
const limit = await vault.getCreditLimit(await signer.getAddress());
console.log("Credit limit:", ethers.formatUnits(limit, 6), "USDT");

// Borrow 5 USDT
await vault.borrow(ethers.parseUnits("5", 6));

// Check active loan
const loan = await vault.getActiveLoan(await signer.getAddress());
console.log("Loan:", loan);

// Check repayment amount
const repayAmount = await vault.calculateRepaymentAmount(await signer.getAddress());
console.log("To repay:", ethers.formatUnits(repayAmount, 6), "USDT");

// Repay (after some time)
await usdt.approve(vaultAddress, repayAmount);
await vault.repay();
```

### Step 7: Update README with Deployed Addresses

Update the README.md file with your deployed contract addresses under "Deployed Contracts > Base Sepolia".

---

## Base Mainnet Deployment (Production)

### ⚠️ Warning
- This uses **real USDT** and **real ETH**
- Double-check all addresses
- Consider using a multisig wallet for ownership
- Audit contracts before mainnet deployment

### Step 1: Get Base ETH for Gas

You'll need ETH on Base mainnet for deployment gas fees.

### Step 2: Acquire Real USDT

The vault will use real USDT at: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`

You need USDT to provide initial liquidity.

### Step 3: Deploy LendingVault

```bash
npm run deploy:vault:mainnet
```

**Expected Output:**
```
Deploying LendingVault to base
Using Base Mainnet USDT: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
LendingVault deployed to: 0x789...
```

### Step 4: Verify on BaseScan

```bash
npx hardhat verify --network base <VAULT_ADDRESS> "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
```

### Step 5: Fund the Vault

**Manual funding recommended for mainnet:**

1. Get the real USDT contract on Base
2. Approve vault to spend your USDT
3. Call `vault.deposit(amount, yourAddress)`

```javascript
// From Hardhat console or your preferred method
const usdt = await ethers.getContractAt("IERC20", "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2");
const vault = await ethers.getContractAt("LendingVault", "VAULT_ADDRESS");

const amount = ethers.parseUnits("10000", 6); // 10,000 USDT
await usdt.approve(vaultAddress, amount);
await vault.deposit(amount, yourAddress);
```

### Step 6: Update Frontend

Update your Lemon Cash mini app frontend with the mainnet contract addresses.

### Step 7: Submit to Lemon Cash

Submit your mini app to Lemon Cash for review and inclusion in their app.

---

## Troubleshooting

### "Insufficient funds" Error
- Make sure you have enough ETH for gas fees
- Get testnet ETH from faucet (for Sepolia)

### "MOCK_USDT_ADDRESS not set"
- Make sure you deployed MockUSDT first
- Add the address to your `.env` file

### "Invalid signature" on verification
- Wait a few blocks before verifying
- Make sure you're using the correct constructor arguments
- Check network name matches (baseSepolia vs base)

### Compilation errors
- Make sure you're using Node.js v22 or later
- Run `npm run clean` then `npm run compile`

---

## Security Checklist (Before Mainnet)

- [ ] Contracts compiled without warnings
- [ ] All functions tested on testnet
- [ ] Contract verified on BaseScan
- [ ] Owner address is secure (consider multisig)
- [ ] Initial liquidity amount decided
- [ ] Emergency pause mechanism tested
- [ ] Consider professional audit for production

---

## Deployed Contract Addresses

### Base Sepolia (Testnet)
- **MockUSDT**: (Add after deployment)
- **LendingVault**: (Add after deployment)
- **Deployer**: (Your address)

### Base Mainnet (Production)
- **USDT**: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
- **LendingVault**: (Add after deployment)
- **Deployer**: (Your address)
- **Initial Liquidity**: (Amount deposited)

---

## Next Steps

After successful deployment:

1. ✅ Test all functions on testnet
2. ✅ Build frontend mini app
3. ✅ Integrate with Lemon SDK
4. ✅ Test in Lemon mobile app
5. ✅ Deploy to mainnet
6. ✅ Submit to Lemon for approval
