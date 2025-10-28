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

  console.log("Checking vault state...\n");

  // Check USDT balance
  const usdtBalance = await usdt.balanceOf(wallet.address);
  console.log("Your USDT balance:", ethers.formatUnits(usdtBalance, 6));

  // Check vault shares
  const vaultShares = await vault.balanceOf(wallet.address);
  console.log("Your vault shares:", ethers.formatUnits(vaultShares, 18));

  // Check total assets
  const totalAssets = await vault.totalAssets();
  console.log("Vault total assets:", ethers.formatUnits(totalAssets, 6), "USDT");

  // Check the underlying asset
  const asset = await vault.asset();
  console.log("\nVault asset address:", asset);
  console.log("Expected USDT address:", usdtAddress);
  console.log("Match:", asset.toLowerCase() === usdtAddress.toLowerCase());

  // Try to preview deposit
  try {
    const amount = ethers.parseUnits("100", 6);
    const previewShares = await vault.previewDeposit(amount);
    console.log("\nPreview deposit 100 USDT:");
    console.log("  Would receive shares:", ethers.formatUnits(previewShares, 18));
  } catch (e: any) {
    console.log("\nPreview deposit failed:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
