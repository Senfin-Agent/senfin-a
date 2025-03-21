// backend/src/controllers/synthesisController.js
const syntheticDataService = require('../services/syntheticDataService');

exports.startSynthesis = async (req, res) => {
    try {
        const { datasetSpec } = req.body;
        if (!datasetSpec) {
            return res.status(400).json({ error: 'Missing datasetSpec' });
        }

        const result = await syntheticDataService.generateSynthetics(datasetSpec);

        return res.json({
            success: true,
            message: 'Synthetic data generated and stored in Recall.',
            data: result
        });
    } catch (err) {
        console.error('[startSynthesis] error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.fetchSynthesisObject = async (req, res) => {
    try {
        // Suppose we pass 'bucket' and 'key' in the URL or query
        const { bucket, key } = req.params; // or req.query
        if (!bucket || !key) {
            return res.status(400).json({ error: 'Missing bucket or key' });
        }

        const data = await syntheticDataService.getSyntheticDataObject(bucket, key);
        return res.json({
            success: true,
            data
        });
    } catch (err) {
        console.error('[fetchSynthesisObject] error:', err);
        return res.status(500).json({ error: err.message });
    }
};