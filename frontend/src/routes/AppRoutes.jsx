import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import AgentWallet from '../pages/AgentWallet';
// We'll import the renamed DataSynthesis page
import DataSynthesis from '../pages/DataSynthesis';

import RecallDashboard from '../pages/RecallDashboard';


function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* changed path from "/verify" to "/synthesize" */}
      <Route path="/synthesize" element={<DataSynthesis />} />
      <Route path="/wallet" element={<AgentWallet />} />
      {/* Add additional routes as needed */}
      <Route path="/recall" element={<RecallDashboard />} />
      <Route path="/recall" element={<RecallDashboard />} />

    </Routes>
  );
}

export default AppRoutes;
