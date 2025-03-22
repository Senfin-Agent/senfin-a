// frontend/src/pages/AgentIndexDashboard.jsx
import React, { useState, useEffect } from 'react';
import { listAgentObjects, fetchAgentObject, checkAccess, purchaseAccess, getUserAccessibleDatasets } from '../services/api';

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
    
    // First pass: group objects by timestamp
    objects.forEach(obj => {
      const timestamp = extractTimestamp(obj.key);
      if (!timestamp) return;
      
      if (!tempGrouped[timestamp]) {
        tempGrouped[timestamp] = {
          logs: [],
          synthetic: []
        };
      }
      
      if (obj.key.startsWith('logs/cot/')) {
        tempGrouped[timestamp].logs.push(obj);
      } else if (obj.key.includes('synthetic-data/')) {
        tempGrouped[timestamp].synthetic.push(obj);
      }
    });
    
    // Second pass: filter out timestamps without both log and synthetic data
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
  
  // Connect wallet function (simplified for MVP)
  const connectWallet = async () => {
    try {
      // In a real implementation, this would connect to MetaMask or another wallet
      const mockAddress = '0x' + Math.random().toString(16).substring(2, 12);
      setUserAddress(mockAddress);
      
      // After connecting, check which datasets the user has access to
      const result = await getUserAccessibleDatasets(mockAddress);
      if (result && result.success) {
        setAccessibleDatasets(result.accessibleDatasets);
      }
      
      setStatus(`Connected to wallet: ${mockAddress}`);
      return mockAddress;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStatus(`Error connecting wallet: ${error.message}`);
      return null;
    }
  };
  
  // Purchase access to a dataset
  const handlePurchaseAccess = async (timestamp) => {
    try {
      if (!userAddress) {
        const address = await connectWallet();
        if (!address) {
          setStatus('Please connect your wallet first');
          return;
        }
      }
      
      setStatus(`Processing purchase for dataset ${timestamp}...`);
      
      // Mock payment proof for MVP
      const paymentProof = { 
        amount: '10', 
        currency: 'USDC', 
        timestamp: Date.now() 
      };
      
      const result = await purchaseAccess(timestamp, userAddress, paymentProof);
      
      if (result && result.success) {
        setStatus(`Successfully purchased access to dataset ${timestamp}`);
        // Update accessible datasets
        setAccessibleDatasets(prev => [...prev, timestamp]);
      } else {
        setStatus(`Failed to purchase access: ${result?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error purchasing access:', error);
      setStatus(`Error: ${error.message}`);
    }
  };
  
  // Check if user has access to datasets
  const checkUserAccess = async () => {
    if (!userAddress) return;
    
    try {
      const result = await getUserAccessibleDatasets(userAddress);
      
      if (result && result.success) {
        setAccessibleDatasets(result.accessibleDatasets);
      }
    } catch (error) {
      console.error('Error checking user access:', error);
    }
  };

  // Load all objects on component mount
  useEffect(() => {
    async function loadObjects() {
      try {
        setStatus('Loading objects...');
        setLoading(true);
        setError(null);

        // Connect wallet first for MVP
        await connectWallet();
        
        const res = await listAgentObjects('');
        const objects = res.data.objects || [];
        
        // Filter out objects that don't match the correct pattern
        const validObjects = objects.filter(obj => {
          // Keep only logs/cot/*.txt and synthetic-data/*.json files
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
      // In a real implementation, this would call the backend to decrypt
      // For simplicity in this MVP, we'll simulate decryption client-side
      
      // This is a placeholder for actual decryption logic
      if (encryptedData && encryptedData.encrypted && encryptedData.iv) {
        // Simulate successful decryption
        return `Decrypted data would appear here. Using key: ${decryptionKey.substring(0,3)}...`;
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
      // Check if user has access first
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
      
      // If we already have the data, don't fetch it again
      if (fetchedData[key]) return;
      
      setStatus(`Fetching data for ${key}...`);
      const res = await fetchAgentObject(key);
      const content = res.data.content;
      
      let decryptedContent;
      
      // Check if this is encrypted data
      if (content && content.encryptedData) {
        decryptedContent = decryptObject(content.encryptedData);
      } else if (typeof content === 'string' && content.includes('"encrypted":') && content.includes('"iv":')) {
        // If it's a string that looks like it contains encrypted data (for log files)
        try {
          const parsedContent = JSON.parse(content);
          decryptedContent = decryptObject(parsedContent);
        } catch (e) {
          decryptedContent = processContent(content);
        }
      } else {
        // Not encrypted or unknown format
        decryptedContent = processContent(content);
      }
      
      // For encrypted content, we need to also store the raw encrypted data
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
    
    // Load data when group is expanded for the first time
    if (!isCurrentlyExpanded) {
      if (groupedObjects[timestamp]) {
        // Check if user has access first
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
          Wallet: {userAddress ? userAddress : 'Not connected'}
        </div>
        
        <button 
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {userAddress ? 'Change Wallet' : 'Connect Wallet'}
        </button>
        
        <div className="flex-1"></div>
        
        <input
          type="password"
          placeholder="Decryption Key"
          value={decryptionKey}
          onChange={(e) => setDecryptionKey(e.target.value)}
          className="p-2 border rounded"
        />
      </div>

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
            .sort(([a], [b]) => b.localeCompare(a)) // Sort by timestamp descending
            .map(([timestamp, group]) => {
              const hasAccess = accessibleDatasets.includes(timestamp);
              
              return (
                <div key={timestamp} id={`dataset-${timestamp}`} className="border rounded overflow-hidden">
                  <div 
                    className={`p-3 flex justify-between items-center cursor-pointer ${
                      hasAccess ? 'bg-green-50' : 'bg-gray-100'
                    }`}
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
                    </div>
                    <div className="flex items-center space-x-2">
                      {!hasAccess && (
                        <button 
                          className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePurchaseAccess(timestamp);
                          }}
                        >
                          Purchase Access
                        </button>
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
                          <button 
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => handlePurchaseAccess(timestamp)}
                          >
                            Purchase Access
                          </button>
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
    </div>
  );
}

export default AgentIndexDashboard;