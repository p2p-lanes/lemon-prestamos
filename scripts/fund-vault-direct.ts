import { ethers } from "ethers";
import * as dotenv from "dotenv";
import MockUSDTArtifact from "../artifacts/contracts/MockUSDT.sol/MockUSDT.json" assert { type: "json" };
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

async function main() {
  const vaultAddress = process.env.VAULT_ADDRESS!;
  const usdtAddress = process.env.MOCK_USDT_ADDRESS!;

  // Get amount from command line args (default 1000)
  const depositAmount = process.argv[2] || "1000";

  console.log("Funding Vault on Base Sepolia");
  console.log("Amount:", depositAmount, "USDT");

  // Setup provider and wallet
  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log("Funding from account:", wallet.address);

  // Get contracts
  const usdt = new ethers.Contract(usdtAddress, MockUSDTArtifact.abi, wallet);
  const vault = new ethers.Contract(vaultAddress, LendingVaultArtifact.abi, wallet);

  // Convert amount to proper decimals (USDT has 6 decimals)
  const amount = ethers.parseUnits(depositAmount, 6);

  console.log(`\nDepositing ${depositAmount} USDT into vault...`);

  // Check balance
  const balance = await usdt.balanceOf(wallet.address);
  console.log("Your USDT balance:", ethers.formatUnits(balance, 6), "USDT");

  if (balance < amount) {
    console.log("\n❌ Insufficient USDT balance!");
    console.log("Minting test USDT...");
    const mintTx = await usdt.mint(wallet.address, depositAmount);
    await mintTx.wait();
    console.log("✅ Minted", depositAmount, "USDT");
  }

  // Approve vault to spend USDT
  console.log("\nApproving vault to spend USDT...");
  const approveTx = await usdt.approve(vaultAddress, amount);
  await approveTx.wait();
  console.log("✅ Approved");

  // Deposit into vault
  console.log("Depositing into vault...");
  const depositTx = await vault.deposit(amount, wallet.address);
  const receipt = await depositTx.wait();
  console.log("✅ Deposited!");

  // Get shares received
  const shares = await vault.balanceOf(wallet.address);
  console.log("\n✅ Success!");
  console.log("=====================");
  console.log("Deposited:", depositAmount, "USDT");
  console.log("Shares received:", ethers.formatUnits(shares, 18));
  console.log("Transaction hash:", receipt?.hash);

  // Get vault stats
  const totalAssets = await vault.totalAssets();
  console.log("\nVault Stats:");
  console.log("Total Assets:", ethers.formatUnits(totalAssets, 6), "USDT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
