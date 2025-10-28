import { ethers } from "ethers";
import * as dotenv from "dotenv";
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

async function main() {
  // Get borrower number from command line
  const borrowerNum = process.argv[2];

  if (!borrowerNum || (borrowerNum !== "1" && borrowerNum !== "2")) {
    console.error("Usage: npx tsx scripts/mark-defaulted.ts <borrower-number>");
    console.error("Example: npx tsx scripts/mark-defaulted.ts 1");
    process.exit(1);
  }

  const vaultAddress = process.env.VAULT_ADDRESS!;
  const deployerKey = process.env.PRIVATE_KEY!;

  // Get borrower address
  const borrowerKey =
    borrowerNum === "1"
      ? process.env.BORROWER_1_PRIVATE_KEY!
      : process.env.BORROWER_2_PRIVATE_KEY!;

  if (!borrowerKey) {
    console.error(`BORROWER_${borrowerNum}_PRIVATE_KEY not found in .env`);
    process.exit(1);
  }

  const borrowerAddress = new ethers.Wallet(borrowerKey).address;

  // Setup provider and deployer wallet (owner)
  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployerWallet = new ethers.Wallet(deployerKey, provider);

  console.log(`\n🔴 Marking loan as defaulted for Borrower-${borrowerNum}...`);
  console.log(`   Borrower Address: ${borrowerAddress}`);
  console.log(`   Owner Address: ${deployerWallet.address}\n`);

  // Connect to vault as owner
  const vault = new ethers.Contract(
    vaultAddress,
    LendingVaultArtifact.abi,
    deployerWallet
  );

  // Get active loan
  const loan = await vault.getActiveLoan(borrowerAddress);

  if (!loan.isActive) {
    console.error("❌ No active loan to mark as defaulted");
    process.exit(1);
  }

  if (loan.isDefaulted) {
    console.error("❌ Loan is already marked as defaulted");
    process.exit(1);
  }

  // Show loan details
  console.log(`📊 Loan Details:`);
  console.log(`   Loan ID: #${Number(loan.id) + 1}`);
  console.log(`   Principal: ${ethers.formatUnits(loan.principal, 6)} USDT`);
  const daysElapsed = Math.floor(
    (Date.now() / 1000 - Number(loan.timestamp)) / 86400
  );
  console.log(`   Days Since Borrowed: ${daysElapsed}`);

  // Check if overdue
  const isOverdue = await vault.isLoanOverdue(borrowerAddress);
  console.log(`   Is Overdue (>90 days): ${isOverdue ? "Yes" : "No"}\n`);

  // Get total assets before
  const totalAssetsBefore = await vault.totalAssets();
  console.log(
    `💰 Total Assets Before: ${ethers.formatUnits(totalAssetsBefore, 6)} USDT\n`
  );

  // Mark as defaulted
  console.log("⚠️  Marking loan as defaulted...");
  const tx = await vault.markAsDefaulted(borrowerAddress);
  const receipt = await tx.wait();
  console.log("✅ Loan marked as defaulted!\n");

  // Get total assets after
  const totalAssetsAfter = await vault.totalAssets();
  const totalDefaulted = await vault.getTotalDefaultedAmount();

  console.log(`📉 Impact on Vault:`);
  console.log(
    `   Total Assets Before: ${ethers.formatUnits(totalAssetsBefore, 6)} USDT`
  );
  console.log(
    `   Total Assets After: ${ethers.formatUnits(totalAssetsAfter, 6)} USDT`
  );
  console.log(
    `   Total Defaulted: ${ethers.formatUnits(totalDefaulted, 6)} USDT`
  );
  console.log(
    `   Reduction: ${ethers.formatUnits(totalAssetsBefore - totalAssetsAfter, 6)} USDT\n`
  );

  console.log(`🔗 Transaction: https://sepolia.basescan.org/tx/${receipt.hash}`);
  console.log("\n✅ Loan successfully marked as defaulted!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
