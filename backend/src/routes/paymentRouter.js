const express = require('express');
const router = express.Router();
const tokenAccessService = require('../services/tokenAccessService');

/**
 * Get dataset price
 * GET /api/access/price
 */
router.get('/price', async (req, res) => {
  try {
    const { datasetTimestamp } = req.query;
    
    if (!datasetTimestamp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required field: datasetTimestamp' 
      });
    }
    
    const price = await tokenAccessService.getDatasetPrice(datasetTimestamp);
    
    return res.status(200).json({
      success: true,
      datasetTimestamp,
      price
    });
  } catch (error) {
    console.error('Error getting dataset price:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error getting dataset price: ' + error.message 
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
    
    const hasAccess = await tokenAccessService.checkAccess(userAddress, datasetTimestamp);
    
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
    
    const accessibleDatasets = await tokenAccessService.getUserAccessibleDatasets(userAddress);
    
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

/**
 * Get contract information for frontend
 * GET /api/access/contract-info
 */
router.get('/contract-info', async (req, res) => {
  try {
    const contractAddress = tokenAccessService.getContractAddress();
    const contractABI = tokenAccessService.getContractABI();
    
    return res.status(200).json({
      success: true,
      contractAddress,
      contractABI
    });
  } catch (error) {
    console.error('Error getting contract info:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error getting contract info: ' + error.message 
    });
  }
});

module.exports = router;