import { ethers } from "ethers";
import * as dotenv from "dotenv";
import MockUSDTArtifact from "../artifacts/contracts/MockUSDT.sol/MockUSDT.json" assert { type: "json" };

dotenv.config();

async function main() {
  const network = process.argv.includes("--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : "baseSepolia";

  console.log("Deploying MockUSDT to", network);

  // Setup provider and wallet
  const rpcUrl = network === "base"
    ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log("Deploying from:", wallet.address);

  // Deploy contract
  const factory = new ethers.ContractFactory(
    MockUSDTArtifact.abi,
    MockUSDTArtifact.bytecode,
    wallet
  );

  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("MockUSDT deployed to:", address);

  // Wait for confirmations
  console.log("Waiting for block confirmations...");
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    await deployTx.wait(5);
  }

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("MockUSDT Address:", address);
  console.log("\nSave this address to deploy the LendingVault!");
  console.log("\nTo verify on BaseScan, run:");
  console.log(`npx hardhat verify --network ${network} ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
