# Deployed Contracts - Base Sepolia

## Contract Addresses

### MockUSDT (Test Token)
- **Address**: `0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52`
- **Network**: Base Sepolia (Chain ID: 84532)
- **Explorer**: https://sepolia.basescan.org/address/0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52

### LendingVault (Main Contract)
- **Address**: `0xE502D6A4919b6aC13427f75067D3F1df8852e640`
- **Network**: Base Sepolia (Chain ID: 84532)
- **Explorer**: https://sepolia.basescan.org/address/0xE502D6A4919b6aC13427f75067D3F1df8852e640

## Deployment Details

- **Deployer Address**: `0xa5570770b85B5356208B5c239a19aC45b08dD7CA`
- **Deployment Date**: October 25, 2025
- **Network RPC**: https://base-sepolia.g.alchemy.com/v2/riB9BhOYQqR-NEKNc6mr0`

## Contract Verification

To verify the contracts on BaseScan, use these commands:

```bash
# Verify MockUSDT
npx hardhat verify --network baseSepolia 0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52

# Verify LendingVault
npx hardhat verify --network baseSepolia 0xE502D6A4919b6aC13427f75067D3F1df8852e640 "0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52"
```

## Next Steps

1. ✅ **Contracts Deployed** - Both MockUSDT and LendingVault are live on Base Sepolia
2. ⏳ **Verify on BaseScan** - Make source code publicly viewable
3. ⏳ **Fund the Vault** - Deposit initial USDT liquidity
4. ⏳ **Test Borrowing** - Test the borrow/repay flow
5. ⏳ **Build Frontend** - Create the Lemon Cash mini app interface

## Testing the Contracts

### Get Test USDT

```javascript
// Using ethers.js or in Hardhat console
const usdt = await ethers.getContractAt("MockUSDT", "0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52");
await usdt.mint(yourAddress, 1000); // Mints 1000 USDT
```

### Fund the Vault

```bash
# Make sure VAULT_ADDRESS and MOCK_USDT_ADDRESS are set in .env
# Then run:
npx tsx scripts/fund-vault-direct.ts --network baseSepolia
```

### Test Borrowing

```javascript
const vault = await ethers.getContractAt("LendingVault", "0xE502D6A4919b6aC13427f75067D3F1df8852e640");

// Check credit limit (should be 5 USDT for new users)
const limit = await vault.getCreditLimit(yourAddress);
console.log("Credit Limit:", ethers.formatUnits(limit, 6), "USDT");

// Borrow 5 USDT
await vault.borrow(ethers.parseUnits("5", 6));

// Check repayment amount
const repayAmount = await vault.calculateRepaymentAmount(yourAddress);
console.log("To Repay:", ethers.formatUnits(repayAmount, 6), "USDT");

// Repay (need to approve first)
const usdt = await ethers.getContractAt("MockUSDT", "0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52");
await usdt.approve("0xE502D6A4919b6aC13427f75067D3F1df8852e640", repayAmount);
await vault.repay();
```

## Integration with Lemon Cash Mini App

Use these addresses in your frontend:

```typescript
// config.ts
export const contracts = {
  baseSepolia: {
    usdt: "0xcC25012adc65dF354bf6A154b32a5c2Ed3840D52",
    vault: "0xE502D6A4919b6aC13427f75067D3F1df8852e640",
  },
  // Add mainnet addresses when ready
  base: {
    usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    vault: "TBD",
  }
};
```

## Smart Contract Features

### LendingVault Functions

**Read-Only** (No gas fees):
- `getCreditLimit(address user)` - Get user's borrowing limit
- `getActiveLoan(address user)` - Get user's current loan
- `calculateRepaymentAmount(address user)` - Calculate amount owed
- `getAllLoans()` - Get all loans (for /activity page)
- `totalAssets()` - Total vault assets
- `balanceOf(address)` - Vault shares owned

**Write** (Requires gas):
- `borrow(uint256 amount)` - Borrow USDT
- `repay()` - Repay loan + interest
- `deposit(uint256 assets, address receiver)` - Deposit USDT (for liquidity providers)
- `withdraw(uint256 assets, address receiver, address owner)` - Withdraw USDT

### MockUSDT Functions

- `mint(address to, uint256 amount)` - Mint test USDT (anyone can call)
- `transfer(address to, uint256 amount)` - Transfer USDT
- `approve(address spender, uint256 amount)` - Approve spending
- `balanceOf(address account)` - Check balance

## Support

For issues:
1. Check contract on BaseScan explorer
2. Review transaction logs
3. Test functions in Hardhat console
4. Open GitHub issue if needed

---

**Status**: ✅ Deployed and Ready for Testing
**Last Updated**: October 25, 2025
