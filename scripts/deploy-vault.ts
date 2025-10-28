import hre from "hardhat";

async function main() {
  console.log("Deploying LendingVault to", hre.network.name);

  // Get USDT address based on network
  let usdtAddress: string;

  if (hre.network.name === "base") {
    // Base Mainnet USDT
    usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
    console.log("Using Base Mainnet USDT:", usdtAddress);
  } else if (hre.network.name === "baseSepolia") {
    // You need to provide the MockUSDT address you deployed
    // Replace this with your deployed MockUSDT address
    usdtAddress = process.env.MOCK_USDT_ADDRESS || "";

    if (!usdtAddress) {
      console.error(
        "\n❌ Error: MOCK_USDT_ADDRESS not set in .env file!"
      );
      console.log(
        "Please deploy MockUSDT first using: npm run deploy:mock-usdt"
      );
      console.log("Then set MOCK_USDT_ADDRESS=<address> in your .env file");
      process.exit(1);
    }

    console.log("Using Mock USDT:", usdtAddress);
  } else {
    console.error("❌ Unsupported network:", hre.network.name);
    process.exit(1);
  }

  // Deploy LendingVault
  const LendingVault = await hre.ethers.getContractFactory("LendingVault");
  const vault = await LendingVault.deploy(usdtAddress);

  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("LendingVault deployed to:", address);

  // Wait for block confirmations
  console.log("Waiting for block confirmations...");
  await vault.deploymentTransaction()?.wait(5);

  console.log("\n✅ Deployment Summary:");
  console.log("=====================");
  console.log("Network:", hre.network.name);
  console.log("USDT Address:", usdtAddress);
  console.log("LendingVault Address:", address);
  console.log("\nTo verify on BaseScan, run:");
  console.log(
    `npx hardhat verify --network ${hre.network.name} ${address} "${usdtAddress}"`
  );

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
