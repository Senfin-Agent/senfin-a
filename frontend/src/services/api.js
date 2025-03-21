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