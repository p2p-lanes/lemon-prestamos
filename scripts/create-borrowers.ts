import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

async function main() {
  const vaultAddress = process.env.VAULT_ADDRESS!;

  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Create borrower-1
  const borrower1 = ethers.Wallet.createRandom().connect(provider);
  console.log("Created borrower-1:");
  console.log("  Address:", borrower1.address);
  console.log("  Private Key:", borrower1.privateKey);

  // Create borrower-2
  const borrower2 = ethers.Wallet.createRandom().connect(provider);
  console.log("\nCreated borrower-2:");
  console.log("  Address:", borrower2.address);
  console.log("  Private Key:", borrower2.privateKey);

  // Save to .env file
  const envContent = fs.readFileSync('.env', 'utf-8');
  const updatedEnv = envContent + `\n# Borrower wallets\nBORROWER_1_PRIVATE_KEY=${borrower1.privateKey.slice(2)}\nBORROWER_2_PRIVATE_KEY=${borrower2.privateKey.slice(2)}\n`;
  fs.writeFileSync('.env', updatedEnv);

  console.log("\n✅ Wallets saved to .env file");

  // Now send some ETH for gas fees
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log("\nSending 0.001 ETH to each borrower for gas fees...");

  const tx1 = await deployer.sendTransaction({
    to: borrower1.address,
    value: ethers.parseEther("0.001")
  });
  await tx1.wait();
  console.log("✅ Sent ETH to borrower-1");

  const tx2 = await deployer.sendTransaction({
    to: borrower2.address,
    value: ethers.parseEther("0.001")
  });
  await tx2.wait();
  console.log("✅ Sent ETH to borrower-2");

  // Check their credit limits
  const vault = new ethers.Contract(vaultAddress, LendingVaultArtifact.abi, provider);

  const limit1 = await vault.getCreditLimit(borrower1.address);
  const limit2 = await vault.getCreditLimit(borrower2.address);

  console.log("\nCredit Limits:");
  console.log("  Borrower-1:", ethers.formatUnits(limit1, 6), "USDT");
  console.log("  Borrower-2:", ethers.formatUnits(limit2, 6), "USDT");

  console.log("\n✅ Borrower wallets created and funded!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
