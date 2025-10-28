// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT token for testing on Base Sepolia testnet
 * @notice This is a test token with 6 decimals (like real USDT)
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private constant _decimals = 6;

    constructor() ERC20("Mock USDT", "USDT") Ownable(msg.sender) {
        // Mint 1 million USDT to deployer for testing
        _mint(msg.sender, 1_000_000 * 10 ** _decimals);
    }

    /**
     * @dev Returns 6 decimals (same as real USDT)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Allows anyone to mint tokens for testing
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in token units, not wei)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount * 10 ** _decimals);
    }

    /**
     * @dev Allows owner to mint specific amount (with decimals)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (including decimals)
     */
    function mintExact(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
