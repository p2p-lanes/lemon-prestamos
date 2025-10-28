import { ethers } from "ethers";
import * as dotenv from "dotenv";
import MockUSDTArtifact from "../artifacts/contracts/MockUSDT.sol/MockUSDT.json" assert { type: "json" };
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

async function main() {
  const vaultAddress = process.env.VAULT_ADDRESS!;
  const usdtAddress = process.env.MOCK_USDT_ADDRESS!;

  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const usdt = new ethers.Contract(usdtAddress, MockUSDTArtifact.abi, wallet);
  const vault = new ethers.Contract(vaultAddress, LendingVaultArtifact.abi, wallet);

  console.log("Bootstrapping vault with initial deposit...\n");

  // Send 1 USDT directly to vault to bootstrap it
  console.log("Step 1: Sending 1 USDT directly to vault to avoid first deposit issue...");
  const bootstrapAmount = ethers.parseUnits("1", 6);
  const transferTx = await usdt.transfer(vaultAddress, bootstrapAmount);
  await transferTx.wait();
  console.log("✅ Bootstrap transfer complete");

  // Now try normal deposit
  console.log("\nStep 2: Depositing 1000 USDT through deposit function...");
  const depositAmount = ethers.parseUnits("1000", 6);

  // Approve
  console.log("Approving...");
  const approveTx = await usdt.approve(vaultAddress, depositAmount);
  await approveTx.wait();
  console.log("✅ Approved");

  // Deposit
  console.log("Depositing...");
  const depositTx = await vault.deposit(depositAmount, wallet.address);
  const receipt = await depositTx.wait();
  console.log("✅ Deposited!");

  // Check results
  const shares = await vault.balanceOf(wallet.address);
  const totalAssets = await vault.totalAssets();

  console.log("\n✅ Success!");
  console.log("===================");
  console.log("Shares received:", ethers.formatUnits(shares, 18));
  console.log("Vault total assets:", ethers.formatUnits(totalAssets, 6), "USDT");
  console.log("Transaction hash:", receipt?.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
