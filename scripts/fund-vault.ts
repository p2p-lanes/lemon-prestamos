import hre from "hardhat";

async function main() {
  console.log("Funding Vault on", hre.network.name);

  const vaultAddress = process.env.VAULT_ADDRESS;
  const usdtAddress = process.env.USDT_ADDRESS || process.env.MOCK_USDT_ADDRESS;
  const depositAmount = process.env.DEPOSIT_AMOUNT || "1000"; // Default 1000 USDT

  if (!vaultAddress || !usdtAddress) {
    console.error("\n❌ Error: Missing required environment variables!");
    console.log("Please set in your .env file:");
    console.log("- VAULT_ADDRESS=<vault-contract-address>");
    console.log("- USDT_ADDRESS=<usdt-contract-address> (or MOCK_USDT_ADDRESS for testnet)");
    console.log("- DEPOSIT_AMOUNT=<amount> (optional, defaults to 1000)");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Funding from account:", deployer.address);

  // Get contracts
  const usdt = await hre.ethers.getContractAt("MockUSDT", usdtAddress);
  const vault = await hre.ethers.getContractAt("LendingVault", vaultAddress);

  // Convert amount to proper decimals (USDT has 6 decimals)
  const amount = hre.ethers.parseUnits(depositAmount, 6);

  console.log(`\nDepositing ${depositAmount} USDT into vault...`);

  // Check balance
  const balance = await usdt.balanceOf(deployer.address);
  console.log("Your USDT balance:", hre.ethers.formatUnits(balance, 6), "USDT");

  if (balance < amount) {
    console.error("❌ Insufficient USDT balance!");

    if (hre.network.name === "baseSepolia") {
      console.log("\nMinting test USDT...");
      const mintTx = await usdt.mint(deployer.address, depositAmount);
      await mintTx.wait();
      console.log("✅ Minted", depositAmount, "USDT");
    } else {
      console.log("Please acquire USDT first");
      process.exit(1);
    }
  }

  // Approve vault to spend USDT
  console.log("Approving vault to spend USDT...");
  const approveTx = await usdt.approve(vaultAddress, amount);
  await approveTx.wait();
  console.log("✅ Approved");

  // Deposit into vault
  console.log("Depositing into vault...");
  const depositTx = await vault.deposit(amount, deployer.address);
  const receipt = await depositTx.wait();
  console.log("✅ Deposited!");

  // Get shares received
  const shares = await vault.balanceOf(deployer.address);
  console.log("\n✅ Success!");
  console.log("=====================");
  console.log("Deposited:", depositAmount, "USDT");
  console.log("Shares received:", hre.ethers.formatUnits(shares, 18));
  console.log("Transaction hash:", receipt?.hash);

  // Get vault stats
  const totalAssets = await vault.totalAssets();
  console.log("\nVault Stats:");
  console.log("Total Assets:", hre.ethers.formatUnits(totalAssets, 6), "USDT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
