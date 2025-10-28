import { ethers } from "ethers";
import * as dotenv from "dotenv";
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

async function main() {
  const vaultAddress = process.env.VAULT_ADDRESS!;

  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const vault = new ethers.Contract(vaultAddress, LendingVaultArtifact.abi, provider);

  console.log("=".repeat(60));
  console.log("PRESTAMOS VAULT SUMMARY");
  console.log("=".repeat(60));

  // Vault stats
  const totalAssets = await vault.totalAssets();
  const totalLoans = await vault.getTotalLoans();

  console.log("\n📊 Vault Statistics:");
  console.log("  Total Assets:", ethers.formatUnits(totalAssets, 6), "USDT");
  console.log("  Total Loans Issued:", totalLoans.toString());

  // Get all loans
  console.log("\n📋 All Loans:");
  const allLoans = await vault.getAllLoans();

  for (let i = 0; i < allLoans.length; i++) {
    const loan = allLoans[i];
    console.log(`\n  Loan #${Number(loan.id) + 1}:`);
    console.log("    Borrower:", loan.borrower);
    console.log("    Principal:", ethers.formatUnits(loan.principal, 6), "USDT");
    console.log("    Timestamp:", new Date(Number(loan.timestamp) * 1000).toLocaleString());
    console.log("    Active:", loan.isActive);
    console.log("    Repaid:", loan.isRepaid);

    if (loan.isActive) {
      const repayAmount = await vault.calculateRepaymentAmount(loan.borrower);
      console.log("    Current Repayment:", ethers.formatUnits(repayAmount, 6), "USDT");
    }
  }

  // Borrower details
  console.log("\n👥 Borrowers:");

  const deployer = process.env.PRIVATE_KEY!;
  const borrower1Key = process.env.BORROWER_1_PRIVATE_KEY!;
  const borrower2Key = process.env.BORROWER_2_PRIVATE_KEY!;

  const borrower1Address = new ethers.Wallet(borrower1Key).address;
  const borrower2Address = new ethers.Wallet(borrower2Key).address;

  console.log("\n  Borrower-1:", borrower1Address);
  const limit1 = await vault.getCreditLimit(borrower1Address);
  const loan1 = await vault.getActiveLoan(borrower1Address);
  console.log("    Credit Limit:", ethers.formatUnits(limit1, 6), "USDT");
  console.log("    Has Active Loan:", loan1.isActive);

  console.log("\n  Borrower-2:", borrower2Address);
  const limit2 = await vault.getCreditLimit(borrower2Address);
  const loan2 = await vault.getActiveLoan(borrower2Address);
  console.log("    Credit Limit:", ethers.formatUnits(limit2, 6), "USDT");
  console.log("    Has Active Loan:", loan2.isActive);

  console.log("\n" + "=".repeat(60));
  console.log("View on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${vaultAddress}`);
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
