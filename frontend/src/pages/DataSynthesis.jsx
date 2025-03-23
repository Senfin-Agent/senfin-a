import React, { useState, useRef } from 'react';
import { generateSyntheticData } from '../services/api';

function DataSynthesis() {
  const [datasetSpec, setDatasetSpec] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [uploadedData, setUploadedData] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

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
    <div className="min-h-screen pt-20 pb-10 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="mx-auto max-w-4xl bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
            Synthetic Data Generation
          </h1>
          <p className="mt-3 text-gray-600">
            Upload your original data and provide instructions to generate privacy-preserving synthetic data.
          </p>
        </div>

        <div className="space-y-6">
          {/* <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <label className="block text-lg font-medium text-blue-800 mb-3">Data Description or Instructions:</label>
            <input
              type="text"
              value={datasetSpec}
              onChange={(e) => setDatasetSpec(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none transition-all"
              placeholder="Example: 'Customer transaction records with anonymized PII'"
            />
          </div> */}

          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
            <label className="block text-lg font-medium text-indigo-800 mb-3">Upload Sample Data (JSON):</label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                id="fileUpload"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-100 border border-indigo-200 hover:bg-indigo-200 text-indigo-800 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose File
              </button>
              <span className="text-sm font-medium text-gray-600 truncate max-w-xs">
                {fileName || "No file selected"}
              </span>
            </div>
            {uploadedData && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Data loaded successfully: {Array.isArray(uploadedData) ? `${uploadedData.length} records` : '1 record'}
              </div>
            )}
          </div>

          <div className="flex justify-center pt-4">
            <button
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-full shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transform transition-all duration-300 hover:-translate-y-1 disabled:hover:transform-none"
              onClick={handleSynthesis}
              disabled={loading || (!datasetSpec.trim() && !uploadedData)}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Synthetic Data'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
            <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <strong className="font-medium">Error:</strong> {error}
            </div>
          </div>
        )}

        {response && (
          <div className="mt-8 bg-gray-50 border rounded-xl p-6 shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Synthesis Result</h2>
              <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download JSON
              </button>
            </div>
            <pre className="text-sm overflow-auto max-h-96 bg-white p-4 border rounded-lg font-mono">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataSynthesis;