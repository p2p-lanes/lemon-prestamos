import { ethers } from "ethers";
import * as dotenv from "dotenv";
import MockUSDTArtifact from "../artifacts/contracts/MockUSDT.sol/MockUSDT.json" assert { type: "json" };
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

async function main() {
  const vaultAddress = process.env.VAULT_ADDRESS!;
  const usdtAddress = process.env.MOCK_USDT_ADDRESS!;
  const amount = process.argv[2] || "5000";

  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const usdt = new ethers.Contract(usdtAddress, MockUSDTArtifact.abi, wallet);
  const vault = new ethers.Contract(vaultAddress, LendingVaultArtifact.abi, wallet);

  console.log(`Transferring ${amount} USDT to vault...`);

  const transferAmount = ethers.parseUnits(amount, 6);
  const tx = await usdt.transfer(vaultAddress, transferAmount);
  await tx.wait();

  console.log("✅ Transfer complete!");

  const totalAssets = await vault.totalAssets();
  console.log("Vault total assets:", ethers.formatUnits(totalAssets, 6), "USDT");
  console.log("Transaction hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
