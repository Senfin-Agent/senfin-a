// frontend/src/pages/AgentIndexDashboard.jsx
import React, { useState } from 'react';
import { listAgentObjects, fetchAgentObject } from '../services/api';

function AgentIndexDashboard() {
  const [prefix, setPrefix] = useState('');
  const [objects, setObjects] = useState([]);
  const [fetchedData, setFetchedData] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  async function handleList() {
    try {
      setStatus(`Listing objects with prefix "${prefix}"...`);
      setError(null);
      setFetchedData(null);

      const res = await listAgentObjects(prefix);
      setObjects(res.data.objects || []);
      setStatus(`Found ${res.data.objects?.length || 0} objects`);
    } catch (err) {
      console.error('Error listing objects:', err);
      setError(err.message);
      setStatus(`Error: ${err.message}`);
    }
  }

  async function handleFetch(key) {
    try {
      setStatus(`Fetching object: ${key}`);
      setError(null);

      const res = await fetchAgentObject(key);
      const content = res.data.content;
      setFetchedData(content);

      setStatus(`Fetched object: ${key}`);
    } catch (err) {
      console.error('Error fetching object:', err);
      setError(err.message);
      setStatus(`Error: ${err.message}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">Agent Index Dashboard</h1>

      {status && (
        <div className={`mb-4 p-2 ${error ? 'bg-red-100' : 'bg-gray-100'} border text-sm`}>
          {status}
        </div>
      )}

      <div className="mb-6 border-b pb-4">
        <label className="block font-semibold mb-2">Prefix (optional)</label>
        <input
          type="text"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="e.g. 'synthetic-data/' or 'logs/cot/'"
          className="border p-2 w-full mb-2"
        />
        <button
          onClick={handleList}
          className="px-4 py-2 border bg-blue-100 hover:bg-blue-200"
        >
          List Objects
        </button>
      </div>

      {objects.length > 0 && (
        <div className="mt-4 bg-gray-50 p-2 border">
          <h3 className="font-semibold">Objects:</h3>
          <ul className="list-disc ml-6">
            {objects.map((obj, idx) => (
              <li key={idx}>
                <button
                  onClick={() => handleFetch(obj.key)}
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  {obj.key}
                </button>
                <small className="ml-2 text-gray-500">
                  hash: {obj.value.hash}, size: {obj.value.size} bytes
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fetchedData && (
        <div className="mt-4 bg-gray-50 p-4 border">
          <h3 className="font-semibold mb-2">Fetched Data</h3>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(fetchedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default AgentIndexDashboard;
