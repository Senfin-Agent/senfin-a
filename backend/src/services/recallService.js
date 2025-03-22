// backend/src/services/recallService.js
require('dotenv').config();
const { testnet } = require('@recallnet/chains');
const { createWalletClient, http, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

/**
 * Dynamically import the ESM-based RecallClient
 */
async function createRecallClient() {
  const { RecallClient } = await import('@recallnet/sdk/client');

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('No PRIVATE_KEY in env');
  }
  const formattedPrivateKey = privateKey.startsWith('0x')
    ? privateKey
    : `0x${privateKey}`;

  const walletClient = createWalletClient({
    account: privateKeyToAccount(formattedPrivateKey),
    chain: testnet,
    transport: http(),
  });

  return new RecallClient({ walletClient });
}

/**
 * Check the account's current 'credit_free' via creditManager.getCreditBalance().
 * If it's 0, buy 1 credit (using 'creditManager.buy(parseEther("1"))').
 */
async function ensureCreditBalanceIfZero(recall) {
  const creditManager = recall.creditManager();
  const { result: creditBalance } = await creditManager.getCreditBalance();
  // creditBalance might look like: { creditFree: "0", creditCommitted: "...", ... }

  const creditFree = Number(creditBalance?.creditFree ?? 0);
  console.log(`[RecallService] Current credit_free: ${creditFree}`);

  if (creditFree === 0) {
    console.log('[RecallService] credit_free is 0, buying 1 credit...');
    const { meta } = await creditManager.buy(parseEther("1"));
    console.log('Credit purchased at tx:', meta?.tx?.transactionHash);
  }
}

/**
 * Creates a new bucket, then adds the dataObject as an object to it.
 * If credit_free is 0, it automatically buys 1 credit first.
 */
async function createBucketAndAddObject(dataObject) {
  // 1) Create the Recall client
  const recall = await createRecallClient();

  // 2) Ensure we have credit before storing data
  await ensureCreditBalanceIfZero(recall);

  // 3) Create a new bucket
  const bucketManager = recall.bucketManager();
  const {
    result: { bucket },
  } = await bucketManager.create();
  console.log('[RecallService] Bucket created:', bucket);

  // 4) Convert the data object to JSON & add it
  return addObjectToBucketInternal(recall, bucket, dataObject, 'synthetics');
}

/**
 * Adds dataObject to an **existing** bucket at a given prefix or key path.
 * If credit_free is 0, it automatically buys 1 credit first.
 *
 * @param {string} bucketAddress - The address of the existing bucket
 * @param {Object} dataObject - The data to store (JSON)
 * @param {string} prefix - Optional prefix for the key (e.g., "cot", "synthetics")
 * @returns {Promise<{bucket: string, key: string, txHash: string}>}
 */
async function addObjectToExistingBucket(bucket, dataObject, prefix = 'synthetics') {
  const recall = await createRecallClient();
  await ensureCreditBalanceIfZero(recall);

  const bucketManager = recall.bucketManager();

  // Convert data to JSON
  const contentString = JSON.stringify(dataObject, null, 2);
  const fileBuffer = Buffer.from(contentString, 'utf8');

  const timestamp = Date.now();
  const key = `${prefix}/${dataObject.id || timestamp}.json`;

  const { meta } = await bucketManager.add(bucket, key, fileBuffer);
  const txHash = meta?.tx?.transactionHash;

  console.log(`[recallService] Object added to existing bucket:`, { bucket, key, txHash });
  return { bucket, key, txHash };
}

/**
 * Internal helper that actually adds the object to a bucket
 */
async function addObjectToBucketInternal(recall, bucket, dataObject, prefix) {
  const bucketManager = recall.bucketManager();
  const contentString = JSON.stringify(dataObject, null, 2);
  const fileBuffer = Buffer.from(contentString, 'utf8');
  const timestamp = Date.now();

  // Key format: prefix/<unique timestamp>.json or .txt
  const key = `${prefix}/${dataObject.id || timestamp}.json`;

  const { meta } = await bucketManager.add(bucket, key, fileBuffer);
  const txHash = meta?.tx?.transactionHash;

  console.log('[RecallService] Object added:', { bucket, key, txHash });
  return { bucket, key, txHash };
}

