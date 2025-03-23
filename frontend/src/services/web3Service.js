import { ethers } from 'ethers';

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = null;
    this.contractABI = null;
    this.networkId = null;
    // Set your backend base URL here:
    this.baseUrl = 'https://senfin-a.vercel.app';
  }

  async initialize() {
    try {
      if (window.ethereum) {
        // Create a new provider using the injected provider
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        // Get the network info
        const network = await this.provider.getNetwork();
        this.networkId = network.chainId;
        // Fetch contract info from the backend
        await this.getContractInfo();
        return true;
      } else {
        console.warn('MetaMask not installed');
        return false;
      }
    } catch (error) {
      console.error('Error initializing Web3Service:', error);
      return false;
    }
  }

  async getContractInfo() {
    try {
      // Use the absolute URL to fetch contract info
      const response = await fetch(`${this.baseUrl}/access/contract-info`);
      const data = await response.json();
      if (data.success) {
        this.contractAddress = data.contractAddress;
        this.contractABI = data.contractABI;
        // Instantiate the contract (read-only) if possible
        if (this.contractAddress && this.contractABI && this.provider) {
          this.contract = new ethers.Contract(
            this.contractAddress,
            this.contractABI,
            this.provider
          );
        }
      } else {
        console.error('Contract info fetch was unsuccessful:', data);
      }
    } catch (error) {
      console.error('Error getting contract info:', error);
    }
  }

  async connectWallet() {
    try {
      if (!this.provider) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Provider not initialized');
        }
      }
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      // Get the signer from the provider
      this.signer = this.provider.getSigner();
      // Reinstantiate the contract with the signer for sending transactions
      if (this.contractAddress && this.contractABI) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.signer
        );
      }
      return accounts[0];
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async purchaseAccess(datasetId, price) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected or signer not available');
      }
      // Ensure the contract is connected to the signer
      if (!this.contract.signer) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.signer
        );
      }
      // Convert price from ether to wei
      const priceWei = ethers.utils.parseEther(price);
      // Call the purchaseAccess function on the contract
      const tx = await this.contract.purchaseAccess(datasetId, { value: priceWei });
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('Error purchasing access:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  async registerDataset(datasetId, timestamp, price) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not connected or signer not available');
      }
      if (!this.contract.signer) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.signer
        );
      }
      const priceWei = ethers.utils.parseEther(price);
      const tx = await this.contract.registerDataset(datasetId, timestamp, priceWei);
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('Error registering dataset:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async checkAccess(userAddress, datasetId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      const hasAccess = await this.contract.hasAccess(userAddress, datasetId);
      return hasAccess;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }

  async getDatasetPrice(datasetId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      const priceWei = await this.contract.datasetPrices(datasetId);
      return ethers.utils.formatEther(priceWei);
    } catch (error) {
      console.error('Error getting dataset price:', error);
      return '0';
    }
  }
  
  async isContractOwner(address) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      const owner = await this.contract.owner();
      return owner.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Error checking contract owner:', error);
      return false;
    }
  }

  // Helper function to generate a dataset ID from a timestamp
  generateDatasetId(timestamp) {
    return ethers.BigNumber.from(timestamp).toString();
  }
}

export default new Web3Service();
