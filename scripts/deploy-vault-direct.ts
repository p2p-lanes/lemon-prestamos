import { ethers } from "ethers";
import * as dotenv from "dotenv";
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

async function main() {
  const network = process.argv.includes("--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : "baseSepolia";

  console.log("Deploying LendingVault to", network);

  // Get USDT address based on network
  let usdtAddress: string;

  if (network === "base") {
    // Base Mainnet USDT
    usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
    console.log("Using Base Mainnet USDT:", usdtAddress);
  } else if (network === "baseSepolia") {
    usdtAddress = process.env.MOCK_USDT_ADDRESS || "";

    if (!usdtAddress) {
      console.error("\n❌ Error: MOCK_USDT_ADDRESS not set in .env file!");
      console.log("Please deploy MockUSDT first");
      console.log("Then set MOCK_USDT_ADDRESS=<address> in your .env file");
      process.exit(1);
    }

    console.log("Using Mock USDT:", usdtAddress);
  } else {
    console.error("❌ Unsupported network:", network);
    process.exit(1);
  }

  // Setup provider and wallet
  const rpcUrl = network === "base"
    ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log("Deploying from:", wallet.address);

  // Deploy contract
  const factory = new ethers.ContractFactory(
    LendingVaultArtifact.abi,
    LendingVaultArtifact.bytecode,
    wallet
  );

  const contract = await factory.deploy(usdtAddress);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("LendingVault deployed to:", address);

  // Wait for confirmations
  console.log("Waiting for block confirmations...");
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    await deployTx.wait(5);
  }

  console.log("\n✅ Deployment Summary:");
  console.log("=====================");
  console.log("Network:", network);
  console.log("USDT Address:", usdtAddress);
  console.log("LendingVault Address:", address);
  console.log("\nTo verify on BaseScan, run:");
  console.log(`npx hardhat verify --network ${network} ${address} "${usdtAddress}"`);

  console.log("\n📝 Next Steps:");
  console.log("1. Verify the contract on BaseScan (see command above)");
  console.log("2. Deposit USDT into the vault to provide initial liquidity");
  console.log("3. Update your frontend with the contract address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
