require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");

// Load environment variables
require("dotenv").config();

// Get private key from .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xdefaultPrivateKeyForTesting";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};