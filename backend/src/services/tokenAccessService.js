const { ethers } = require('ethers');
const DataAccessToken = require('../contracts/DataAccessToken.json');

class TokenAccessService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.contractAddress = process.env.DATA_ACCESS_TOKEN_ADDRESS;
    this.initialize();
  }

  async initialize() {
    try {
      // Use environment variables for provider configuration
      const providerUrl = process.env.ETH_PROVIDER_URL || 'http://localhost:8545';
      this.provider = new ethers.providers.JsonRpcProvider(providerUrl);

      // Initialize contract instance
      if (this.contractAddress) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          DataAccessToken.abi,
          this.provider
        );
        console.log('[tokenAccessService] Contract initialized at:', this.contractAddress);
      } else {
        console.warn('[tokenAccessService] Contract address not set');
      }
    } catch (error) {
      console.error('[tokenAccessService] Initialization error:', error);
    }
  }

  /**
   * Generate a dataset ID from timestamp
   * @param {string} timestamp - Dataset timestamp
   * @returns {string} - A BigNumber-compatible ID string
   */
  generateDatasetId(timestamp) {
    // Create a deterministic ID based on the timestamp
    // Converting timestamp to a numeric value and using it directly as ID
    return ethers.BigNumber.from(timestamp).toString();
  }

  /**
   * Check if a user has access to a dataset
   * @param {string} userAddress - User's wallet address
   * @param {string} timestamp - Dataset timestamp
   * @returns {Promise<boolean>} - True if user has access
   */
  async checkAccess(userAddress, timestamp) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const datasetId = this.generateDatasetId(timestamp);
      const hasAccess = await this.contract.hasAccess(userAddress, datasetId);

      return hasAccess;
    } catch (error) {
      console.error('[tokenAccessService] Error checking access:', error);
      return false;
    }
  }

  /**
   * Get all datasets a user has access to
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Array>} - Array of dataset timestamps
   */
  async getUserAccessibleDatasets(userAddress) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // This would require external indexing in a real implementation
      // For a MVP, we'll make a simpler version that checks recent datasets

      // For now, we'll return an empty array
      return [];
    } catch (error) {
      console.error('[tokenAccessService] Error getting user datasets:', error);
      return [];
    }
  }

  /**
   * Get the price of a dataset
   * @param {string} timestamp - Dataset timestamp
   * @returns {Promise<string>} - Price in ether
   */
  async getDatasetPrice(timestamp) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const datasetId = this.generateDatasetId(timestamp);
      const priceWei = await this.contract.datasetPrices(datasetId);

      // Convert wei to ether
      return ethers.utils.formatEther(priceWei);
    } catch (error) {
      console.error('[tokenAccessService] Error getting dataset price:', error);
      return '0';
    }
  }

  /**
   * Get contract address
   * @returns {string} - The contract address
   */
  getContractAddress() {
    return this.contractAddress;
  }

  /**
   * Get contract ABI
   * @returns {Array} - The contract ABI
   */
  getContractABI() {
    return DataAccessToken.abi;
  }

  /**
 * Register a dataset in the smart contract
 * @param {string} datasetId - Dataset ID
 * @param {string} timestamp - Dataset timestamp
 * @param {string} price - Price in ETH
 * @returns {Promise<Object>} - Transaction result
 */
  async registerDatasetInContract(datasetId, timestamp, price, adminAddress) {
    try {
      if (!this.contract) {
        await this.initialize();
        if (!this.contract) {
          throw new Error('Contract not initialized');
        }
      }

      // Convert price from ETH to Wei
      const priceWei = ethers.utils.parseEther(price.toString());

      // Need to connect with a signer to send transactions
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Admin private key not configured in environment');
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.contract.connect(wallet);

      console.log(`[tokenAccessService] Registering dataset in contract: ID=${datasetId}, timestamp=${timestamp}, price=${price} ETH`);

      // Call the registerDataset function on the smart contract
      const tx = await contractWithSigner.registerDataset(datasetId, timestamp, priceWei);

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      console.log(`[tokenAccessService] Dataset registered successfully: ${receipt.transactionHash}`);

      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        successful: true
      };
    } catch (error) {
      console.error('[tokenAccessService] Error registering dataset in contract:', error);
      throw error;
    }
  }
}

module.exports = new TokenAccessService();