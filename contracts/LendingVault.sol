// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LendingVault
 * @dev ERC4626 vault with uncollateralized lending functionality
 * @notice Allows users to deposit USDT to earn yield and borrow USDT based on credit limits
 */
contract LendingVault is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant INITIAL_CREDIT_LIMIT = 5 * 10 ** 6; // 5 USDT (6 decimals)
    uint256 public constant CREDIT_INCREASE_FACTOR = 120; // 120% = 1.20x increase
    uint256 public constant FACTOR_DENOMINATOR = 100;
    uint256 public constant BASE_APR = 10; // 10% APR
    uint256 public constant PUNITIVE_APR = 20; // 20% APR for late repayment
    uint256 public constant LOAN_DURATION = 30 days;
    uint256 public constant DEFAULT_THRESHOLD = 30 days; // Loan defaults after 30 days
    uint256 public constant MIN_LOAN_DURATION = 7 days; // Minimum time before repayment (prevents gaming)
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant PRECISION = 1e18;

    // Structs
    struct Loan {
        uint256 id;
        address borrower;
        uint256 principal;
        uint256 timestamp;
        bool isActive;
        bool isRepaid;
        bool isDefaulted;
    }

    // State variables
    uint256 private _nextLoanId;
    uint256 private _totalDefaultedAmount;
    mapping(address => uint256) public creditLimits;
    mapping(address => uint256) public successfulRepayments;
    mapping(address => Loan) public activeLoans;
    mapping(uint256 => Loan) public allLoans;

    // Events
    event LiquidityDeposited(
        address indexed provider,
        uint256 amount,
        uint256 shares
    );
    event LiquidityWithdrawn(
        address indexed provider,
        uint256 amount,
        uint256 shares
    );
    event LoanIssued(
        address indexed borrower,
        uint256 indexed loanId,
        uint256 amount,
        uint256 timestamp
    );
    event LoanRepaid(
        address indexed borrower,
        uint256 indexed loanId,
        uint256 principal,
        uint256 interest,
        uint256 timestamp
    );
    event CreditLimitUpdated(
        address indexed user,
        uint256 oldLimit,
        uint256 newLimit
    );
    event LoanDefaulted(
        address indexed borrower,
        uint256 indexed loanId,
        uint256 principal,
        uint256 timestamp
    );
    event DefaultRecovered(
        address indexed borrower,
        uint256 indexed loanId,
        uint256 repaymentAmount,
        uint256 timestamp
    );

    constructor(
        IERC20 _asset
    )
        ERC20("Prestamos Vault Shares", "pvUSDT")
        ERC4626(_asset)
        Ownable(msg.sender)
    {
        _nextLoanId = 1;
    }

    // ===========================================
    // Vault Functions (ERC4626 + Custom Logic)
    // ===========================================

    /**
     * @dev Deposit assets and receive vault shares
     */
    function deposit(
        uint256 assets,
        address receiver
    ) public override whenNotPaused nonReentrant returns (uint256 shares) {
        shares = super.deposit(assets, receiver);
        emit LiquidityDeposited(receiver, assets, shares);
        return shares;
    }

    /**
     * @dev Withdraw assets by burning vault shares
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override whenNotPaused nonReentrant returns (uint256 shares) {
        shares = super.withdraw(assets, receiver, owner);
        emit LiquidityWithdrawn(receiver, assets, shares);
        return shares;
    }

    /**
     * @dev Calculate total assets in vault (available liquidity + outstanding loans - defaulted loans)
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + _totalOutstandingLoans() - _totalDefaultedAmount;
    }

    /**
     * @dev Calculate total outstanding loan principal (excluding defaulted loans)
     */
    function _totalOutstandingLoans() private view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 1; i < _nextLoanId; i++) {
            if (allLoans[i].isActive && !allLoans[i].isRepaid && !allLoans[i].isDefaulted) {
                total += allLoans[i].principal;
            }
        }
        return total;
    }

    // ===========================================
    // Lending Functions
    // ===========================================

    /**
     * @dev Get user's current credit limit
     */
    function getCreditLimit(address user) public view returns (uint256) {
        if (creditLimits[user] == 0) {
            return INITIAL_CREDIT_LIMIT;
        }
        return creditLimits[user];
    }

    /**
     * @dev Borrow USDT up to credit limit
     * @param amount Amount to borrow (in USDT with 6 decimals)
     */
    function borrow(uint256 amount) external whenNotPaused nonReentrant {
        address borrower = msg.sender;
        Loan memory existingLoan = activeLoans[borrower];

        // Check: No active loan
        require(!existingLoan.isActive, "Active loan exists");

        // Check: No defaulted loan
        require(!existingLoan.isDefaulted, "Cannot borrow with defaulted loan");

        // Check: Within credit limit
        uint256 limit = getCreditLimit(borrower);
        require(amount <= limit, "Exceeds credit limit");
        require(amount > 0, "Amount must be > 0");

        // Check: Vault has enough liquidity
        uint256 availableLiquidity = IERC20(asset()).balanceOf(address(this));
        require(availableLiquidity >= amount, "Insufficient liquidity");

        // Create loan
        uint256 loanId = _nextLoanId++;
        Loan memory newLoan = Loan({
            id: loanId,
            borrower: borrower,
            principal: amount,
            timestamp: block.timestamp,
            isActive: true,
            isRepaid: false,
            isDefaulted: false
        });

        activeLoans[borrower] = newLoan;
        allLoans[loanId] = newLoan;

        // Transfer USDT to borrower
        IERC20(asset()).safeTransfer(borrower, amount);

        emit LoanIssued(borrower, loanId, amount, block.timestamp);
    }

    /**
     * @dev Repay active loan with interest
     */
    function repay() external whenNotPaused nonReentrant {
        address borrower = msg.sender;
        Loan storage loan = activeLoans[borrower];

        // Check: Has active loan
        require(loan.isActive, "No active loan");

        // Check: Minimum loan duration passed (prevents gaming)
        uint256 timeElapsed = block.timestamp - loan.timestamp;
        require(
            timeElapsed >= MIN_LOAN_DURATION,
            "Loan must be active for at least 7 days"
        );

        // Calculate repayment amount
        uint256 repaymentAmount = calculateRepaymentAmount(borrower);

        // Mark loan as repaid
        loan.isActive = false;
        loan.isRepaid = true;
        allLoans[loan.id].isActive = false;
        allLoans[loan.id].isRepaid = true;

        // Update credit limit (increase by 20%)
        uint256 oldLimit = getCreditLimit(borrower);
        uint256 newLimit = (oldLimit * CREDIT_INCREASE_FACTOR) /
            FACTOR_DENOMINATOR;
        creditLimits[borrower] = newLimit;
        successfulRepayments[borrower]++;

        // Calculate interest paid
        uint256 interest = repaymentAmount - loan.principal;

        // Transfer repayment from borrower to vault
        IERC20(asset()).safeTransferFrom(
            borrower,
            address(this),
            repaymentAmount
        );

        emit LoanRepaid(
            borrower,
            loan.id,
            loan.principal,
            interest,
            block.timestamp
        );
        emit CreditLimitUpdated(borrower, oldLimit, newLimit);

        // Clean up active loan
        delete activeLoans[borrower];
    }

    /**
     * @dev Calculate repayment amount with interest (APR-based)
     * @param borrower Address of the borrower
     * @return Total amount to repay (principal + interest)
     */
    function calculateRepaymentAmount(
        address borrower
    ) public view returns (uint256) {
        Loan memory loan = activeLoans[borrower];
        if (!loan.isActive) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - loan.timestamp;
        uint256 apr = timeElapsed <= LOAN_DURATION ? BASE_APR : PUNITIVE_APR;

        // Calculate interest: principal * APR * time / (100 * seconds_per_year)
        // Using PRECISION to avoid rounding errors
        uint256 interest = (loan.principal *
            apr *
            timeElapsed *
            PRECISION) / (100 * SECONDS_PER_YEAR * PRECISION);

        return loan.principal + interest;
    }

    /**
     * @dev Get active loan for a user
     */
    function getActiveLoan(address user) external view returns (Loan memory) {
        return activeLoans[user];
    }

    /**
     * @dev Get all loans (for /activity page)
     */
    function getAllLoans() external view returns (Loan[] memory) {
        Loan[] memory loans = new Loan[](_nextLoanId - 1);
        for (uint256 i = 1; i < _nextLoanId; i++) {
            loans[i - 1] = allLoans[i];
        }
        return loans;
    }

    /**
     * @dev Get total number of loans issued
     */
    function getTotalLoans() external view returns (uint256) {
        return _nextLoanId - 1;
    }

    /**
     * @dev Get user's loan history count
     */
    function getUserLoanCount(address user) external view returns (uint256) {
        return successfulRepayments[user];
    }

    // ===========================================
    // Default Tracking Functions
    // ===========================================

    /**
     * @dev Mark a loan as defaulted
     * @param borrower Address of the borrower
     * @notice Only owner can call this function
     */
    function markAsDefaulted(address borrower) external onlyOwner nonReentrant {
        Loan storage loan = activeLoans[borrower];
        require(loan.isActive && !loan.isRepaid, "No active loan to default");
        require(!loan.isDefaulted, "Loan already defaulted");

        // Mark loan as defaulted
        loan.isDefaulted = true;
        loan.isActive = false;
        allLoans[loan.id].isDefaulted = true;
        allLoans[loan.id].isActive = false;

        // Track defaulted amount
        _totalDefaultedAmount += loan.principal;

        emit LoanDefaulted(borrower, loan.id, loan.principal, block.timestamp);
    }

    /**
     * @dev Repay a defaulted loan (allows recovery)
     * @notice Borrower can still repay even after default
     */
    function repayDefaultedLoan() external nonReentrant {
        address borrower = msg.sender;
        Loan storage loan = activeLoans[borrower];

        require(loan.isDefaulted, "Loan not defaulted");
        require(!loan.isRepaid, "Loan already repaid");

        // Calculate repayment amount (with punitive APR)
        uint256 repaymentAmount = calculateRepaymentAmount(borrower);

        // Mark as repaid
        loan.isRepaid = true;
        allLoans[loan.id].isRepaid = true;

        // Remove from defaulted tracking
        _totalDefaultedAmount -= loan.principal;

        // Update credit limit (smaller increase for defaulted loans - 10% instead of 20%)
        uint256 oldLimit = getCreditLimit(borrower);
        uint256 newLimit = (oldLimit * 110) / FACTOR_DENOMINATOR; // 10% increase
        creditLimits[borrower] = newLimit;
        successfulRepayments[borrower]++;

        // Transfer repayment
        IERC20(asset()).safeTransferFrom(borrower, address(this), repaymentAmount);

        emit DefaultRecovered(borrower, loan.id, repaymentAmount, block.timestamp);
        emit CreditLimitUpdated(borrower, oldLimit, newLimit);

        // Clean up active loan
        delete activeLoans[borrower];
    }

    /**
     * @dev Check if a loan is overdue (past default threshold)
     * @param borrower Address of the borrower
     * @return bool True if loan is overdue
     */
    function isLoanOverdue(address borrower) external view returns (bool) {
        Loan memory loan = activeLoans[borrower];
        if (!loan.isActive || loan.isRepaid || loan.isDefaulted) {
            return false;
        }
        uint256 timeElapsed = block.timestamp - loan.timestamp;
        return timeElapsed > DEFAULT_THRESHOLD;
    }

    /**
     * @dev Get all defaulted loans
     * @return Array of defaulted loans
     */
    function getDefaultedLoans() external view returns (Loan[] memory) {
        // Count defaulted loans
        uint256 defaultedCount = 0;
        for (uint256 i = 1; i < _nextLoanId; i++) {
            if (allLoans[i].isDefaulted && !allLoans[i].isRepaid) {
                defaultedCount++;
            }
        }

        // Create array of defaulted loans
        Loan[] memory defaultedLoans = new Loan[](defaultedCount);
        uint256 index = 0;
        for (uint256 i = 1; i < _nextLoanId; i++) {
            if (allLoans[i].isDefaulted && !allLoans[i].isRepaid) {
                defaultedLoans[index] = allLoans[i];
                index++;
            }
        }

        return defaultedLoans;
    }

    /**
     * @dev Get total defaulted amount
     * @return Total amount currently defaulted
     */
    function getTotalDefaultedAmount() external view returns (uint256) {
        return _totalDefaultedAmount;
    }

    // ===========================================
    // Admin Functions
    // ===========================================

    /**
     * @dev Pause contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal (owner only)
     * @param amount Amount to withdraw
     */
    function rescueFunds(uint256 amount) external onlyOwner {
        IERC20(asset()).safeTransfer(owner(), amount);
    }

    /**
     * @dev Manually set credit limit for a user (admin override)
     * @param user User address
     * @param newLimit New credit limit
     */
    function setCreditLimit(
        address user,
        uint256 newLimit
    ) external onlyOwner {
        uint256 oldLimit = getCreditLimit(user);
        creditLimits[user] = newLimit;
        emit CreditLimitUpdated(user, oldLimit, newLimit);
    }
}
