import { ethers } from "ethers";
import * as dotenv from "dotenv";
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };
import MockUSDTArtifact from "../artifacts/contracts/MockUSDT.sol/MockUSDT.json" assert { type: "json" };

dotenv.config();

async function main() {
  // Get borrower number from command line
  const borrowerNum = process.argv[2];

  if (!borrowerNum || (borrowerNum !== "1" && borrowerNum !== "2")) {
    console.error("Usage: npx tsx scripts/repay.ts <borrower-number>");
    console.error("Example: npx tsx scripts/repay.ts 1");
    process.exit(1);
  }

  const vaultAddress = process.env.VAULT_ADDRESS!;
  const usdtAddress = process.env.MOCK_USDT_ADDRESS!;

  // Get borrower private key
  const borrowerKey =
    borrowerNum === "1"
      ? process.env.BORROWER_1_PRIVATE_KEY!
      : process.env.BORROWER_2_PRIVATE_KEY!;

  if (!borrowerKey) {
    console.error(`BORROWER_${borrowerNum}_PRIVATE_KEY not found in .env`);
    process.exit(1);
  }

  // Setup provider and wallet
  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const borrowerWallet = new ethers.Wallet(borrowerKey, provider);

  console.log(`\n🔄 Repaying loan for Borrower-${borrowerNum}...`);
  console.log(`   Address: ${borrowerWallet.address}\n`);

  // Connect to contracts
  const vault = new ethers.Contract(
    vaultAddress,
    LendingVaultArtifact.abi,
    borrowerWallet
  );
  const usdt = new ethers.Contract(
    usdtAddress,
    MockUSDTArtifact.abi,
    borrowerWallet
  );

  // Get active loan
  const loan = await vault.getActiveLoan(borrowerWallet.address);

  if (!loan.isActive && !loan.isDefaulted) {
    console.error("❌ No active or defaulted loan to repay");
    process.exit(1);
  }

  // Calculate repayment amount
  const repaymentAmount = await vault.calculateRepaymentAmount(
    borrowerWallet.address
  );
  const principal = loan.principal;
  const interest = repaymentAmount - principal;

  console.log(`📊 Loan Details:`);
  console.log(`   Principal: ${ethers.formatUnits(principal, 6)} USDT`);
  console.log(`   Interest: ${ethers.formatUnits(interest, 6)} USDT`);
  console.log(`   Total to Repay: ${ethers.formatUnits(repaymentAmount, 6)} USDT`);
  console.log(
    `   Status: ${loan.isDefaulted ? "🔴 DEFAULTED" : "🔄 Active"}\n`
  );

  // Check USDT balance
  const usdtBalance = await usdt.balanceOf(borrowerWallet.address);
  console.log(
    `💰 USDT Balance: ${ethers.formatUnits(usdtBalance, 6)} USDT\n`
  );

  if (usdtBalance < repaymentAmount) {
    console.error(
      "❌ Insufficient USDT balance. Minting additional USDT...\n"
    );
    const mintAmount = repaymentAmount - usdtBalance + ethers.parseUnits("1", 6); // Extra 1 USDT buffer
    const mintTx = await usdt.mint(borrowerWallet.address, mintAmount);
    await mintTx.wait();
    console.log(`✅ Minted ${ethers.formatUnits(mintAmount, 6)} USDT\n`);
  }

  // Approve USDT
  console.log("🔓 Approving USDT...");
  const approveTx = await usdt.approve(vaultAddress, repaymentAmount);
  await approveTx.wait();
  console.log("✅ Approval confirmed\n");

  // Get old credit limit
  const oldLimit = await vault.getCreditLimit(borrowerWallet.address);

  // Repay loan
  console.log("💳 Repaying loan...");
  let repayTx;
  if (loan.isDefaulted) {
    repayTx = await vault.repayDefaultedLoan();
  } else {
    repayTx = await vault.repay();
  }
  const receipt = await repayTx.wait();
  console.log("✅ Repayment successful!\n");

  // Get new credit limit
  const newLimit = await vault.getCreditLimit(borrowerWallet.address);

  console.log(`📈 Credit Limit Updated:`);
  console.log(`   Old Limit: ${ethers.formatUnits(oldLimit, 6)} USDT`);
  console.log(`   New Limit: ${ethers.formatUnits(newLimit, 6)} USDT`);
  const increasePercent = loan.isDefaulted ? 10 : 20;
  console.log(`   Increase: ${increasePercent}%\n`);

  console.log(`🔗 Transaction: https://sepolia.basescan.org/tx/${receipt.hash}`);
  console.log("\n✅ Loan repaid successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
