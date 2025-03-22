// frontend/src/pages/AgentIndexDashboard.jsx
import React, { useState, useEffect } from 'react';
import { listAgentObjects, fetchAgentObject } from '../services/api';

function AgentIndexDashboard() {
  const [groupedObjects, setGroupedObjects] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [fetchedData, setFetchedData] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
          initialExpandedState[timestamp] = true;
        });
        setExpandedGroups(initialExpandedState);
        
        // Auto-fetch data for all objects in valid groups
        const fetchPromises = [];
        Object.values(grouped).forEach(group => {
          [...group.logs, ...group.synthetic].forEach(obj => {
            fetchPromises.push(handleFetch(obj.key));
          });
        });
        
        await Promise.all(fetchPromises);
        
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

  async function handleFetch(key) {
    try {
      const res = await fetchAgentObject(key);
      const content = res.data.content;
      
      setFetchedData(prev => ({
        ...prev,
        [key]: content
      }));
      
      return content;
    } catch (err) {
      console.error(`Error fetching object ${key}:`, err);
      return null;
    }
  }

  const toggleGroup = (timestamp) => {
    setExpandedGroups(prev => ({
      ...prev,
      [timestamp]: !prev[timestamp]
    }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold mb-4">Stored Synthethic Data </h1>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3">Loading ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">Stored Synthethic Data</h1>

      {status && (
        <div className={`mb-4 p-2 ${error ? 'bg-red-100' : 'bg-blue-50'} border rounded text-sm`}>
          {status}
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
            .map(([timestamp, group]) => (
              <div key={timestamp} className="border rounded overflow-hidden">
                <div 
                  className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleGroup(timestamp)}
                >
                  <div>
                    <span className="font-medium">{formatTimestamp(timestamp)}</span>
                    <span className="ml-2 text-gray-500 text-sm">
                      ({group.logs.length} logs, {group.synthetic.length} synthetic data files)
                    </span>
                  </div>
                  <button className="text-gray-500">
                    {expandedGroups[timestamp] ? '▼' : '►'}
                  </button>
                </div>

                {expandedGroups[timestamp] && (
                  <div className="p-3 bg-white">
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
                                    {typeof fetchedData[obj.key] === 'object' 
                                      ? JSON.stringify(fetchedData[obj.key], null, 2)
                                      : fetchedData[obj.key]}
                                  </pre>
                                </div>
                              ) : (
                                <div className="italic text-gray-500 text-xs mt-1">Loading data...</div>
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
                                    {typeof fetchedData[obj.key] === 'object' 
                                      ? JSON.stringify(fetchedData[obj.key], null, 2)
                                      : fetchedData[obj.key]}
                                  </pre>
                                </div>
                              ) : (
                                <div className="italic text-gray-500 text-xs mt-1">Loading data...</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default AgentIndexDashboard;