/**
 * Retrieves an object from the specified bucket & key, 
 * parsing as JSON if possible, otherwise returning as plain text.
 */
async function getObject(bucket, key) {
  const recall = await createRecallClient();
  const bucketManager = recall.bucketManager();

  try {
    const { result: objectBuf } = await bucketManager.get(bucket, key);
    const textContent = new TextDecoder().decode(objectBuf);

    // First, check if this is a CoT log with the "Raw LLM text:" prefix
    if (textContent.startsWith('Raw LLM text:')) {
      // For CoT logs, return an object with the raw text and an extracted JSON if possible
      const jsonPart = textContent.substring(textContent.indexOf('{'), textContent.lastIndexOf('}') + 1);

      let extractedJson = null;
      try {
        // Try to parse the JSON part
        extractedJson = JSON.parse(jsonPart);
      } catch (jsonParseError) {
        console.log('[RecallService] Could not parse embedded JSON in CoT log');
      }

      return {
        type: 'cot_log',
        rawText: textContent,
        json: extractedJson
      };
    }

    // For regular JSON objects, try to parse them
    try {
      return JSON.parse(textContent);
    } catch (jsonError) {
      console.log('[RecallService] Object is not valid JSON, returning as text');
      // If parsing fails, return the raw text with a type indicator
      return {
        type: 'plain_text',
        content: textContent
      };
    }
  } catch (error) {
    console.error(`[RecallService] Error fetching object from bucket ${bucket}, key ${key}:`, error);
    throw error;
  }
}

// /**
//  * Query a bucket for objects by prefix, returning a list of { key, value: { hash, size, metadata } }
//  *
//  * @param {string} bucket - The address of the bucket
//  * @param {string} prefix - optional prefix to filter objects, e.g. 'synthetics/'
//  */
// async function queryBucket(bucket, prefix = '') {
//   const recall = await createRecallClient();
//   const bucketManager = recall.bucketManager();

//   // Pass delimiter as empty string to disable hierarchical grouping.
//   const { result } = await bucketManager.query(bucket, { prefix, delimiter: '' });

//   console.log(result);
//   return result.objects || [];
// }

/**
 * Recursively query a bucket for objects by prefix, returning a flat list of
 * { key, value: { hash, size, metadata } }.
 *
 * @param {string} bucket - The address of the bucket.
 * @param {string} prefix - Optional prefix to filter objects, e.g. 'synthetics/'.
 * @returns {Array} Flat list of objects.
 */
async function queryBucket(bucket, prefix = '') {
  try {
    const recall = await createRecallClient();
    const bucketManager = recall.bucketManager();

    // Use delimiter to get a hierarchical view.
    const { result } = await bucketManager.query(bucket, { prefix, delimiter: '/' });

    // Process objects at the current level.
    let objects = (result.objects || []).map(obj => ({
      key: obj.key || 'unknown',
      value: {
        hash: obj.value?.hash || 'unknown',
        size: obj.value?.size || 0,
        metadata: obj.value?.metadata || {}
      }
    }));

    // Recursively query each common prefix (i.e. "folder").
    if (result.commonPrefixes && result.commonPrefixes.length > 0) {
      for (const cp of result.commonPrefixes) {
        const nestedObjects = await queryBucket(bucket, cp);
        objects = objects.concat(nestedObjects);
      }
    }

    // Convert any BigInt values to strings (if needed)
    return objects.map(obj => makeSerializable(obj));
  } catch (error) {
    console.error(`[RecallService] Error querying bucket ${bucket}:`, error);
    return []; // Return empty array on error.
  }
}

/**
 * Helper function to make objects with BigInt values JSON-serializable
 * @param {Object} obj - The object to make serializable
 * @returns {Object} - A serializable version of the object
 */
function makeSerializable(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}
module.exports = {
  createRecallClient,
  ensureCreditBalanceIfZero,
  createBucketAndAddObject,
  addObjectToExistingBucket,
  getObject,
  queryBucket,
  makeSerializable,
};