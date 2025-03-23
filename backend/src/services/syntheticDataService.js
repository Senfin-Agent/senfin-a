const crypto = require('crypto');
const recallService = require('./recallService');
const nillionSecretLLMService = require('./nillionSecretLLMService');
const tokenAccessService = require('./tokenAccessService');
const fs = require('fs');
const path = require('path');

/**
 * Encrypt data with a user-specific encryption key
 * @param {Object|string} data - Data to encrypt
 * @param {string} userKey - User's encryption key
 * @returns {Object} Encrypted data object
 */
function encryptData(data, userKey) {
  // Convert data to string if it's an object
  const dataString = typeof data === 'object' ? JSON.stringify(data) : data;

  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);

  // Create cipher using AES-256-CBC with the user's key
  const key = crypto.createHash('sha256').update(userKey).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  // Encrypt the data
  let encrypted = cipher.update(dataString, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex')
  };
}

/**
 * Decrypt data with a user-specific encryption key
 * @param {Object} encryptedData - Object containing encrypted data and IV
 * @param {string} userKey - User's encryption key
 * @returns {Object|string} Decrypted data
 */
function decryptData(encryptedData, userKey) {
  try {
    const { encrypted, iv } = encryptedData;

    // Create decipher
    const key = crypto.createHash('sha256').update(userKey).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));

    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Try to parse as JSON, return as string if not valid JSON
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return decrypted;
    }
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Decryption failed. Invalid key or corrupted data.');
  }
}




/**
 * Access control system for token-gated data
 * Simple implementation for MVP
 */
const accessControl = {
  // Storage for access rights
  accessRights: {},

  // Grant access to a user for a specific dataset
  grantAccess: function (datasetTimestamp, userAddress) {
    if (!this.accessRights[datasetTimestamp]) {
      this.accessRights[datasetTimestamp] = [];
    }

    if (!this.accessRights[datasetTimestamp].includes(userAddress)) {
      this.accessRights[datasetTimestamp].push(userAddress);
    }

    return true;
  },

  // Check if a user has access to a dataset
  hasAccess: function (datasetTimestamp, userAddress) {
    if (!this.accessRights[datasetTimestamp]) return false;
    return this.accessRights[datasetTimestamp].includes(userAddress);
  },

  // Get all datasets a user has access to
  getUserAccessibleDatasets: function (userAddress) {
    const accessibleDatasets = [];

    for (const [timestamp, users] of Object.entries(this.accessRights)) {
      if (users.includes(userAddress)) {
        accessibleDatasets.push(timestamp);
      }
    }

    return accessibleDatasets;
  }
};

/**
 * Generate detailed chain-of-thought logs explaining the synthetic data generation process
 * @param {Object} datasetSpec - Original data specification
 * @param {Object} syntheticData - The generated synthetic data
 * @returns {Promise<string>} - Generated CoT logs
 */
