import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "solidity-coverage";
import "hardhat-gas-reporter";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./src",
  },
  networks: {
    // Sender chain ---------------------------------------------------------------------------------
    arbitrumSepolia: {
      chainId: 421614,
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      live: true,
      saveDeployments: true,
      tags: ["staging", "sender", "layer2"],
      companionNetworks: {
        receiver: "sepolia",
      },
      verify: {
        etherscan: {
          apiUrl: "https://api-sepolia.arbiscan.io/api",
          apiKey: process.env.ARBISCAN_API_KEY,
        },
      },
    },
    chiado: {
      chainId: 10200,
      url: "https://rpc.chiadochain.net",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      live: true,
      saveDeployments: true,
      tags: ["staging", "outbox", "layer1"],
      companionNetworks: {
        arbitrumSepolia: "arbitrumSepolia",
      },
      verify: {
        etherscan: {
          apiUrl: "https://blockscout.com/gnosis/chiado",
        },
      },
    },
    // Receiver chain ---------------------------------------------------------------------------------
    sepolia: {
      chainId: 11155111,
      url: "https://sepolia.infura.io/v3/65fd25a0ab7f4af08f18de6a2d4c6aa6",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      live: true,
      saveDeployments: true,
      tags: ["staging", "receiver", "layer1"],
      companionNetworks: {
        sender: "arbitrumSepolia",
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    relayer: {
      default: 1,
    },
    bridger: {
      default: 2,
    },
    challenger: {
      default: 3,
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY_FIX,
    },
  },
};

export default config;
