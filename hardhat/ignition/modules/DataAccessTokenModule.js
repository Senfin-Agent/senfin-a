// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DataAccessTokenModule", (m) => {
  // Get the initial owner address - could be set from env vars or hardcoded for testing
  const initialOwner = m.getParameter("initialOwner", "0x25D40008ffC27D95D506224a246916d7E7ac0f36"); // Replace with your wallet address
  
  // Deploy the DataAccessToken contract
  const dataAccessToken = m.contract("DataAccessToken", [initialOwner]);
  
  return { dataAccessToken };
});