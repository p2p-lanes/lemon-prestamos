import { expect } from "chai";
import { ethers } from "hardhat";
import { LendingVault, MockUSDT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("LendingVault", function () {
  let vault: LendingVault;
  let usdt: MockUSDT;
  let owner: SignerWithAddress;
  let liquidityProvider: SignerWithAddress;
  let borrower1: SignerWithAddress;
  let borrower2: SignerWithAddress;

  const INITIAL_CREDIT_LIMIT = ethers.parseUnits("5", 6); // 5 USDT
  const MINT_AMOUNT = ethers.parseUnits("10000", 6); // 10,000 USDT

  beforeEach(async function () {
    // Get signers
    [owner, liquidityProvider, borrower1, borrower2] = await ethers.getSigners();

    // Deploy MockUSDT
    const MockUSDTFactory = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDTFactory.deploy();
    await usdt.waitForDeployment();

    // Deploy LendingVault
    const LendingVaultFactory = await ethers.getContractFactory("LendingVault");
    vault = await LendingVaultFactory.deploy(await usdt.getAddress());
    await vault.waitForDeployment();

    // Mint USDT to liquidity provider and borrowers
    await usdt.mint(liquidityProvider.address, MINT_AMOUNT);
    await usdt.mint(borrower1.address, MINT_AMOUNT);
    await usdt.mint(borrower2.address, MINT_AMOUNT);

    // Bootstrap vault with 1 USDT (avoid ERC4626 first deposit issue)
    await usdt.transfer(await vault.getAddress(), ethers.parseUnits("1", 6));

    // Liquidity provider deposits 1000 USDT
    await usdt
      .connect(liquidityProvider)
      .approve(await vault.getAddress(), ethers.parseUnits("1000", 6));
    await vault
      .connect(liquidityProvider)
      .deposit(ethers.parseUnits("1000", 6), liquidityProvider.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should have correct initial state", async function () {
      expect(await vault.getTotalLoans()).to.equal(0);
      expect(await vault.getTotalDefaultedAmount()).to.equal(0);
    });
  });

  describe("Credit Limits", function () {
    it("Should have initial credit limit of 5 USDT", async function () {
      const limit = await vault.getCreditLimit(borrower1.address);
      expect(limit).to.equal(INITIAL_CREDIT_LIMIT);
    });

    it("Should allow owner to manually set credit limit", async function () {
      const newLimit = ethers.parseUnits("10", 6);
      await vault.setCreditLimit(borrower1.address, newLimit);
      expect(await vault.getCreditLimit(borrower1.address)).to.equal(newLimit);
    });
  });

  describe("Borrowing", function () {
    it("Should allow borrowing within credit limit", async function () {
      const borrowAmount = ethers.parseUnits("3", 6);
      await vault.connect(borrower1).borrow(borrowAmount);

      const loan = await vault.getActiveLoan(borrower1.address);
      expect(loan.principal).to.equal(borrowAmount);
      expect(loan.isActive).to.be.true;
      expect(loan.isRepaid).to.be.false;
      expect(loan.isDefaulted).to.be.false;
    });

    it("Should fail when borrowing exceeds credit limit", async function () {
      const borrowAmount = ethers.parseUnits("6", 6); // More than 5 USDT limit
      await expect(vault.connect(borrower1).borrow(borrowAmount)).to.be.revertedWith(
        "Exceeds credit limit"
      );
    });

    it("Should fail when active loan exists", async function () {
      await vault.connect(borrower1).borrow(ethers.parseUnits("3", 6));
      await expect(
        vault.connect(borrower1).borrow(ethers.parseUnits("2", 6))
      ).to.be.revertedWith("Active loan exists");
    });

    it("Should fail when vault has insufficient liquidity", async function () {
      // Borrow all available liquidity
      await vault.connect(borrower1).borrow(ethers.parseUnits("5", 6));

      // Set borrower2 to high credit limit
      await vault.setCreditLimit(borrower2.address, ethers.parseUnits("1000", 6));

      // Try to borrow more than available
      await expect(
        vault.connect(borrower2).borrow(ethers.parseUnits("1000", 6))
      ).to.be.revertedWith("Insufficient liquidity");
    });

    it("Should emit LoanIssued event", async function () {
      const borrowAmount = ethers.parseUnits("3", 6);
      await expect(vault.connect(borrower1).borrow(borrowAmount))
        .to.emit(vault, "LoanIssued")
        .withArgs(borrower1.address, 1, borrowAmount, await time.latest());
    });
  });

  describe("Repayment", function () {
    beforeEach(async function () {
      // Borrower1 borrows 3 USDT
      await vault.connect(borrower1).borrow(ethers.parseUnits("3", 6));
    });

    it("Should allow repaying loan", async function () {
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);

      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      const loan = await vault.getActiveLoan(borrower1.address);
      expect(loan.isActive).to.be.false;
    });

    it("Should increase credit limit by 20% after repayment", async function () {
      const oldLimit = await vault.getCreditLimit(borrower1.address);
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);

      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      const newLimit = await vault.getCreditLimit(borrower1.address);
      expect(newLimit).to.equal((oldLimit * 120n) / 100n);
    });

    it("Should fail when no active loan", async function () {
      await expect(vault.connect(borrower2).repay()).to.be.revertedWith("No active loan");
    });

    it("Should emit LoanRepaid event", async function () {
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      const principal = ethers.parseUnits("3", 6);
      const interest = repaymentAmount - principal;

      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);

      await expect(vault.connect(borrower1).repay())
        .to.emit(vault, "LoanRepaid")
        .withArgs(borrower1.address, 1, principal, interest, await time.latest());
    });
  });

  describe("Interest Calculation", function () {
    it("Should calculate correct interest for 10% APR (within 30 days)", async function () {
      const principal = ethers.parseUnits("5", 6);
      await vault.connect(borrower1).borrow(principal);

      // Move time forward 30 days
      await time.increase(30 * 24 * 60 * 60);

      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      const interest = repaymentAmount - principal;

      // Expected interest: 5 * 0.10 * (30/365) = 0.041095890 USDT
      const expectedInterest = (principal * 10n * 30n * 86400n) / (100n * 365n * 86400n);
      expect(interest).to.be.closeTo(expectedInterest, ethers.parseUnits("0.001", 6)); // Allow 0.001 USDT tolerance
    });

    it("Should calculate correct interest for 20% APR (after 30 days)", async function () {
      const principal = ethers.parseUnits("5", 6);
      await vault.connect(borrower1).borrow(principal);

      // Move time forward 60 days (past 30 day threshold)
      await time.increase(60 * 24 * 60 * 60);

      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      const interest = repaymentAmount - principal;

      // Expected interest: 5 * 0.20 * (60/365) = 0.164383561 USDT
      const expectedInterest = (principal * 20n * 60n * 86400n) / (100n * 365n * 86400n);
      expect(interest).to.be.closeTo(expectedInterest, ethers.parseUnits("0.001", 6));
    });

    it("Should return 0 when no active loan", async function () {
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      expect(repaymentAmount).to.equal(0);
    });
  });

  describe("Default Tracking", function () {
    beforeEach(async function () {
      // Borrower1 borrows 3 USDT
      await vault.connect(borrower1).borrow(ethers.parseUnits("3", 6));
    });

    it("Should allow owner to mark loan as defaulted", async function () {
      await vault.markAsDefaulted(borrower1.address);

      const loan = await vault.getActiveLoan(borrower1.address);
      expect(loan.isDefaulted).to.be.true;
      expect(loan.isActive).to.be.false;
    });

    it("Should update total defaulted amount", async function () {
      const principal = ethers.parseUnits("3", 6);
      await vault.markAsDefaulted(borrower1.address);

      const totalDefaulted = await vault.getTotalDefaultedAmount();
      expect(totalDefaulted).to.equal(principal);
    });

    it("Should reduce totalAssets when loan is defaulted", async function () {
      const totalAssetsBefore = await vault.totalAssets();
      const principal = ethers.parseUnits("3", 6);

      await vault.markAsDefaulted(borrower1.address);

      const totalAssetsAfter = await vault.totalAssets();
      expect(totalAssetsAfter).to.equal(totalAssetsBefore - principal);
    });

    it("Should emit LoanDefaulted event", async function () {
      const principal = ethers.parseUnits("3", 6);
      await expect(vault.markAsDefaulted(borrower1.address))
        .to.emit(vault, "LoanDefaulted")
        .withArgs(borrower1.address, 1, principal, await time.latest());
    });

    it("Should fail when marking non-existent loan as defaulted", async function () {
      await expect(vault.markAsDefaulted(borrower2.address)).to.be.revertedWith(
        "No active loan to default"
      );
    });

    it("Should fail when marking already defaulted loan", async function () {
      await vault.markAsDefaulted(borrower1.address);
      await expect(vault.markAsDefaulted(borrower1.address)).to.be.revertedWith(
        "No active loan to default"
      );
    });

    it("Should fail when non-owner tries to mark as defaulted", async function () {
      await expect(
        vault.connect(borrower1).markAsDefaulted(borrower1.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Defaulted Loan Repayment", function () {
    beforeEach(async function () {
      // Borrower1 borrows and loan is marked as defaulted
      await vault.connect(borrower1).borrow(ethers.parseUnits("3", 6));
      await vault.markAsDefaulted(borrower1.address);
    });

    it("Should allow repaying defaulted loan", async function () {
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);

      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repayDefaultedLoan();

      const loan = await vault.getActiveLoan(borrower1.address);
      expect(loan.isRepaid).to.be.true;
    });

    it("Should restore totalAssets when defaulted loan is repaid", async function () {
      const totalAssetsBefore = await vault.totalAssets();
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);

      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repayDefaultedLoan();

      const totalAssetsAfter = await vault.totalAssets();
      expect(totalAssetsAfter).to.be.greaterThan(totalAssetsBefore);
    });

    it("Should increase credit limit by 10% (not 20%) for defaulted loan repayment", async function () {
      const oldLimit = await vault.getCreditLimit(borrower1.address);
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);

      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repayDefaultedLoan();

      const newLimit = await vault.getCreditLimit(borrower1.address);
      expect(newLimit).to.equal((oldLimit * 110n) / 100n); // 10% increase
    });

    it("Should emit DefaultRecovered event", async function () {
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);

      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);

      await expect(vault.connect(borrower1).repayDefaultedLoan())
        .to.emit(vault, "DefaultRecovered")
        .withArgs(borrower1.address, 1, repaymentAmount, await time.latest());
    });

    it("Should remove from defaulted tracking when repaid", async function () {
      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);

      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repayDefaultedLoan();

      const totalDefaulted = await vault.getTotalDefaultedAmount();
      expect(totalDefaulted).to.equal(0);
    });
  });

  describe("Overdue Loans", function () {
    it("Should correctly identify overdue loans", async function () {
      await vault.connect(borrower1).borrow(ethers.parseUnits("3", 6));

      // Not overdue initially
      expect(await vault.isLoanOverdue(borrower1.address)).to.be.false;

      // Move time forward 91 days (past 90 day threshold)
      await time.increase(91 * 24 * 60 * 60);

      // Now overdue
      expect(await vault.isLoanOverdue(borrower1.address)).to.be.true;
    });

    it("Should return false for non-existent loans", async function () {
      expect(await vault.isLoanOverdue(borrower1.address)).to.be.false;
    });
  });

  describe("Multiple Borrow/Repay Cycles", function () {
    it("Should allow multiple borrow/repay cycles with increasing limits", async function () {
      // First cycle: borrow 5 USDT
      await vault.connect(borrower1).borrow(ethers.parseUnits("5", 6));
      let repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      let limit = await vault.getCreditLimit(borrower1.address);
      expect(limit).to.equal(ethers.parseUnits("6", 6)); // 5 * 1.2

      // Second cycle: borrow 6 USDT
      await vault.connect(borrower1).borrow(ethers.parseUnits("6", 6));
      repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      limit = await vault.getCreditLimit(borrower1.address);
      expect(limit).to.equal(ethers.parseUnits("7.2", 6)); // 6 * 1.2

      // Third cycle: borrow 7.2 USDT
      await vault.connect(borrower1).borrow(ethers.parseUnits("7.2", 6));
      repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      limit = await vault.getCreditLimit(borrower1.address);
      expect(limit).to.equal(ethers.parseUnits("8.64", 6)); // 7.2 * 1.2
    });
  });

  describe("ERC4626 Integration", function () {
    it("Should correctly track totalAssets with outstanding loans", async function () {
      const totalAssetsBefore = await vault.totalAssets();

      // Borrow 5 USDT
      await vault.connect(borrower1).borrow(ethers.parseUnits("5", 6));

      const totalAssetsAfter = await vault.totalAssets();
      // Total assets should remain the same (liquidity decreased, outstanding loans increased)
      expect(totalAssetsAfter).to.equal(totalAssetsBefore);
    });

    it("Should increase totalAssets when loan is repaid with interest", async function () {
      const totalAssetsBefore = await vault.totalAssets();

      await vault.connect(borrower1).borrow(ethers.parseUnits("5", 6));
      await time.increase(30 * 24 * 60 * 60); // 30 days

      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      const totalAssetsAfter = await vault.totalAssets();
      // Total assets should increase by the interest amount
      expect(totalAssetsAfter).to.be.greaterThan(totalAssetsBefore);
    });

    it("Should correctly calculate share value with loans", async function () {
      const sharesBefore = await vault.balanceOf(liquidityProvider.address);

      // Borrow and repay with interest
      await vault.connect(borrower1).borrow(ethers.parseUnits("5", 6));
      await time.increase(30 * 24 * 60 * 60);

      const repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      // Shares should be worth more now due to interest earned
      const totalAssets = await vault.totalAssets();
      const totalShares = await vault.totalSupply();
      const shareValue = (totalAssets * ethers.parseUnits("1", 18)) / totalShares;

      expect(shareValue).to.be.greaterThan(ethers.parseUnits("1", 18)); // 1:1 initially
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause contract", async function () {
      await vault.pause();
      await expect(
        vault.connect(borrower1).borrow(ethers.parseUnits("3", 6))
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("Should allow owner to unpause contract", async function () {
      await vault.pause();
      await vault.unpause();
      await vault.connect(borrower1).borrow(ethers.parseUnits("3", 6)); // Should succeed
    });

    it("Should allow owner to rescue funds", async function () {
      const rescueAmount = ethers.parseUnits("10", 6);
      await vault.rescueFunds(rescueAmount);

      const ownerBalance = await usdt.balanceOf(owner.address);
      expect(ownerBalance).to.be.greaterThanOrEqual(rescueAmount);
    });

    it("Should fail when non-owner tries admin functions", async function () {
      await expect(vault.connect(borrower1).pause()).to.be.revertedWithCustomError(
        vault,
        "OwnableUnauthorizedAccount"
      );

      await expect(
        vault.connect(borrower1).rescueFunds(ethers.parseUnits("10", 6))
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    it("Should return all loans", async function () {
      await vault.connect(borrower1).borrow(ethers.parseUnits("3", 6));
      await vault.connect(borrower2).borrow(ethers.parseUnits("4", 6));

      const allLoans = await vault.getAllLoans();
      expect(allLoans.length).to.equal(2);
    });

    it("Should return defaulted loans", async function () {
      await vault.connect(borrower1).borrow(ethers.parseUnits("3", 6));
      await vault.connect(borrower2).borrow(ethers.parseUnits("4", 6));

      await vault.markAsDefaulted(borrower1.address);

      const defaultedLoans = await vault.getDefaultedLoans();
      expect(defaultedLoans.length).to.equal(1);
      expect(defaultedLoans[0].borrower).to.equal(borrower1.address);
    });

    it("Should return user loan count", async function () {
      await vault.connect(borrower1).borrow(ethers.parseUnits("5", 6));
      let repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      expect(await vault.getUserLoanCount(borrower1.address)).to.equal(1);

      await vault.connect(borrower1).borrow(ethers.parseUnits("6", 6));
      repaymentAmount = await vault.calculateRepaymentAmount(borrower1.address);
      await usdt.connect(borrower1).approve(await vault.getAddress(), repaymentAmount);
      await vault.connect(borrower1).repay();

      expect(await vault.getUserLoanCount(borrower1.address)).to.equal(2);
    });
  });
});