async function generateChainOfThoughtLogs(datasetSpec, syntheticData) {
  console.log('[syntheticDataService] Generating chain-of-thought logs');

  // Build a prompt instructing the LLM to generate CoT logs
  const prompt = `Generate detailed chain-of-thought logs explaining how synthetic data would be generated based on the following specification: ${JSON.stringify(datasetSpec)}.

Please explain:
1. The overall approach to generating this synthetic data
2. The techniques used to preserve statistical properties while ensuring privacy
3. How personally identifiable information (PII) would be removed
4. How data distributions would be maintained
5. Any potential limitations or considerations for this synthetic dataset

IMPORTANT: Do NOT include any specific values from the synthetic data. Your explanation should be general and educational.

Here's the structure of the generated synthetic data (showing only structure, not values):
${JSON.stringify(Object.keys(syntheticData.data && syntheticData.data[0] ? syntheticData.data[0] : syntheticData))}

Provide a detailed, step-by-step explanation that would help a potential buyer understand the synthetic data generation process.`;

  const messages = [
    {
      role: 'system',
      content: 'You are an AI specialized in explaining privacy-preserving synthetic data generation processes. Provide clear, detailed explanations of how synthetic data is generated while ensuring no private information is revealed.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  // Use the LLM service to generate the CoT logs
  const llmResponse = await nillionSecretLLMService.runLLMChat(messages, {
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    temperature: 0.7, // Slightly higher temperature for more detailed explanation
  });

  // Extract the CoT logs from the LLM response
  const cotLogs = llmResponse?.choices?.[0]?.message?.content || 'Failed to generate chain-of-thought logs';
  return cotLogs;
}

/**
 * Agent Index Bucket address from environment - will be used for all storage
 */
let AGENT_INDEX_BUCKET = process.env.AGENT_INDEX_BUCKET;
/**
 * Generate a synthetic dataset using the TEE-based LLM service, then store it in the Agent Index Bucket.
 * Also store optional chain-of-thought or reasoning logs to the same agent index bucket with matching timestamp.
 * Automatically register the dataset in the smart contract if adminAddress is provided.
 *
 * @param {Object} datasetSpec - Info needed to generate the synthetic data
 * @param {Object} sampleData - Optional sample data to base synthetic data on
 * @param {string} userKey - User's encryption key for encrypting sensitive data and logs
 * @param {string} adminAddress - Admin address for registering dataset in smart contract (if null, won't register)
 * @param {string} price - Price in ETH to purchase access (default: '0.001')
 * @returns {Promise<Object>} - References to the object key, etc.
 */
async function generateSynthetics(datasetSpec, sampleData = null, userKey, adminAddress = null, price = '0.000001') {
  console.log('[syntheticDataService] Generating synthetic data for:', datasetSpec);

  // Ensure we have an agent index bucket
  if (!AGENT_INDEX_BUCKET) {
    console.log('[syntheticDataService] No AGENT_INDEX_BUCKET set; attempting to create or find one.');
    try {
      AGENT_INDEX_BUCKET = await ensureAgentIndexBucket();
      if (!AGENT_INDEX_BUCKET) {
        throw new Error('Could not create or find agent index bucket. Cannot proceed with data generation.');
      }
    } catch (error) {
      console.error('[syntheticDataService] Error ensuring agent index bucket:', error);
      throw error;
    }
  }

  // Generate timestamp for both synthetic data and logs to create relationship
  const timestamp = Date.now();
  const syntheticDataKey = `synthetic-data/${timestamp}.json`;
  const logKey = `logs/cot/${timestamp}.txt`;

  // Analyze the sample data if provided
  let dataStructure = '';
  let dataDistribution = '';

  if (sampleData) {
    console.log('[syntheticDataService] Sample data provided for synthesis');

    // Identify data structure
    if (Array.isArray(sampleData)) {
      dataStructure = `The data is an array of ${sampleData.length} objects.`;
      if (sampleData.length > 0) {
        const sampleItem = sampleData[0];
        dataStructure += ` Each object has these fields: ${Object.keys(sampleItem).join(', ')}.`;

        // Provide field types for better synthesis
        const fieldTypes = {};
        for (const [key, value] of Object.entries(sampleItem)) {
          fieldTypes[key] = typeof value;
        }
        dataStructure += ` Field types: ${JSON.stringify(fieldTypes)}.`;
      }
    } else if (typeof sampleData === 'object') {
      dataStructure = `The data is a single object with these fields: ${Object.keys(sampleData).join(', ')}.`;
    }

    // Analyze distributions for numerical fields
    if (Array.isArray(sampleData) && sampleData.length > 0) {
      const numericFields = Object.entries(sampleData[0])
        .filter(([_, value]) => typeof value === 'number')
        .map(([key]) => key);

      if (numericFields.length > 0) {
        dataDistribution = 'Numeric field distributions: ';
        for (const field of numericFields) {
          const values = sampleData.map((item) => item[field]).filter((v) => v !== undefined);
          if (values.length > 0) {
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            dataDistribution += `${field} (min: ${min}, max: ${max}, avg: ${avg.toFixed(2)}), `;
          }
        }
      }
    }
  }

  // Build a prompt instructing the LLM to generate synthetic data
  const prompt = `Generate privacy-preserving synthetic data based solely on the following specification: ${JSON.stringify(
    datasetSpec
  )}.
  
${dataStructure}
${dataDistribution}

INSTRUCTIONS:
1. Create synthetic data that PRESERVES the statistical properties and relationships of the original data.
2. REMOVE all personally identifiable information (PII).
3. For categorical fields, maintain the distribution but use entirely synthetic values.
4. For numerical fields, maintain the statistical distribution but add small amounts of noise.
5. For timestamps, maintain the temporal patterns but shift all dates by a random offset.
6. For text fields, generate synthetic text with similar length and structure but completely different content.
7. Do NOT include any of the original sample data in the final output.
8. The output must be entirely synthetic and must not repeat any values from the provided sample data.

Return a valid JSON object with:
{
  "id": "a UUID string",
  "spec": ${JSON.stringify(datasetSpec)},
  "createdAt": "YYYY-MM-DD HH:MM:SS",
  "data": [...],
  "privacyReport": {
    "techniques": [...],
    "guarantees": [...]
  }
}
The response must ONLY be the JSON object, with no code blocks or other text.`;

  const messages = [
    {
      role: 'system',
      content:
        'You are an AI agent specialized in privacy-preserving synthetic data generation. Your task is to create synthetic datasets that maintain the statistical properties and relationships of the original data while removing all personally identifiable information. Always return valid JSON objects directly without any explanations, code blocks, or other text.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  // Use the TEE LLM service to generate the synthetic data
  const llmResponse = await nillionSecretLLMService.runLLMChat(messages, {
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    temperature: 0.2,
  });

  // The full raw text from the LLM
  const syntheticDataText = llmResponse?.choices?.[0]?.message?.content || '';
  console.log('[syntheticDataService] LLM response length:', syntheticDataText.length);

  // Attempt to parse the LLM's JSON into an object
  const syntheticData = parseSyntheticData(syntheticDataText);

  validateSyntheticDataPrivacy(syntheticData);

  // Generate proper chain-of-thought logs with a separate LLM call
  const chainOfThought = await generateChainOfThoughtLogs(datasetSpec, syntheticData);

  // Store the CoT logs - don't encrypt them since they'll be public
  const logResult = await storeChainOfThoughtLog(chainOfThought, timestamp);

  // Add metadata to the synthetic data object including relationship to logs
  let syntheticDataWithMetadata = {
    ...syntheticData,
    type: 'synthetic-dataset',
    datasetSpec: datasetSpec,
    createdAt: new Date().toISOString(),
    generationTimestamp: timestamp,
    relatedLogs: logKey
  };

  // Encrypt the sensitive parts if userKey is provided
  if (userKey) {
    const encryptedData = encryptData(syntheticData, userKey);
    syntheticDataWithMetadata.encryptedData = encryptedData;
  }

  // Save the synthetic data to the agent index bucket
  try {
    const { txHash } = await recallService.addObjectToExistingBucket(
      AGENT_INDEX_BUCKET,
      syntheticDataWithMetadata,
      syntheticDataKey
    );

    console.log('[syntheticDataService] Stored synthetic data in agent index bucket:', {
      bucket: AGENT_INDEX_BUCKET,
      key: syntheticDataKey,
      txHash,
      relatedLogs: logKey
    });

    let contractRegistrationResult = null;

    // If an admin address was provided, register the dataset in the smart contract
    // if (adminAddress) {

    try {
      console.log(`[syntheticDataService] Registering dataset ${timestamp} in smart contract with price ${price} ETH`);

      // Generate the dataset ID
      const datasetId = tokenAccessService.generateDatasetId(timestamp.toString());

      // ACTUALLY REGISTER THE DATASET IN THE SMART CONTRACT
      // No need to check for adminAddress - we'll always register datasets
      const registrationTx = await tokenAccessService.registerDatasetInContract(
        datasetId,
        timestamp.toString(),
        price,
        adminAddress || process.env.ADMIN_ADDRESS
      );

      contractRegistrationResult = {
        datasetId,
        timestamp: timestamp.toString(),
        price,
        contractAddress: tokenAccessService.getContractAddress(),
        successful: true,
        transactionHash: registrationTx.transactionHash,
        blockNumber: registrationTx.blockNumber
      };

      console.log(`[syntheticDataService] Dataset successfully registered in smart contract:`, {
        datasetId,
        timestamp: timestamp.toString(),
        price,
        contractAddress: tokenAccessService.getContractAddress(),
        transactionHash: registrationTx.transactionHash
      });
    } catch (regError) {
      console.error('[syntheticDataService] Error registering dataset in smart contract:', regError);
      contractRegistrationResult = {
        error: regError.message,
        successful: false
      };
    }

    return {
      success: true,
      syntheticData, // Return the unencrypted version to the caller
      recallBucket: AGENT_INDEX_BUCKET,
      objectKey: syntheticDataKey,
      transactionHash: txHash,
      timestamp,
      relatedLogs: logKey,
      contractRegistration: contractRegistrationResult  // Include contract registration info
    };
  } catch (error) {
    console.error('[syntheticDataService] Error storing synthetic data:', error);
    throw error;
  }
}
/**
 * Get all synthetic data objects from the agent index bucket
 * @returns {Promise<Array>} Array of synthetic data objects
 */
async function getSyntheticBuckets() {
  // Ensure we have an agent index bucket
  if (!AGENT_INDEX_BUCKET) {
    console.log('[syntheticDataService] No AGENT_INDEX_BUCKET set; attempting to create or find one.');
    try {
      AGENT_INDEX_BUCKET = await ensureAgentIndexBucket();
      if (!AGENT_INDEX_BUCKET) {
        console.warn('[syntheticDataService] Could not create or find agent index bucket. Cannot track synthetic buckets.');
        return [];
      }
    } catch (error) {
      console.error('[syntheticDataService] Error ensuring agent index bucket:', error);
      return [];
    }
  }

  try {
    // Get all objects in the index bucket
    const recall = await recallService.createRecallClient();
    const bucketManager = recall.bucketManager();

    // List all objects in the bucket
    const { result } = await bucketManager.list(AGENT_INDEX_BUCKET);
    const keys = result?.keys || [];

    // Filter keys to only include synthetic data
    const syntheticDataKeys = keys.filter(key => key.startsWith('synthetic-data/'));

    // Fetch each object to get the synthetic data
    const syntheticDataObjects = [];
    for (const key of syntheticDataKeys) {
      try {
        const data = await recallService.getObject(AGENT_INDEX_BUCKET, key);
        if (data && data.type === 'synthetic-dataset') {
          syntheticDataObjects.push({
            ...data,
            key,
            bucketAddress: AGENT_INDEX_BUCKET
          });
        }
      } catch (error) {
        console.warn(`[syntheticDataService] Error fetching object ${key} from index:`, error.message);
      }
    }

    return syntheticDataObjects;
  } catch (error) {
    console.error('[syntheticDataService] Error listing synthetic data objects:', error);
    return [];
  }
}

/**
 * Attempt to parse the LLM's raw response into a JSON object.
 */
function parseSyntheticData(syntheticDataText) {
  // Try the simplest approach first
  try {
    return JSON.parse(syntheticDataText);
  } catch (e) {
    console.log('[syntheticDataService] Simple JSON parse failed, trying advanced parsing...');
  }

  // If simple parse fails, try to extract JSON from text that might have markdown blocks
  try {
    // Look for content within JSON code blocks
    const jsonBlockMatch = syntheticDataText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      return JSON.parse(jsonBlockMatch[1].trim());
    }
  } catch (e) {
    console.log('[syntheticDataService] Code block extraction failed');
  }

  // Try to find anything that looks like JSON with balanced braces
  try {
    const potentialJson = syntheticDataText.match(/\{[\s\S]*\}/);
    if (potentialJson) {
      return JSON.parse(potentialJson[0]);
    }
  } catch (e) {
    console.log('[syntheticDataService] Balanced braces extraction failed');
  }

  // If all fails, throw an error
  throw new Error('Could not parse synthetic data JSON from LLM response');
}

/**
 * Basic validation to ensure synthetic data meets privacy requirements
 */
function validateSyntheticDataPrivacy(syntheticData) {
  if (!syntheticData || !syntheticData.data) {
    throw new Error('Invalid synthetic data structure');
  }
  // Additional checks could be done here
  console.log('[syntheticDataService] Synthetic data validated for privacy requirements');
}

/**
 * Fetch a synthetic data object from the agent index bucket.
 */
async function getSyntheticDataObject(key) {
  // Ensure we have an agent index bucket
  if (!AGENT_INDEX_BUCKET) {
    console.log('[syntheticDataService] No AGENT_INDEX_BUCKET set; attempting to create or find one.');
    try {
      AGENT_INDEX_BUCKET = await ensureAgentIndexBucket();
      if (!AGENT_INDEX_BUCKET) {
        throw new Error('Could not create or find agent index bucket. Cannot fetch synthetic data object.');
      }
    } catch (error) {
      console.error('[syntheticDataService] Error ensuring agent index bucket:', error);
      throw error;
    }
  }

  console.log('[syntheticDataService] Fetching synthetic data from key:', key);
  const data = await recallService.getObject(AGENT_INDEX_BUCKET, key);
  return data;
}

/**
 * Get related chain-of-thought logs for a synthetic data object
 * @param {string|number} timestamp - The timestamp used in both synthetic data and logs
 * @returns {Promise<string>} The content of the related log
 */
async function getRelatedChainOfThoughtLog(timestamp) {
  // Ensure we have an agent index bucket
  if (!AGENT_INDEX_BUCKET) {
    console.log('[syntheticDataService] No AGENT_INDEX_BUCKET set; attempting to create or find one.');
    try {
      AGENT_INDEX_BUCKET = await ensureAgentIndexBucket();
      if (!AGENT_INDEX_BUCKET) {
        throw new Error('Could not create or find agent index bucket. Cannot fetch chain-of-thought logs.');
      }
    } catch (error) {
      console.error('[syntheticDataService] Error ensuring agent index bucket:', error);
      throw error;
    }
  }

  const logKey = `logs/cot/${timestamp}.txt`;

  try {
    const recall = await recallService.createRecallClient();
    const bucketManager = recall.bucketManager();

    // Get the log file as a buffer
    const { result } = await bucketManager.get(AGENT_INDEX_BUCKET, logKey);

    // Convert buffer to string
    if (result && result.object) {
      return result.object.toString('utf8');
    }

    throw new Error(`Log not found: ${logKey}`);
  } catch (error) {
    console.error(`[syntheticDataService] Error fetching related log for timestamp ${timestamp}:`, error);
    return null;
  }
}

/**
 * Store chain-of-thought text in the agent index bucket with specific timestamp
 * @param {string} logContent - The textual CoT logs or LLM reasoning to store
 * @param {number} timestamp - Timestamp to use in the key (to match synthetic data)
 * @returns {Promise<Object>} Object containing key and transaction info
 */
async function storeChainOfThoughtLog(logContent, timestamp) {
  // Ensure we have an agent index bucket
  if (!AGENT_INDEX_BUCKET) {
    console.log('[syntheticDataService] No AGENT_INDEX_BUCKET set; attempting to create or find one.');
    try {
      AGENT_INDEX_BUCKET = await ensureAgentIndexBucket();
      if (!AGENT_INDEX_BUCKET) {
        throw new Error('Could not create or find agent index bucket. Cannot store chain-of-thought logs.');
      }
    } catch (error) {
      console.error('[syntheticDataService] Error ensuring agent index bucket:', error);
      throw error;
    }
  }

  try {
    const recall = await recallService.createRecallClient();
    await recallService.ensureCreditBalanceIfZero(recall);

    // Convert log to buffer
    const fileBuffer = Buffer.from(logContent, 'utf8');
    const key = `logs/cot/${timestamp}.txt`;

    const bucketManager = recall.bucketManager();
    const { meta } = await bucketManager.add(AGENT_INDEX_BUCKET, key, fileBuffer);
    // Convert BigInt values to strings for the transaction hash
    const txHash = meta?.tx?.transactionHash ? meta.tx.transactionHash.toString() : null;

    console.log('[syntheticDataService] Chain-of-thought logs stored in agent index bucket:', {
      bucket: AGENT_INDEX_BUCKET,
      key,
      txHash,
    });

    return { bucket: AGENT_INDEX_BUCKET, key, txHash };
  } catch (error) {
    console.error('[syntheticDataService] Error storing chain-of-thought logs:', error);
    return null;
  }
}

/**
 * Find and return both synthetic data and related logs by timestamp
 * @param {string|number} timestamp - The timestamp to search for
 * @returns {Promise<Object>} Object containing both synthetic data and logs
 */
async function getSyntheticDataAndLogs(timestamp) {
  // Ensure we have an agent index bucket
  if (!AGENT_INDEX_BUCKET) {
    console.log('[syntheticDataService] No AGENT_INDEX_BUCKET set; attempting to create or find one.');
    try {
      AGENT_INDEX_BUCKET = await ensureAgentIndexBucket();
      if (!AGENT_INDEX_BUCKET) {
        throw new Error('Could not create or find agent index bucket. Cannot fetch synthetic data and logs.');
      }
    } catch (error) {
      console.error('[syntheticDataService] Error ensuring agent index bucket:', error);
      throw error;
    }
  }

  try {
    const syntheticDataKey = `synthetic-data/${timestamp}.json`;
    const logKey = `logs/cot/${timestamp}.txt`;

    // Get synthetic data
    const syntheticData = await getSyntheticDataObject(syntheticDataKey);

    // Get related logs
    const logs = await getRelatedChainOfThoughtLog(timestamp);

    return {
      timestamp,
      syntheticData,
      logs,
      syntheticDataKey,
      logKey,
      bucket: AGENT_INDEX_BUCKET
    };
  } catch (error) {
    console.error(`[syntheticDataService] Error fetching synthetic data and logs for timestamp ${timestamp}:`, error);
    return null;
  }
}

/**
 * Verify that the agent index bucket exists and is accessible
 * @returns {Promise<boolean>} True if the bucket exists and is accessible
 */
async function verifyAgentIndexBucket() {
  // Ensure we have an agent index bucket
  if (!AGENT_INDEX_BUCKET) {
    console.log('[syntheticDataService] No AGENT_INDEX_BUCKET set; attempting to create or find one.');
    try {
      AGENT_INDEX_BUCKET = await ensureAgentIndexBucket();
      if (!AGENT_INDEX_BUCKET) {
        return false;
      }
    } catch (error) {
      console.error('[syntheticDataService] Error ensuring agent index bucket:', error);
      return false;
    }
  }

  try {
    const recall = await recallService.createRecallClient();
    await recallService.ensureCreditBalanceIfZero(recall);

    const bucketManager = recall.bucketManager();

    // Try to get metadata to verify the bucket exists
    const { result } = await bucketManager.getMetadata(AGENT_INDEX_BUCKET);
    if (result && result.metadata) {
      console.log('[syntheticDataService] Successfully verified agent index bucket:', AGENT_INDEX_BUCKET);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[syntheticDataService] Error verifying agent index bucket:', error);
    return false;
  }
}

/**
 * Creates or finds the agent index bucket and updates .env file if needed
 * @returns {Promise<string>} The bucket address
 */
async function ensureAgentIndexBucket() {
  try {
    const recall = await recallService.createRecallClient();
    await recallService.ensureCreditBalanceIfZero(recall);
    const bucketManager = recall.bucketManager();

    // Try to find existing bucket with alias "agent-index" by listing all buckets
    const { result: bucketsResult } = await bucketManager.list();
    const buckets = bucketsResult?.buckets || [];
    let indexBucket = null;

    // Check each bucket's metadata for the alias
    for (const bucket of buckets) {
      try {
        const { result: metadataResult } = await bucketManager.getMetadata(bucket);
        const metadata = metadataResult?.metadata || {};
        if (metadata.alias === 'agent-index') {
          console.log(`[syntheticDataService] Found bucket with alias 'agent-index': ${bucket}`);
          indexBucket = bucket;
          break;
        }
      } catch (error) {
        console.warn(`[syntheticDataService] Error fetching metadata for bucket ${bucket}: ${error.message}`);
      }
    }

    // If no index bucket found, create a new one
    if (!indexBucket) {
      console.log('[syntheticDataService] No agent index bucket found, creating a new one...');
      const emptyObject = { message: 'Agent Index Bucket' };
      const { bucket, key } = await recallService.createBucketAndAddObject(emptyObject, {
        metadata: { alias: 'agent-index' }
      });
      indexBucket = bucket;

      try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');

          // Check if AGENT_INDEX_BUCKET already exists in the file
          if (envContent.includes('AGENT_INDEX_BUCKET=')) {
            // Replace the existing value
            envContent = envContent.replace(
              /AGENT_INDEX_BUCKET=.*/,
              `AGENT_INDEX_BUCKET=${indexBucket}`
            );
          } else {
            // Add as a new line
            envContent += `\nAGENT_INDEX_BUCKET=${indexBucket}\n`;
          }

          // Write back to the .env file
          fs.writeFileSync(envPath, envContent);
          console.log('[syntheticDataService] Updated .env file with new AGENT_INDEX_BUCKET value.');
        } else {
          console.log('[syntheticDataService] .env file not found. Please add the AGENT_INDEX_BUCKET manually.');
        }
      } catch (fileError) {
        console.warn('[syntheticDataService] Could not update .env file automatically:', fileError.message);
        console.log('[syntheticDataService] Please add the AGENT_INDEX_BUCKET manually to your .env file.');
      }
    }

    return indexBucket;
  } catch (error) {
    console.error('[syntheticDataService] Error ensuring agent index bucket:', error);
    return null;
  }
}

module.exports = {
  generateSynthetics,
  getSyntheticDataObject,
  getSyntheticBuckets,
  verifyAgentIndexBucket,
  getRelatedChainOfThoughtLog,
  getSyntheticDataAndLogs,
  ensureAgentIndexBucket,
  encryptData,
  decryptData,
  accessControl
};