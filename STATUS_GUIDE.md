# Status Command Guide

The `npm run status` command provides a comprehensive, beautifully formatted dashboard of your Prestamos vault.

## Usage

```bash
npm run status
```

## What It Shows

### 📊 Quick Stats
- **Total Assets**: Total USDT in the vault (liquidity + outstanding loans)
- **Available Liquidity**: USDT available for new loans
- **Outstanding Loans**: Total amount currently borrowed
- **Utilization Rate**: Percentage of vault assets being used (borrowed/total)
- **Total Loans Issued**: Lifetime number of loans
- **Active Loans**: Current active loans

### 📜 Recent Loans
Shows the 5 most recent loan transactions with:
- Loan ID number
- Borrower address (shortened)
- Loan amount in USDT
- Relative timestamp ("7 mins ago", "2 hours ago", etc.)
- Status (Active, Repaid, or Defaulted)

### 💳 Active Loans Table
Displays all currently active loans in a table format:
- Loan ID
- Borrower address
- Principal amount
- Amount to repay (with interest)
- Status

### 👥 Borrowers
Shows all registered borrowers with:
- Address
- Current credit limit
- Currently borrowed amount
- Number of successful repayments

### 🔗 Contract Info
- Vault contract address
- USDT token address
- Direct link to view on BaseScan

## Features

### Color Coding
- 🟢 Green: Total assets and amounts
- 🔵 Blue: Liquidity information
- 🟡 Yellow: Outstanding loans
- 🟣 Magenta: Utilization metrics
- 🔵 Cyan: Contract-related info
- ⚪ Gray: Timestamps and secondary info

### Emojis for Quick Recognition
- 📊 Stats section
- 📜 Transaction history
- 💳 Active loans
- 👥 Borrowers
- 🔗 Contract information
- 📤 Loan issued
- ✅ Loan repaid
- 🔄 Active loan

### Smart Formatting
- **Currency**: All USDT amounts formatted with commas and 2 decimal places
- **Addresses**: Shortened to first 6 and last 4 characters
- **Timestamps**: Relative time for recent transactions, dates for older ones
- **Tables**: Clean ASCII table formatting with proper alignment

## Example Output

```
╔══════════════════════════════════════════════╗
║           PRESTAMOS - VAULT STATUS           ║
║           Base Sepolia Testnet               ║
╚══════════════════════════════════════════════╝

📊 QUICK STATS
┌──────────────────────────────────────────────┐
│ Total Assets:              16,001.00 USDT    │
│ Available Liquidity:       15,994.00 USDT    │
│ Outstanding Loans:              7.00 USDT    │
│ Utilization Rate:               0.04%        │
│ Total Loans Issued:                2         │
│ Active Loans:                      2         │
└──────────────────────────────────────────────┘

... (additional sections shown)
```

## When to Use

### Development
- After deploying contracts
- After funding the vault
- After loans are issued
- After repayments are made
- To check current vault health

### Monitoring
- Quick sanity check of vault state
- Verify loan amounts and borrowers
- Check utilization rates
- Monitor active vs completed loans

### Debugging
- Verify transactions went through
- Check borrower credit limits
- Confirm loan amounts
- Validate contract addresses

## Tips

1. **Run frequently** - It's fast and gives you instant insight into vault state
2. **Before transactions** - Check available liquidity before issuing loans
3. **After changes** - Confirm your actions had the expected effect
4. **Screenshot it** - Great for documentation and reporting

## Troubleshooting

### Connection Issues
If you see connection errors:
- Check your internet connection
- Verify ALCHEMY_API_KEY in `.env`
- Ensure Base Sepolia RPC is accessible

### Missing Data
If borrower data doesn't show:
- Verify BORROWER_1_PRIVATE_KEY and BORROWER_2_PRIVATE_KEY in `.env`
- Make sure borrower wallets have been created

### Wrong Network
Make sure your contracts are deployed to Base Sepolia and addresses in `.env` are correct.

## Related Commands

- `npx tsx scripts/borrow.ts 1 3` - Execute a loan
- `npx tsx scripts/simple-fund.ts 1000` - Fund the vault
- `npx tsx scripts/check-vault.ts` - Detailed vault inspection

---

**Pro Tip**: Run `npm run status` before and after every operation to see the changes in real-time!
