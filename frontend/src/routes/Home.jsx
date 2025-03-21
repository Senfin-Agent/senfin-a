import React from 'react';

function Home() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Welcome to Senfin-A - Synthetic Data Marketplace</h1>
      <p className="mt-4">
        Senfin-A is an autonomous AI agent system that securely generates and manages synthetic datasets
        for your machine learning or analytics needs—while preserving privacy and on-chain auditability.
      </p>
      <div className="mt-6">
        <p>
          Ready to generate your own synthetic data? Head over to our{' '}
          <a href="/synthesize" className="underline text-blue-600">Data Synthesis Dashboard</a>.
        </p>
      </div>
    </div>
  );
}

export default Home;
