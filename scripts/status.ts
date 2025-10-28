import { ethers } from "ethers";
import * as dotenv from "dotenv";
import LendingVaultArtifact from "../artifacts/contracts/LendingVault.sol/LendingVault.json" assert { type: "json" };

dotenv.config();

// Terminal colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// Helper functions
function formatUSDT(amount: bigint): string {
  const formatted = ethers.formatUnits(amount, 6);
  const num = parseFloat(formatted);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTxHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-3)}`;
}

function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

function box(text: string, color: string = colors.white): void {
  const lines = text.split('\n');
  const maxLen = Math.max(...lines.map(l => l.length));

  console.log(color + "╔" + "═".repeat(maxLen + 2) + "╗" + colors.reset);
  lines.forEach(line => {
    console.log(color + "║ " + line.padEnd(maxLen) + " ║" + colors.reset);
  });
  console.log(color + "╚" + "═".repeat(maxLen + 2) + "╝" + colors.reset);
}

function section(title: string, content: string[]): void {
  console.log("\n" + colors.bright + title + colors.reset);
  console.log("┌" + "─".repeat(70) + "┐");
  content.forEach((line, idx) => {
    if (idx > 0 && line.startsWith("│")) {
      console.log("├" + "─".repeat(70) + "┤");
    }
    console.log(line);
  });
  console.log("└" + "─".repeat(70) + "┘");
}

async function main() {
  const vaultAddress = process.env.VAULT_ADDRESS!;
  const usdtAddress = process.env.MOCK_USDT_ADDRESS!;

  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const vault = new ethers.Contract(vaultAddress, LendingVaultArtifact.abi, provider);

  // Clear screen
  console.clear();

  // Header
  box(
    `           ${colors.cyan}PRESTAMOS - VAULT STATUS${colors.reset}\n` +
    `           ${colors.dim}Base Sepolia Testnet${colors.reset}`,
    colors.cyan
  );

  // Fetch data
  const totalAssets = await vault.totalAssets();
  const allLoans = await vault.getAllLoans();
  const totalLoansIssued = allLoans.length;

  // Calculate metrics
  let activeLoansCount = 0;
  let totalBorrowed = 0n;
  let defaultedLoansCount = 0;
  let totalDefaulted = 0n;

  for (const loan of allLoans) {
    if (loan.isActive && !loan.isRepaid && !loan.isDefaulted) {
      activeLoansCount++;
      totalBorrowed += loan.principal;
    } else if (loan.isDefaulted && !loan.isRepaid) {
      defaultedLoansCount++;
      totalDefaulted += loan.principal;
    }
  }

  const availableLiquidity = totalAssets - totalBorrowed;
  const utilizationRate = totalAssets > 0n
    ? (Number(totalBorrowed) / Number(totalAssets) * 100).toFixed(2)
    : "0.00";

  // Quick Stats
  console.log("\n" + colors.bright + "📊 QUICK STATS" + colors.reset);
  console.log("┌" + "─".repeat(70) + "┐");
  console.log(`│ ${colors.green}Total Assets:${colors.reset}        ${formatUSDT(totalAssets).padStart(15)} USDT`.padEnd(80) + "│");
  console.log(`│ ${colors.blue}Available Liquidity:${colors.reset} ${formatUSDT(availableLiquidity).padStart(15)} USDT`.padEnd(80) + "│");
  console.log(`│ ${colors.yellow}Outstanding Loans:${colors.reset}   ${formatUSDT(totalBorrowed).padStart(15)} USDT`.padEnd(80) + "│");
  console.log(`│ ${colors.magenta}Utilization Rate:${colors.reset}    ${utilizationRate.padStart(15)}%`.padEnd(80) + "│");
  console.log(`│ ${colors.cyan}Total Loans Issued:${colors.reset}  ${totalLoansIssued.toString().padStart(15)}`.padEnd(80) + "│");
  console.log(`│ ${colors.cyan}Active Loans:${colors.reset}        ${activeLoansCount.toString().padStart(15)}`.padEnd(80) + "│");
  console.log(`│ ${colors.red}Defaulted Loans:${colors.reset}     ${defaultedLoansCount.toString().padStart(15)}`.padEnd(80) + "│");
  console.log("└" + "─".repeat(70) + "┘");

  // Transaction History (from loans)
  if (allLoans.length > 0) {
    console.log("\n" + colors.bright + "📜 RECENT LOANS" + colors.reset);
    console.log("┌" + "─".repeat(70) + "┐");

    // Sort by timestamp descending (newest first)
    const sortedLoans = [...allLoans].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

    sortedLoans.slice(0, 5).forEach((loan, idx) => {
      if (idx > 0) {
        console.log("├" + "─".repeat(70) + "┤");
      }

      const status = loan.isRepaid
        ? "✅ Repaid"
        : (loan.isDefaulted ? "🔴 Defaulted" : (loan.isActive ? "🔄 Active" : "❌ Closed"));
      const emoji = loan.isRepaid ? "✅" : (loan.isDefaulted ? "🔴" : "📤");

      console.log(`│ ${emoji} ${colors.bright}Loan #${Number(loan.id) + 1}${colors.reset}`.padEnd(85) + "│");
      console.log(`│    Borrower: ${colors.cyan}${formatAddress(loan.borrower)}${colors.reset}`.padEnd(85) + "│");
      console.log(`│    Amount: ${colors.green}${formatUSDT(loan.principal)} USDT${colors.reset}`.padEnd(85) + "│");
      console.log(`│    Time: ${colors.gray}${formatTimestamp(loan.timestamp)}${colors.reset}`.padEnd(85) + "│");
      console.log(`│    Status: ${status}`.padEnd(85) + "│");
    });

    console.log("└" + "─".repeat(70) + "┘");
  }

  // Active Loans Table
  if (activeLoansCount > 0) {
    console.log("\n" + colors.bright + "💳 ACTIVE LOANS" + colors.reset);
    console.log("┌" + "─".repeat(8) + "┬" + "─".repeat(18) + "┬" + "─".repeat(12) + "┬" + "─".repeat(12) + "┬" + "─".repeat(10) + "┐");
    console.log(`│ ${"ID".padEnd(6)} │ ${"Borrower".padEnd(16)} │ ${"Principal".padEnd(10)} │ ${"To Repay".padEnd(10)} │ ${"Status".padEnd(8)} │`);
    console.log("├" + "─".repeat(8) + "┼" + "─".repeat(18) + "┼" + "─".repeat(12) + "┼" + "─".repeat(12) + "┼" + "─".repeat(10) + "┤");

    for (const loan of allLoans) {
      if (loan.isActive && !loan.isRepaid) {
        const repayAmount = await vault.calculateRepaymentAmount(loan.borrower);
        const loanId = `#${Number(loan.id) + 1}`;
        const borrower = formatAddress(loan.borrower);
        const principal = formatUSDT(loan.principal);
        const toRepay = formatUSDT(repayAmount);
        const status = "Active";

        console.log(`│ ${loanId.padEnd(6)} │ ${borrower.padEnd(16)} │ ${principal.padStart(10)} │ ${toRepay.padStart(10)} │ ${status.padEnd(8)} │`);
      }
    }

    console.log("└" + "─".repeat(8) + "┴" + "─".repeat(18) + "┴" + "─".repeat(12) + "┴" + "─".repeat(12) + "┴" + "─".repeat(10) + "┘");
  }

  // Defaulted Loans Table
  if (defaultedLoansCount > 0) {
    console.log("\n" + colors.bright + "🔴 DEFAULTED LOANS" + colors.reset);
    console.log("┌" + "─".repeat(8) + "┬" + "─".repeat(18) + "┬" + "─".repeat(12) + "┬" + "─".repeat(12) + "┬" + "─".repeat(12) + "┐");
    console.log(`│ ${"ID".padEnd(6)} │ ${"Borrower".padEnd(16)} │ ${"Principal".padEnd(10)} │ ${"Overdue".padEnd(10)} │ ${"To Repay".padEnd(10)} │`);
    console.log("├" + "─".repeat(8) + "┼" + "─".repeat(18) + "┼" + "─".repeat(12) + "┼" + "─".repeat(12) + "┼" + "─".repeat(12) + "┤");

    for (const loan of allLoans) {
      if (loan.isDefaulted && !loan.isRepaid) {
        const repayAmount = await vault.calculateRepaymentAmount(loan.borrower);
        const loanId = `#${Number(loan.id) + 1}`;
        const borrower = formatAddress(loan.borrower);
        const principal = formatUSDT(loan.principal);
        const daysOverdue = Math.floor((Date.now() / 1000 - Number(loan.timestamp)) / 86400);
        const overdue = `${daysOverdue} days`;
        const toRepay = formatUSDT(repayAmount);

        console.log(`│ ${loanId.padEnd(6)} │ ${borrower.padEnd(16)} │ ${principal.padStart(10)} │ ${overdue.padStart(10)} │ ${toRepay.padStart(10)} │`);
      }
    }

    console.log("└" + "─".repeat(8) + "┴" + "─".repeat(18) + "┴" + "─".repeat(12) + "┴" + "─".repeat(12) + "┴" + "─".repeat(12) + "┘");
  }

  // Borrowers
  const borrower1Key = process.env.BORROWER_1_PRIVATE_KEY;
  const borrower2Key = process.env.BORROWER_2_PRIVATE_KEY;

  if (borrower1Key && borrower2Key) {
    const borrower1Address = new ethers.Wallet(borrower1Key).address;
    const borrower2Address = new ethers.Wallet(borrower2Key).address;

    console.log("\n" + colors.bright + "👥 BORROWERS" + colors.reset);
    console.log("┌" + "─".repeat(20) + "┬" + "─".repeat(12) + "┬" + "─".repeat(12) + "┬" + "─".repeat(12) + "┐");
    console.log(`│ ${"Address".padEnd(18)} │ ${"Limit".padEnd(10)} │ ${"Borrowed".padEnd(10)} │ ${"Repayments".padEnd(10)} │`);
    console.log("├" + "─".repeat(20) + "┼" + "─".repeat(12) + "┼" + "─".repeat(12) + "┼" + "─".repeat(12) + "┤");

    // Borrower 1
    const limit1 = await vault.getCreditLimit(borrower1Address);
    const loan1 = await vault.getActiveLoan(borrower1Address);
    const repayments1 = await vault.getUserLoanCount(borrower1Address);
    const borrowed1 = loan1.isActive ? loan1.principal : 0n;

    console.log(`│ ${formatAddress(borrower1Address).padEnd(18)} │ ${formatUSDT(limit1).padStart(10)} │ ${formatUSDT(borrowed1).padStart(10)} │ ${repayments1.toString().padStart(10)} │`);

    // Borrower 2
    const limit2 = await vault.getCreditLimit(borrower2Address);
    const loan2 = await vault.getActiveLoan(borrower2Address);
    const repayments2 = await vault.getUserLoanCount(borrower2Address);
    const borrowed2 = loan2.isActive ? loan2.principal : 0n;

    console.log(`│ ${formatAddress(borrower2Address).padEnd(18)} │ ${formatUSDT(limit2).padStart(10)} │ ${formatUSDT(borrowed2).padStart(10)} │ ${repayments2.toString().padStart(10)} │`);

    console.log("└" + "─".repeat(20) + "┴" + "─".repeat(12) + "┴" + "─".repeat(12) + "┴" + "─".repeat(12) + "┘");
  }

  // Contract Info
  console.log("\n" + colors.bright + "🔗 CONTRACT INFO" + colors.reset);
  console.log(`   ${colors.dim}Vault:${colors.reset} ${vaultAddress}`);
  console.log(`   ${colors.dim}USDT:${colors.reset}  ${usdtAddress}`);
  console.log(`   ${colors.dim}View:${colors.reset}  ${colors.blue}https://sepolia.basescan.org/address/${vaultAddress}${colors.reset}`);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
