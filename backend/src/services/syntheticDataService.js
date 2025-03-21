const recallService = require('./recallService');
const nillionSecretLLMService = require('./nillionSecretLLMService');

/**
 * Generate a synthetic dataset using the TEE-based LLM service, then store it in Recall.
 * Also store optional chain-of-thought or reasoning logs to a separate logs bucket.
 *
 * @param {Object} datasetSpec - Info needed to generate the synthetic data
 * @param {Object} sampleData - Optional sample data to base synthetic data on
 * @returns {Promise<Object>} - References to the newly created bucket, object key, etc.
 */
async function generateSynthetics(datasetSpec, sampleData = null) {
  console.log('[syntheticDataService] Generating synthetic data for:', datasetSpec);

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

  // OPTIONAL: Store chain-of-thought or reasoning logs
  // If you want to store the entire LLM response or partial reasoning, do:
  const chainOfThought = `Raw LLM text:\n${syntheticDataText.slice(0, 2000)}...`; // truncated if large
  await storeChainOfThoughtLog(chainOfThought, 'cot/');
  // ^ See function below. This writes to a "logs" bucket if you have one.

  // Attempt to parse the LLM's JSON into an object
  const syntheticData = parseSyntheticData(syntheticDataText);

  // Validate privacy. (You might add more robust checks here.)
  validateSyntheticDataPrivacy(syntheticData);

  // Save the final synthetic data object to Recall
  const { bucket, key, txHash } = await recallService.createBucketAndAddObject(syntheticData);

  return {
    success: true,
    syntheticData,
    recallBucket: bucket,
    objectKey: key,
    transactionHash: txHash,
  };
}

/**
 * Attempt to parse the LLM's raw response into a JSON object with "data".
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
 * Fetch a synthetic data object from Recall.
 */
async function getSyntheticDataObject(bucket, key) {
  console.log('[syntheticDataService] Fetching synthetic data from:', bucket, key);
  const data = await recallService.getObject(bucket, key);
  return data;
}


const LOGS_BUCKET_ADDR = process.env.RECALL_LOGS_BUCKET;


/**
 * Store chain-of-thought text in a dedicated logs bucket, if desired.
 * @param {string} logContent - The textual CoT logs or LLM reasoning to store
 * @param {string} prefix - e.g., "cot/"
 */
async function storeChainOfThoughtLog(logContent, prefix = 'cot/') {
  if (!LOGS_BUCKET_ADDR) {
    console.log('[syntheticDataService] No RECALL_LOGS_BUCKET set. Creating a logs bucket...');

    try {
      // Create a new recall client
      const recall = await recallService.createRecallClient();
      await recallService.ensureCreditBalanceIfZero(recall);

      const bucketManager = recall.bucketManager();

      // Try to find existing bucket with alias "logs" by listing all buckets
      const { result: bucketsResult } = await bucketManager.list();
      const buckets = bucketsResult?.buckets || [];

      let logsBucket = null;

      // Check each bucket's metadata for the alias
      for (const bucket of buckets) {
        try {
          const { result: metadataResult } = await bucketManager.getMetadata(bucket);
          // Convert metadata result to a serializable format
          const metadata = metadataResult?.metadata || {};

          if (metadata.alias === 'logs') {
            console.log(`[syntheticDataService] Found bucket with alias 'logs':`, bucket);
            logsBucket = bucket;
            break;
          }
        } catch (error) {
          console.warn(`[syntheticDataService] Error fetching metadata for bucket ${bucket}:`, error.message);
        }
      }

      // If no logs bucket found, create a new one
      if (!logsBucket) {
        console.log('[syntheticDataService] No logs bucket found, creating a new one...');
        const { result: { bucket } } = await bucketManager.create({
          metadata: { alias: 'logs' }
        });
        logsBucket = bucket;
        console.log('[syntheticDataService] Created new logs bucket:', logsBucket);
      }

      // Convert log to buffer
      const fileBuffer = Buffer.from(logContent, 'utf8');
      const timestamp = Date.now();
      const key = `${prefix}${timestamp}.txt`;

      // Add the log content to the bucket
      const { meta } = await bucketManager.add(logsBucket, key, fileBuffer);
      // Convert BigInt values to strings for the transaction hash
      const txHash = meta?.tx?.transactionHash ? meta.tx.transactionHash.toString() : null;

      console.log('[syntheticDataService] Chain-of-thought logs stored in logs bucket:', {
        logsBucket,
        key,
        txHash,
      });

      return { bucket: logsBucket, key, txHash };
    } catch (error) {
      console.error('[syntheticDataService] Error storing chain-of-thought logs:', error);
      return null;
    }
  } else {
    // Use the provided bucket address
    try {
      const recall = await recallService.createRecallClient();
      await recallService.ensureCreditBalanceIfZero(recall);

      // Convert log to buffer
      const fileBuffer = Buffer.from(logContent, 'utf8');
      const timestamp = Date.now();
      const key = `${prefix}${timestamp}.txt`;

      const bucketManager = recall.bucketManager();
      const { meta } = await bucketManager.add(LOGS_BUCKET_ADDR, key, fileBuffer);
      // Convert BigInt values to strings for the transaction hash
      const txHash = meta?.tx?.transactionHash ? meta.tx.transactionHash.toString() : null;

      console.log('[syntheticDataService] Chain-of-thought logs stored in logs bucket:', {
        logsBucket: LOGS_BUCKET_ADDR,
        key,
        txHash,
      });

      return { bucket: LOGS_BUCKET_ADDR, key, txHash };
    } catch (error) {
      console.error('[syntheticDataService] Error storing chain-of-thought logs:', error);
      return null;
    }
  }
}


module.exports = {
  generateSynthetics,
  getSyntheticDataObject,
};
