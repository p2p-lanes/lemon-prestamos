import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    baseSepolia: {
      type: "http" as const,
      url: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || "riB9BhOYQqR-NEKNc6mr0"}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    base: {
      type: "http" as const,
      url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || "riB9BhOYQqR-NEKNc6mr0"}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "2T867QJTQR59A4KJIMD7I33KSKTWIANPKH",
      base: process.env.BASESCAN_API_KEY || "2T867QJTQR59A4KJIMD7I33KSKTWIANPKH",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  },
};

export default config;
