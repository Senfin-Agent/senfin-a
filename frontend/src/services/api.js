// src/services/api.js
import axios from 'axios';

// Use an empty string for baseURL so that requests are relative and get proxied.
const API = axios.create({
    baseURL: '',  // Proxy will forward these requests.
});

// Example: generating synthetic data from a dataset spec
export async function generateSyntheticData(datasetSpec) {
    return API.post('/synthesis/start', { datasetSpec });
}

// Example: create or load agent wallet
export async function createAgentWallet() {
    return API.post('/agent/createWallet');
}

// Example: get agent wallet balance
export async function getAgentBalance(address) {
    return API.get(`/agent/balance/${address}`);
}

// 1) Create Bucket
export async function createRecallBucket() {
    return axios.post('/recall/createBucket');
}

export async function addObjectToBucket(bucket, key, content) {
    // We'll send content as a string in JSON body
    return axios.post('/recall/addObject', {
        bucket,
        key,
        content,
    });
}

export async function queryBucketObjects(bucket) {
    return axios.post('/recall/queryObjects', { bucket });
}

export async function getObjectFromBucket(bucket, key) {
    return axios.post('/recall/getObject', { bucket, key });
}



/**
 * Fetch a stored JSON object from your backend (which in turn calls Recall).
 */
export async function fetchRecallObject(bucket, key) {
    // Adjust the endpoint to match your actual backend route
    // e.g., /synthesis/getObject or /recall/getObject
    return axios.post('/recall/getObject', { bucket, key });
}


/**
 * Query a Recall bucket for a list of objects (by prefix)
 */
export async function queryRecallBucket(bucket, prefix = '') {
    // Adjust to match your backend route
    return axios.post('/recall/queryBucket', { bucket, prefix });
}

/**
 * List objects from agent index bucket, optionally with prefix
 * GET /agent/objects?prefix=...
 */
export async function listAgentObjects(prefix = '') {
    const res = await axios.get('/agent/objects', {
      params: { prefix }
    });
    return res;
  }
  
  /**
   * Fetch a single object by key from the agent index bucket
   * GET /agent/object/:key
   */
  export async function fetchAgentObject(key) {
    // Notice we pass the entire "synthetic-data/1234.json" etc.
    const encodedKey = encodeURIComponent(key);
    return axios.get(`/agent/object/${encodedKey}`);
  }

  /**
 * Check if user has access to a dataset
 * @param {string} datasetTimestamp - The timestamp of the dataset
 * @param {string} userAddress - The user's wallet address
 * @returns {Promise<Object>} The API response
 */
export async function checkAccess(datasetTimestamp, userAddress) {
    try {
      const response = await fetch(`/access/check?datasetTimestamp=${datasetTimestamp}&userAddress=${userAddress}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API error checking access:', error);
      throw error;
    }
  }
  
  /**
   * Purchase access to a dataset
   * @param {string} datasetTimestamp - The timestamp of the dataset
   * @param {string} userAddress - The user's wallet address
   * @param {Object} paymentProof - Proof of payment (mock for MVP)
   * @returns {Promise<Object>} The API response
   */
  export async function purchaseAccess(datasetTimestamp, userAddress, paymentProof) {
    try {
      const response = await fetch('/access/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetTimestamp,
          userAddress,
          paymentProof
        }),
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API error purchasing access:', error);
      throw error;
    }
  }
  
  /**
   * Get all datasets accessible to a user
   * @param {string} userAddress - The user's wallet address
   * @returns {Promise<Object>} The API response
   */
  export async function getUserAccessibleDatasets(userAddress) {
    try {
      const response = await fetch(`/access/user-datasets?userAddress=${userAddress}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API error getting user datasets:', error);
      throw error;
    }
  }