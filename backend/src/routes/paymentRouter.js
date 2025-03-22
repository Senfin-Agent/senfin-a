const express = require('express');
const router = express.Router();
const syntheticDataService = require('../services/syntheticDataService');

/**
 * Purchase access to a synthetic dataset
 * POST /api/access/purchase
 */
router.post('/purchase', async (req, res) => {
  try {
    const { datasetTimestamp, userAddress, paymentProof } = req.body;
    
    if (!datasetTimestamp || !userAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: datasetTimestamp and userAddress' 
      });
    }
    
    // For MVP, we'll just validate that something was provided as payment proof
    // In a real implementation, this would validate a blockchain transaction or token
    if (!paymentProof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment proof required' 
      });
    }
    
    // Grant access to the dataset
    syntheticDataService.accessControl.grantAccess(datasetTimestamp, userAddress);
    
    return res.status(200).json({
      success: true,
      message: 'Access granted successfully',
      datasetTimestamp,
      userAddress
    });
  } catch (error) {
    console.error('Error purchasing access:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error processing purchase: ' + error.message 
    });
  }
});

/**
 * Check if user has access to a specific dataset
 * GET /api/access/check
 */
router.get('/check', async (req, res) => {
  try {
    const { datasetTimestamp, userAddress } = req.query;
    
    if (!datasetTimestamp || !userAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: datasetTimestamp and userAddress' 
      });
    }
    
    const hasAccess = syntheticDataService.accessControl.hasAccess(datasetTimestamp, userAddress);
    
    return res.status(200).json({
      success: true,
      hasAccess,
      datasetTimestamp,
      userAddress
    });
  } catch (error) {
    console.error('Error checking access:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking access: ' + error.message 
    });
  }
});

/**
 * Get all datasets accessible to a user
 * GET /api/access/user-datasets
 */
router.get('/user-datasets', async (req, res) => {
  try {
    const { userAddress } = req.query;
    
    if (!userAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required field: userAddress' 
      });
    }
    
    const accessibleDatasets = syntheticDataService.accessControl.getUserAccessibleDatasets(userAddress);
    
    return res.status(200).json({
      success: true,
      accessibleDatasets,
      userAddress
    });
  } catch (error) {
    console.error('Error fetching user datasets:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching user datasets: ' + error.message 
    });
  }
});

module.exports = router;