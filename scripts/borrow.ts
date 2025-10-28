import { ethers } from "ethers";
import * as dotenv from "dotenv";
import MockUSDTArtifact from "../artifacts/contracts/MockUSDT.sol/MockUSDT.json" assert { type: "json" };
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

async function main() {
  const vaultAddress = process.env.VAULT_ADDRESS!;
  const usdtAddress = process.env.MOCK_USDT_ADDRESS!;

  // Get borrower from args (1 or 2)
  const borrowerNum = process.argv[2] || "1";
  const amount = process.argv[3] || "3";

  const privateKey = borrowerNum === "1"
    ? process.env.BORROWER_1_PRIVATE_KEY!
    : process.env.BORROWER_2_PRIVATE_KEY!;

  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const borrower = new ethers.Wallet(privateKey, provider);

  const vault = new ethers.Contract(vaultAddress, LendingVaultArtifact.abi, borrower);
  const usdt = new ethers.Contract(usdtAddress, MockUSDTArtifact.abi, borrower);

  console.log(`Borrower-${borrowerNum} borrowing ${amount} USDT`);
  console.log("Address:", borrower.address);

  // Check credit limit
  const limit = await vault.getCreditLimit(borrower.address);
  console.log("Credit limit:", ethers.formatUnits(limit, 6), "USDT");

  // Check if already has a loan
  const activeLoan = await vault.getActiveLoan(borrower.address);
  if (activeLoan.isActive) {
    console.log("❌ Already has an active loan!");
    return;
  }

  // Borrow
  const borrowAmount = ethers.parseUnits(amount, 6);
  console.log("\nBorrowing...");
  const tx = await vault.borrow(borrowAmount);
  const receipt = await tx.wait();

  console.log("✅ Borrowed successfully!");
  console.log("Transaction hash:", receipt?.hash);

  // Check USDT balance
  const balance = await usdt.balanceOf(borrower.address);
  console.log("\nUSDT balance:", ethers.formatUnits(balance, 6), "USDT");

  // Check loan details
  const loan = await vault.getActiveLoan(borrower.address);
  console.log("\nLoan details:");
  console.log("  Loan ID:", loan.id.toString());
  console.log("  Principal:", ethers.formatUnits(loan.principal, 6), "USDT");
  console.log("  Timestamp:", new Date(Number(loan.timestamp) * 1000).toLocaleString());

  // Calculate repayment amount
  const repayAmount = await vault.calculateRepaymentAmount(borrower.address);
  console.log("  Current repayment amount:", ethers.formatUnits(repayAmount, 6), "USDT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
