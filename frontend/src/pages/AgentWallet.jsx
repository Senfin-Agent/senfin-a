import React, { useState } from 'react';
import { createAgentWallet, getAgentBalance } from '../services/api';

function AgentWallet() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');

  const handleCreateWallet = async () => {
    setError('');
    try {
      const res = await createAgentWallet();
      setWallet(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleGetBalance = async () => {
    if (!wallet) {
      setError('You need to create a wallet first');
      return;
    }
    setError('');
    try {
      const res = await getAgentBalance(wallet.address);
      setBalance(res.data.balance);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Synthetic Data Agent Wallet</h1>
      <p className="mt-4 text-gray-600">
        This wallet allows the autonomous agent to manage funds for on-chain synthetic data transactions,
        licensing fees, and more.
      </p>

      <div className="mt-6">
        <button
          onClick={handleCreateWallet}
          className="px-4 py-2 border mr-4"
        >
          Create/Load Wallet
        </button>

        <button
          onClick={handleGetBalance}
          className="px-4 py-2 border"
          disabled={!wallet}
        >
          Check Wallet Balance
        </button>

        {error && (
          <div className="mt-4 text-red-500">
            <strong>Error:</strong> {error}
          </div>
        )}

        {wallet && (
          <div className="mt-4">
            <p><strong>Wallet Address:</strong> {wallet.address}</p>
          </div>
        )}

        {balance !== null && (
          <div className="mt-4">
            <p><strong>Balance:</strong> {balance} ETH</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentWallet;
