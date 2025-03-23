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
      if (content.type && (content.rawText !== undefined || content.json !== undefined)) {
        if (content.rawText) return content.rawText;
        if (content.json) return JSON.stringify(content.json, null, 2);
        return JSON.stringify(content, null, 2);
      }
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  }

  // Extract timestamp from object key
  const extractTimestamp = (key) => {
    const match = key.match(/(\d{13})/);
    return match ? match[1] : null;
  };

  // Group objects by timestamp and filter to valid pairs (logs and synthetic)
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
    const validGrouped = {};
    Object.entries(tempGrouped).forEach(([timestamp, group]) => {
      if (group.logs.length > 0 && group.synthetic.length > 0) {
        validGrouped[timestamp] = group;
      }
    });
    return validGrouped;
  };

  // Format timestamp to a readable date
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
      // Only synthetic data requires purchase; logs are public
      if (accessibleDatasets.includes(timestamp)) {
        setStatus(`You already have access to synthetic data for dataset ${timestamp}`);
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
        setStatus(`Successfully purchased access to synthetic data for dataset ${timestamp}. Transaction: ${result.transactionHash}`);
        setAccessibleDatasets(prev => [...prev, timestamp]);
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

  // Check if user has access (for synthetic data) and pre-fetch prices
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
        await fetchDatasetPrice(timestamp);
      }
      setAccessibleDatasets(accessibleTimestamps);
    } catch (error) {
      console.error('Error checking user access:', error);
    }
  };

  // Get unregistered datasets (for admin) – unchanged
  const unregisteredDatasets = useMemo(() => {
    return Object.keys(groupedObjects).filter(timestamp =>
      !datasetPrices[timestamp] || datasetPrices[timestamp] === '0'
    );
  }, [groupedObjects, datasetPrices]);

  // Load objects on component mount
  useEffect(() => {
    async function loadObjects() {
      try {
        setStatus('Loading objects...');
        setLoading(true);
        setError(null);
        const res = await listAgentObjects('');
        const objects = res.data.objects || [];
        const validObjects = objects.filter(obj => {
          return (
            (obj.key.startsWith('logs/cot/') && obj.key.endsWith('.txt')) ||
            (obj.key.includes('synthetic-data/') && obj.key.includes('.json'))
          );
        });
        const grouped = groupObjectsByTimestamp(validObjects);
        setGroupedObjects(grouped);
        const initialExpandedState = {};
        Object.keys(grouped).forEach(timestamp => {
          initialExpandedState[timestamp] = false;
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

  // Modified handleFetch to allow logs to be public
  async function handleFetch(key, timestamp) {
    const isLog = key.startsWith('logs/cot/');
    if (!isLog) {
      // For synthetic data, require access
      if (!accessibleDatasets.includes(timestamp)) {
        setFetchedData(prev => ({
          ...prev,
          [key]: {
            raw: null,
            decrypted: "You don't have access to this synthetic data. Please purchase access."
          }
        }));
        return;
      }
    }
    if (fetchedData[key]) return;
    setStatus(`Fetching data for ${key}...`);
    try {
      const res = await fetchAgentObject(key);
      const content = res.data.content;
      let processedContent;
      // For logs, assume data is in plain text
      if (isLog) {
        processedContent = processContent(content);
      } else {
        // For synthetic data, attempt decryption if needed
        if (content && content.encryptedData) {
          processedContent = `Decrypted data would appear here. Using key: ${decryptionKey.substring(0, 3)}...`;
        } else if (typeof content === 'string' && content.includes('"encrypted":') && content.includes('"iv":')) {
          try {
            const parsedContent = JSON.parse(content);
            processedContent = `Decrypted data would appear here. Using key: ${decryptionKey.substring(0, 3)}...`;
          } catch (e) {
            processedContent = processContent(content);
          }
        } else {
          processedContent = processContent(content);
        }
      }
      setFetchedData(prev => ({
        ...prev,
        [key]: {
          raw: content,
          decrypted: processedContent
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

  // Toggle group expansion and load data if needed
  const toggleGroup = (timestamp) => {
    const isCurrentlyExpanded = expandedGroups[timestamp];
    setExpandedGroups(prev => ({
      ...prev,
      [timestamp]: !prev[timestamp]
    }));
    if (!isCurrentlyExpanded && groupedObjects[timestamp]) {
      // For logs, always try to load data
      groupedObjects[timestamp].logs.forEach(obj => {
        if (!fetchedData[obj.key]) {
          handleFetch(obj.key, timestamp);
        }
      });
      // For synthetic data, load only if access is available
      if (accessibleDatasets.includes(timestamp)) {
        groupedObjects[timestamp].synthetic.forEach(obj => {
          if (!fetchedData[obj.key]) {
            handleFetch(obj.key, timestamp);
          }
        });
      }
      if (!datasetPrices[timestamp]) {
        fetchDatasetPrice(timestamp);
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
    <div className="min-h-screen pt-20 pb-10 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="mx-auto max-w-4xl bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
            Stored Synthetic Data
          </h1>
          <p className="mt-3 text-gray-600">
            Access and manage your stored data securely with blockchain verification.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center mb-4 space-x-2">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                Wallet: {userAddress ? (
                  <span className="font-medium">
                    {userAddress} {isAdmin && <span className="text-purple-600 font-semibold">(Admin)</span>}
                  </span>
                ) : 'Not connected'}
              </div>
              {!userAddress && (
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg hover:shadow-md transition-all"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            {!web3Available && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <svg className="w-6 h-6 flex-shrink-0 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-yellow-800">
                  Web3 is not available. Please install MetaMask to purchase access to datasets.
                </p>
              </div>
            )}

            {status && (
              <div className={`p-4 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'} border rounded-lg flex items-start gap-3`}>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={error ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                </svg>
                <p>{status}</p>
              </div>
            )}

            {accessibleDatasets.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Your Accessible Synthetic Datasets</h3>
                <div className="flex flex-wrap gap-2">
                  {accessibleDatasets.map(timestamp => (
                    <div key={timestamp}
                      className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm cursor-pointer hover:bg-green-200 transition-colors shadow-sm"
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
          </div>

          {/* {isAdmin && ( */}
             <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
              {/* <h3 className="font-medium text-indigo-800 mb-3">Admin Controls: Register Dataset</h3> */}
              {/* <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={registerTimestamp}
                  onChange={(e) => setRegisterTimestamp(e.target.value)}
                  className="border border-indigo-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                >
                  <option value="">Select a dataset to register</option>
                  {unregisteredDatasets.map(t => (
                    <option key={t} value={t}>{formatTimestamp(t)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={registerPrice}
                  onChange={(e) => setRegisterPrice(e.target.value)}
                  className="border border-indigo-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
                  placeholder="Price in ETH"
                />
                <button
                  onClick={handleRegisterDataset}
                  disabled={isRegistering || !registerTimestamp || !registerPrice}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-medium rounded-lg hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isRegistering ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registering...
                    </span>
                  ) : "Register Dataset"}
                </button>
              </div>
            </div> */}
          {/* )} */}

          {/* <div className="mt-6"> */}
            {Object.keys(groupedObjects).length === 0 ? (
              <div className="p-6 border bg-gray-50 text-center rounded-xl">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="mt-4 text-gray-600">No matching log and synthetic data pairs found</p>
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
                      <div key={timestamp} id={`dataset-${timestamp}`} className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div
                          className={`p-4 flex justify-between items-center cursor-pointer ${hasAccess ? 'bg-gradient-to-r from-green-50 to-blue-50' : 'bg-gradient-to-r from-gray-50 to-blue-50'}`}
                          onClick={() => toggleGroup(timestamp)}
                        >
                          <div>
                            <span className="font-medium">{formatTimestamp(timestamp)}</span>
                            <span className="ml-2 text-gray-500 text-sm">
                              ({group.logs.length} logs, {group.synthetic.length} synthetic data files)
                            </span>
                            {hasAccess ? (
                              <span className="ml-2 text-green-600 text-sm font-semibold bg-green-100 px-2 py-0.5 rounded-full">
                                Access Granted
                              </span>
                            ) : (
                              <span className="ml-2 text-red-600 text-sm font-semibold bg-red-100 px-2 py-0.5 rounded-full">
                                Synthetic Access Required
                              </span>
                            )}
                            {isRegistered && !hasAccess && (
                              <span className="ml-2 text-blue-600 text-sm bg-blue-100 px-2 py-0.5 rounded-full">
                                Price: {price} ETH
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {!hasAccess && isRegistered && (
                              <button
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-sm rounded-lg hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed transition-all"
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
                                  `Purchase (${price} ETH)`
                                )}
                              </button>
                            )}
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expandedGroups[timestamp] ? 'transform rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {expandedGroups[timestamp] && (
                          <div className="p-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Logs Column - always visible */}
                              <div className="border rounded-xl p-4 bg-blue-50 shadow-inner">
                                <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Logs
                                </h3>
                                <ul className="space-y-3">
                                  {group.logs.map((obj, idx) => (
                                    <li key={idx} className="text-sm">
                                      <div className="font-medium truncate">{obj.key}</div>
                                      {fetchedData[obj.key] ? (
                                        <div className="mt-2 p-3 bg-white border rounded-lg max-h-64 overflow-auto shadow-sm">
                                          <pre className="text-xs whitespace-pre-wrap">
                                            {fetchedData[obj.key].decrypted}
                                          </pre>
                                        </div>
                                      ) : (
                                        <div
                                          className="mt-2 p-3 bg-white border rounded-lg cursor-pointer text-center hover:bg-gray-50 transition-colors shadow-sm"
                                          onClick={() => handleFetch(obj.key, timestamp)}
                                        >
                                          <span className="text-blue-600">Click to load data</span>
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Synthetic Data Column - gated by access */}
                              <div className="border rounded-xl p-4 bg-green-50 shadow-inner">
                                <h3 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Synthetic Data
                                </h3>
                                {hasAccess ? (
                                  <ul className="space-y-3">
                                    {group.synthetic.map((obj, idx) => (
                                      <li key={idx} className="text-sm">
                                        <div className="font-medium truncate">{obj.key}</div>
                                        {fetchedData[obj.key] ? (
                                          <div className="mt-2 p-3 bg-white border rounded-lg max-h-64 overflow-auto shadow-sm">
                                            <pre className="text-xs whitespace-pre-wrap">
                                              {fetchedData[obj.key].decrypted}
                                            </pre>
                                          </div>
                                        ) : (
                                          <div
                                            className="mt-2 p-3 bg-white border rounded-lg cursor-pointer text-center hover:bg-gray-50 transition-colors shadow-sm"
                                            onClick={() => handleFetch(obj.key, timestamp)}
                                          >
                                            <span className="text-green-600">Click to load data</span>
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="p-6 text-center bg-white rounded-lg border">
                                    <svg className="w-12 h-12 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <p className="text-gray-800 mb-3">You need to purchase access to view synthetic data</p>
                                    {isRegistered ? (
                                      <button
                                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                                        onClick={() => handlePurchaseAccess(timestamp)}
                                        disabled={purchaseLoading[timestamp] || !web3Available}
                                      >
                                        {purchaseLoading[timestamp] ? (
                                          <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                                      <p className="text-gray-600 italic">This dataset is not available for purchase yet</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentIndexDashboard;
