// frontend/src/pages/AgentIndexDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { listAgentObjects, fetchAgentObject } from '../services/api';
import web3Service from '../services/web3Service';

function AgentIndexDashboard() {
  const [groupedObjects, setGroupedObjects] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [fetchedData, setFetchedData] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decryptionKey, setDecryptionKey] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [accessibleDatasets, setAccessibleDatasets] = useState([]);
  const [datasetPrices, setDatasetPrices] = useState({});
  const [web3Available, setWeb3Available] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [registerPrice, setRegisterPrice] = useState('0.001');
  const [registerTimestamp, setRegisterTimestamp] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Initialize Web3 on component mount
  useEffect(() => {
    async function initWeb3() {
      try {
        const initialized = await web3Service.initialize();
        setWeb3Available(initialized);
      } catch (error) {
        console.error('Error initializing Web3:', error);
        setWeb3Available(false);
      }
    }
    initWeb3();
  }, []);

  // Auto-connect wallet when Web3 becomes available
  useEffect(() => {
    async function autoConnect() {
      if (web3Available && !userAddress) {
        await connectWallet();
      }
    }
    autoConnect();
  }, [web3Available]);

  // Once groupedObjects and wallet are ready, check user access and pre-fetch dataset prices
  useEffect(() => {
    if (userAddress && web3Available && Object.keys(groupedObjects).length > 0) {
      checkUserAccess(userAddress);
    }
  }, [groupedObjects, userAddress, web3Available]);

  // Helper function to safely process content for rendering
  function processContent(content) {
    if (content === null || content === undefined) {
      return "No data available";
    }
    if (typeof content === 'string') {
      return content;
    }
    if (typeof content === 'object') {
      // Handle the specific object format with type, rawText, json
      if (content.type && (content.rawText !== undefined || content.json !== undefined)) {
        if (content.rawText) {
          return content.rawText;
        }
        if (content.json) {
          return JSON.stringify(content.json, null, 2);
        }
        return JSON.stringify(content, null, 2);
      }
      // For normal objects, just stringify them
      return JSON.stringify(content, null, 2);
    }
    // For any other type, convert to string
    return String(content);
  }

  // Extract timestamp from object key
  const extractTimestamp = (key) => {
    const match = key.match(/(\d{13})/);
    return match ? match[1] : null;
  };

  // Group objects by timestamp and filter valid pairs
  const groupObjectsByTimestamp = (objects) => {
    const tempGrouped = {};
    objects.forEach(obj => {
      const timestamp = extractTimestamp(obj.key);
      if (!timestamp) return;
      if (!tempGrouped[timestamp]) {
        tempGrouped[timestamp] = { logs: [], synthetic: [] };
      }
      if (obj.key.startsWith('logs/cot/')) {
        tempGrouped[timestamp].logs.push(obj);
      } else if (obj.key.includes('synthetic-data/')) {
        tempGrouped[timestamp].synthetic.push(obj);
      }
    });
    // Filter to only include timestamps that have both logs and synthetic data
    const validGrouped = {};
    Object.entries(tempGrouped).forEach(([timestamp, group]) => {
      if (group.logs.length > 0 && group.synthetic.length > 0) {
        validGrouped[timestamp] = group;
      }
    });
    return validGrouped;
  };

  // Format timestamp to readable date
  const formatTimestamp = (timestamp) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString();
  };

  // Connect wallet function with Web3
  const connectWallet = async () => {
    try {
      if (!web3Available) {
        setStatus('Web3 not available. Please install MetaMask');
        return null;
      }
      setStatus('Connecting to wallet...');
      const address = await web3Service.connectWallet();
      setUserAddress(address);

      // Check if the connected account is the contract owner (admin)
      const isOwner = await web3Service.isContractOwner(address);
      setIsAdmin(isOwner);
      setStatus(isOwner ? `Connected to wallet: ${address} (Admin)` : `Connected to wallet: ${address}`);
      return address;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStatus(`Error connecting wallet: ${error.message}`);
      return null;
    }
  };

  // Fetch dataset price
  const fetchDatasetPrice = async (timestamp) => {
    try {
      if (!web3Available) return;
      const datasetId = web3Service.generateDatasetId(timestamp);
      const price = await web3Service.getDatasetPrice(datasetId);
      setDatasetPrices(prev => ({
        ...prev,
        [timestamp]: price
      }));
      return price;
    } catch (error) {
      console.error(`Error fetching price for dataset ${timestamp}:`, error);
      return '0';
    }
  };

  // Purchase access to a dataset with Web3
  const handlePurchaseAccess = async (timestamp) => {
    try {
      if (!web3Available) {
        setStatus('Web3 not available. Please install MetaMask');
        return;
      }
      if (!userAddress) {
        const address = await connectWallet();
        if (!address) {
          setStatus('Please connect your wallet first');
          return;
        }
      }
      if (accessibleDatasets.includes(timestamp)) {
        setStatus(`You already have access to dataset ${timestamp}`);
        return;
      }
      setPurchaseLoading(prev => ({ ...prev, [timestamp]: true }));
      setStatus(`Processing purchase for dataset ${timestamp}...`);

      // Get dataset price; if not loaded, fetch it
      let price = datasetPrices[timestamp];
      if (!price) {
        price = await fetchDatasetPrice(timestamp);
      }
      if (price === '0') {
        setStatus(`Dataset ${timestamp} is not registered for purchase`);
        setPurchaseLoading(prev => ({ ...prev, [timestamp]: false }));
        return;
      }
      const datasetId = web3Service.generateDatasetId(timestamp);
      const result = await web3Service.purchaseAccess(datasetId, price);
      if (result.success) {
        setStatus(`Successfully purchased access to dataset ${timestamp}. Transaction: ${result.transactionHash}`);
        setAccessibleDatasets(prev => [...prev, timestamp]);

        // Load data for the newly accessible dataset if the group is expanded
        if (expandedGroups[timestamp] && groupedObjects[timestamp]) {
          groupedObjects[timestamp].logs.forEach(obj => {
            if (!fetchedData[obj.key]) {
              handleFetch(obj.key, timestamp);
            }
          });
          groupedObjects[timestamp].synthetic.forEach(obj => {
            if (!fetchedData[obj.key]) {
              handleFetch(obj.key, timestamp);
            }
          });
        }
      } else {
        setStatus(`Failed to purchase access: ${result.error}`);
      }
    } catch (error) {
      console.error('Error purchasing access:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setPurchaseLoading(prev => ({ ...prev, [timestamp]: false }));
    }
  };

  // Register a dataset as admin
  const handleRegisterDataset = async () => {
    try {
      if (!isAdmin) {
        setStatus('Only the contract owner can register datasets');
        return;
      }
      if (!registerTimestamp) {
        setStatus('Please select a dataset to register');
        return;
      }
      if (!registerPrice || parseFloat(registerPrice) <= 0) {
        setStatus('Please enter a valid price');
        return;
      }
      setIsRegistering(true);
      setStatus(`Registering dataset ${registerTimestamp}...`);
      const datasetId = web3Service.generateDatasetId(registerTimestamp);
      const result = await web3Service.registerDataset(datasetId, registerTimestamp, registerPrice);
      if (result.success) {
        setStatus(`Dataset registered successfully. Transaction: ${result.transactionHash}`);
        setDatasetPrices(prev => ({
          ...prev,
          [registerTimestamp]: registerPrice
        }));
        setRegisterTimestamp('');
        setRegisterPrice('0.001');
      } else {
        setStatus(`Failed to register dataset: ${result.error}`);
      }
    } catch (error) {
      console.error('Error registering dataset:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // Check if user has access to datasets using Web3
  const checkUserAccess = async (address) => {
    if (!address || !web3Available) return;
    try {
      const accessibleTimestamps = [];
      const timestamps = Object.keys(groupedObjects);
      for (const timestamp of timestamps) {
        const datasetId = web3Service.generateDatasetId(timestamp);
        const hasAccess = await web3Service.checkAccess(address, datasetId);
        if (hasAccess) {
          accessibleTimestamps.push(timestamp);
        }
        // Also pre-fetch the dataset price
        await fetchDatasetPrice(timestamp);
      }
      setAccessibleDatasets(accessibleTimestamps);
    } catch (error) {
      console.error('Error checking user access:', error);
    }
  };

  // Get unregistered datasets (for admin)
  const unregisteredDatasets = useMemo(() => {
    return Object.keys(groupedObjects).filter(timestamp =>
      !datasetPrices[timestamp] || datasetPrices[timestamp] === '0'
    );
  }, [groupedObjects, datasetPrices]);

  // Load all objects on component mount
  useEffect(() => {
    async function loadObjects() {
      try {
        setStatus('Loading objects...');
        setLoading(true);
        setError(null);
        const res = await listAgentObjects('');
        const objects = res.data.objects || [];
        // Filter out objects that don't match the correct pattern
        const validObjects = objects.filter(obj => {
          return (
            (obj.key.startsWith('logs/cot/') && obj.key.endsWith('.txt')) ||
            (obj.key.includes('synthetic-data/') && obj.key.includes('.json'))
          );
        });
        const grouped = groupObjectsByTimestamp(validObjects);
        setGroupedObjects(grouped);

        // Initialize expanded state for all groups
        const initialExpandedState = {};
        Object.keys(grouped).forEach(timestamp => {
          initialExpandedState[timestamp] = false; // Start collapsed
        });
        setExpandedGroups(initialExpandedState);

        const groupCount = Object.keys(grouped).length;
        setStatus(`Loaded ${groupCount} timestamp groups with matching log and synthetic data pairs`);
      } catch (err) {
        console.error('Error loading objects:', err);
        setError(err.message);
        setStatus(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    loadObjects();
  }, []);

  // Try to decrypt the data with the provided key
  const decryptObject = (encryptedData) => {
    if (!decryptionKey) {
      return "Enter decryption key to view data";
    }
    try {
      if (encryptedData && encryptedData.encrypted && encryptedData.iv) {
        return `Decrypted data would appear here. Using key: ${decryptionKey.substring(0, 3)}...`;
      } else {
        return "Invalid encrypted data format";
      }
    } catch (error) {
      console.error('Error decrypting data:', error);
      return "Decryption failed. Invalid key or corrupted data.";
    }
  };

  async function handleFetch(key, timestamp) {
    try {
      const hasAccess = accessibleDatasets.includes(timestamp);
      if (!hasAccess) {
        setFetchedData(prev => ({
          ...prev,
          [key]: {
            raw: null,
            decrypted: "You don't have access to this data. Please purchase access."
          }
        }));
        return;
      }
      if (fetchedData[key]) return;
      setStatus(`Fetching data for ${key}...`);
      const res = await fetchAgentObject(key);
      const content = res.data.content;
      let decryptedContent;
      if (content && content.encryptedData) {
        decryptedContent = decryptObject(content.encryptedData);
      } else if (typeof content === 'string' && content.includes('"encrypted":') && content.includes('"iv":')) {
        try {
          const parsedContent = JSON.parse(content);
          decryptedContent = decryptObject(parsedContent);
        } catch (e) {
          decryptedContent = processContent(content);
        }
      } else {
        decryptedContent = processContent(content);
      }
      setFetchedData(prev => ({
        ...prev,
        [key]: {
          raw: content,
          decrypted: decryptedContent
        }
      }));
      setStatus('');
    } catch (err) {
      console.error(`Error fetching object ${key}:`, err);
      setFetchedData(prev => ({
        ...prev,
        [key]: {
          raw: null,
          decrypted: `Error fetching data: ${err.message}`
        }
      }));
      setStatus(`Error fetching ${key}: ${err.message}`);
    }
  }

  const toggleGroup = (timestamp) => {
    const isCurrentlyExpanded = expandedGroups[timestamp];
    setExpandedGroups(prev => ({
      ...prev,
      [timestamp]: !prev[timestamp]
    }));
    // When expanding, try to load data if user has access
    if (!isCurrentlyExpanded) {
      if (groupedObjects[timestamp]) {
        const hasAccess = accessibleDatasets.includes(timestamp);
        if (hasAccess) {
          groupedObjects[timestamp].logs.forEach(obj => {
            if (!fetchedData[obj.key]) {
              handleFetch(obj.key, timestamp);
            }
          });
          groupedObjects[timestamp].synthetic.forEach(obj => {
            if (!fetchedData[obj.key]) {
              handleFetch(obj.key, timestamp);
            }
          });
        }
        // Fetch price if not already loaded
        if (!datasetPrices[timestamp]) {
          fetchDatasetPrice(timestamp);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold mb-4">Stored Synthetic Data</h1>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3">Loading ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">Stored Synthetic Data</h1>

      <div className="flex items-center mb-4 space-x-2">
        <div className="p-2 bg-gray-100 rounded">
          Wallet: {userAddress ? (
            <span>
              {userAddress} {isAdmin && <span className="text-purple-600 font-semibold">(Admin)</span>}
            </span>
          ) : 'Not connected'}
        </div>

        {/* <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {userAddress ? 'Change Wallet' : 'Connect Wallet'}
        </button> */}

        <div className="flex-1"></div>

        {/* <input
          type="password"
          placeholder="Decryption Key"
          value={decryptionKey}
          onChange={(e) => setDecryptionKey(e.target.value)}
          className="p-2 border rounded"
        /> */}
      </div>

      {!web3Available && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800">
            Web3 is not available. Please install MetaMask to purchase access to datasets.
          </p>
        </div>
      )}

      {status && (
        <div className={`mb-4 p-2 ${error ? 'bg-red-100' : 'bg-blue-50'} border rounded text-sm`}>
          {status}
        </div>
      )}

      {accessibleDatasets.length > 0 && (
        <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded">
          <h3 className="font-medium text-green-800">Your Accessible Datasets</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {accessibleDatasets.map(timestamp => (
              <div key={timestamp}
                className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm cursor-pointer hover:bg-green-200"
                onClick={() => {
                  toggleGroup(timestamp);
                  const element = document.getElementById(`dataset-${timestamp}`);
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {formatTimestamp(timestamp)}
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(groupedObjects).length === 0 ? (
        <div className="p-4 border bg-gray-50 text-center">
          No matching log and synthetic data pairs found
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedObjects)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([timestamp, group]) => {
              const hasAccess = accessibleDatasets.includes(timestamp);
              const price = datasetPrices[timestamp] || '0';
              const isRegistered = price !== '0';
              return (
                <div key={timestamp} id={`dataset-${timestamp}`} className="border rounded overflow-hidden">
                  <div
                    className={`p-3 flex justify-between items-center cursor-pointer ${hasAccess ? 'bg-green-50' : 'bg-gray-100'}`}
                    onClick={() => toggleGroup(timestamp)}
                  >
                    <div>
                      <span className="font-medium">{formatTimestamp(timestamp)}</span>
                      <span className="ml-2 text-gray-500 text-sm">
                        ({group.logs.length} logs, {group.synthetic.length} synthetic data files)
                      </span>
                      {hasAccess ? (
                        <span className="ml-2 text-green-600 text-sm font-semibold">
                          Access Granted
                        </span>
                      ) : (
                        <span className="ml-2 text-red-600 text-sm font-semibold">
                          Access Required
                        </span>
                      )}
                      {isRegistered && !hasAccess && (
                        <span className="ml-2 text-blue-600 text-sm">
                          Price: {price} ETH
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!hasAccess && isRegistered && (
                        <button
                          className={`px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePurchaseAccess(timestamp);
                          }}
                          disabled={purchaseLoading[timestamp] || !web3Available}
                        >
                          {purchaseLoading[timestamp] ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            'Purchase Access'
                          )}
                        </button>
                      )}

                      {!hasAccess && !isRegistered && (
                        <span className="text-gray-500 text-xs italic">Not available for purchase</span>
                      )}

                      <button className="text-gray-500">
                        {expandedGroups[timestamp] ? '▼' : '►'}
                      </button>
                    </div>
                  </div>

                  {expandedGroups[timestamp] && (
                    <div className="p-3 bg-white">
                      {!hasAccess ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-center">
                          <p className="text-yellow-800">
                            You need to purchase access to view this data.
                          </p>
                          {isRegistered ? (
                            <button
                              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                              onClick={() => handlePurchaseAccess(timestamp)}
                              disabled={purchaseLoading[timestamp] || !web3Available || hasAccess}
                            >
                              {purchaseLoading[timestamp] ? (
                                <span className="flex items-center justify-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </span>
                              ) : (
                                `Purchase Access (${price} ETH)`
                              )}
                            </button>
                          ) : (
                            <p className="mt-2 text-gray-600 italic">
                              This dataset is not available for purchase yet.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {/* Logs Column */}
                          <div className="border rounded p-3 bg-gray-50">
                            <h3 className="font-medium text-blue-600 mb-2">Logs</h3>
                            <ul className="space-y-2">
                              {group.logs.map((obj, idx) => (
                                <li key={idx} className="text-sm">
                                  <div className="font-medium truncate">{obj.key}</div>
                                  {fetchedData[obj.key] ? (
                                    <div className="mt-1 p-2 bg-white border rounded max-h-64 overflow-auto">
                                      <pre className="text-xs whitespace-pre-wrap">
                                        {typeof fetchedData[obj.key].decrypted === 'object'
                                          ? JSON.stringify(fetchedData[obj.key].decrypted, null, 2)
                                          : fetchedData[obj.key].decrypted}
                                      </pre>
                                    </div>
                                  ) : (
                                    <div
                                      className="mt-1 p-2 bg-white border rounded cursor-pointer text-center"
                                      onClick={() => handleFetch(obj.key, timestamp)}
                                    >
                                      Click to load data
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Synthetic Data Column */}
                          <div className="border rounded p-3 bg-gray-50">
                            <h3 className="font-medium text-green-600 mb-2">Synthetic Data</h3>
                            <ul className="space-y-2">
                              {group.synthetic.map((obj, idx) => (
                                <li key={idx} className="text-sm">
                                  <div className="font-medium truncate">{obj.key}</div>
                                  {fetchedData[obj.key] ? (
                                    <div className="mt-1 p-2 bg-white border rounded max-h-64 overflow-auto">
                                      <pre className="text-xs whitespace-pre-wrap">
                                        {typeof fetchedData[obj.key].decrypted === 'object'
                                          ? JSON.stringify(fetchedData[obj.key].decrypted, null, 2)
                                          : fetchedData[obj.key].decrypted}
                                      </pre>
                                    </div>
                                  ) : (
                                    <div
                                      className="mt-1 p-2 bg-white border rounded cursor-pointer text-center"
                                      onClick={() => handleFetch(obj.key, timestamp)}
                                    >
                                      Click to load data
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Admin Panel for Dataset Registration */}
      {/* {isAdmin && (
        <div className="mt-8 p-4 border border-gray-200 rounded bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Admin: Register Dataset for Purchase</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dataset Timestamp
              </label>
              <select
                className="w-full p-2 border rounded"
                value={registerTimestamp}
                onChange={(e) => setRegisterTimestamp(e.target.value)}
              >
                <option value="">Select dataset</option>
                {unregisteredDatasets.map(timestamp => (
                  <option key={timestamp} value={timestamp}>
                    {formatTimestamp(timestamp)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (ETH)
              </label>
              <input
                type="text"
                value={registerPrice}
                onChange={(e) => setRegisterPrice(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="0.001"
              />
            </div>

            <button
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={handleRegisterDataset}
              disabled={isRegistering || !web3Available || !userAddress}
            >
              {isRegistering ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </span>
              ) : (
                'Register Dataset'
              )}
            </button>

            <p className="text-xs text-gray-500 mt-2">
              This will use your connected MetaMask wallet to register the dataset on the blockchain.
              Only the contract owner can register datasets.
            </p>
          </div>
        </div>
      )} */}
    </div>
  );
}

export default AgentIndexDashboard;
