import React, { useState } from 'react';
import { generateSyntheticData } from '../services/api';

function DataSynthesis() {
  const [datasetSpec, setDatasetSpec] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [uploadedData, setUploadedData] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target.result;
        const parsedData = JSON.parse(fileContent);
        setUploadedData(parsedData);
        setError('');
      } catch (err) {
        setError('Invalid JSON file. Please upload a valid JSON file.');
        setUploadedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSynthesis = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      // Pass both the dataset spec (text description) and the uploaded data
      const res = await generateSyntheticData({
        datasetSpec,
        sampleData: uploadedData
      });
      setResponse(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!response) return;
    
    const dataStr = JSON.stringify(response, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synthetic-data-result.json';
    a.click();
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Synthetic Data Generation</h1>
      <p className="mt-2">Upload your original data and provide instructions to generate privacy-preserving synthetic data.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block mb-2">Data Description or Instructions:</label>
          <input
            type="text"
            value={datasetSpec}
            onChange={(e) => setDatasetSpec(e.target.value)}
            className="w-full border px-3 py-2"
            placeholder="Example: 'Customer transaction records with anonymized PII'"
          />
        </div>

        <div>
          <label className="block mb-2">Upload Sample Data (JSON):</label>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              id="fileUpload"
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <label
              htmlFor="fileUpload"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 cursor-pointer rounded"
            >
              Choose File
            </label>
            <span className="text-sm">
              {fileName || "No file selected"}
            </span>
          </div>
          {uploadedData && (
            <div className="mt-2 text-sm text-green-600">
              Data loaded successfully: {Array.isArray(uploadedData) ? `${uploadedData.length} records` : '1 record'}
            </div>
          )}
        </div>

        <div className="flex justify-start pt-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            onClick={handleSynthesis}
            disabled={loading || (!datasetSpec.trim() && !uploadedData)}
          >
            {loading ? 'Generating...' : 'Generate Synthetic Data'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="mt-6 bg-gray-50 border rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Synthesis Result</h2>
            <button 
              onClick={handleDownload}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              Download JSON
            </button>
          </div>
          <pre className="text-sm overflow-auto max-h-96 bg-white p-3 border rounded">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default DataSynthesis;