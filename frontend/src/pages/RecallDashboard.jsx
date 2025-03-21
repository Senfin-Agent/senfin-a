// frontend/src/pages/RecallDashboard.jsx
import React, { useState } from 'react';
import { fetchRecallObject, queryRecallBucket } from '../services/api';

function RecallDashboard() {
  const [bucket, setBucket] = useState('');
  const [key, setKey] = useState('');
  const [prefix, setPrefix] = useState('');
  const [fetchedData, setFetchedData] = useState(null);
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  // Debug version: triggers file download and logs details
  const downloadFile = (data, filename, type = 'application/json') => {
    console.log('downloadFile called with:', { data, filename, type });
    // If the data is an object, stringify it.
    const content = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    console.log('Content to download:', content);
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFetch = async () => {
    if (!bucket || !key) {
      alert('Please provide a bucket and key to fetch');
      return;
    }
    try {
      setLoading(true);
      setStatus('Fetching object...');
      setFetchedData(null);
      setError(null);

      const res = await fetchRecallObject(bucket, key);
      console.log('Fetch recall object response:', res);
      
      // Use res.data.content because the backend returns { content }
      const fileContent = res.data?.content;
      console.log('Fetched file content:', fileContent);
      
      if (!fileContent) {
        throw new Error('No content found in response.');
      }
      
      setFetchedData(fileContent);

      // Trigger a download with debug logs.
      const filename = key.split('/').pop() || 'download.json';
      downloadFile(fileContent, filename);

      setStatus('Object fetched and downloaded successfully.');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || err.message);
      setStatus(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!bucket) {
      alert('Please provide a bucket address to query');
      return;
    }
    try {
      setLoading(true);
      setStatus('Querying bucket...');
      setObjects([]);
      setError(null);

      const res = await queryRecallBucket(bucket, prefix);
      console.log('Query bucket response:', res);
      const objectList = res.data?.objects || [];
      const safeObjects = objectList.map(obj => ({
        key: obj.key || 'unknown',
        value: {
          hash: obj.value?.hash || 'unknown',
          size: obj.value?.size || 0,
          metadata: obj.value?.metadata || {}
        }
      }));
      
      setObjects(safeObjects);
      setStatus(`Found ${safeObjects.length} objects in the bucket.`);
    } catch (err) {
      console.error('Query error:', err);
      setError(err.response?.data?.error || err.message);
      setStatus(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectObject = (objKey) => {
    setKey(objKey);
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">Recall Dashboard</h1>

      {status && (
        <div className={`mb-4 p-2 ${error ? 'bg-red-100' : 'bg-gray-100'} border text-sm`}>
          {status}
        </div>
      )}

      <div className="mb-6 border-b pb-4">
        <h2 className="font-semibold mb-2">1. Query a Bucket</h2>
        <label className="block mb-1">Bucket Address</label>
        <input
          type="text"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          placeholder="0xff000000000000..."
          className="border p-2 w-full mb-2"
        />
        <label className="block mb-1">Prefix (optional)</label>
        <input
          type="text"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="e.g. 'cot/' or 'synthetics/'"
          className="border p-2 w-full mb-2"
        />
        <button
          onClick={handleQuery}
          className="px-4 py-2 border bg-blue-100 hover:bg-blue-200"
          disabled={loading}
        >
          {loading ? 'Querying...' : 'Query Bucket'}
        </button>

        {objects.length > 0 && (
          <div className="mt-4 bg-gray-50 p-2 border">
            <h3 className="font-semibold">Objects in Bucket:</h3>
            <ul className="list-disc ml-6">
              {objects.map((obj, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => handleSelectObject(obj.key)}
                    className="underline text-blue-600 hover:text-blue-800"
                  >
                    {obj.key || 'unknown-key'}
                  </button>
                  <small className="ml-2 text-gray-500">
                    hash: {obj.value?.hash || 'unknown'} | size: {obj.value?.size || 0} bytes
                  </small>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-gray-600">
              Click an object key above to populate the "key" field below.
            </p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">2. Fetch an Object by Bucket + Key</h2>
        <label className="block mb-1">Bucket Address</label>
        <input
          type="text"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          placeholder="0xff000000000000..."
          className="border p-2 w-full mb-2"
        />
        <label className="block mb-1">Object Key</label>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="synthetics/synth-123.json"
          className="border p-2 w-full mb-2"
        />
        <button
          onClick={handleFetch}
          className="px-4 py-2 border bg-green-100 hover:bg-green-200"
          disabled={loading}
        >
          {loading ? 'Fetching...' : 'Fetch Object'}
        </button>
      </div>

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

export default RecallDashboard;
