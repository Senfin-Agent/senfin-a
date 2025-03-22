// backend/src/controllers/agentController.js
const recallService = require('../services/recallService');
const AGENT_INDEX_BUCKET = process.env.AGENT_INDEX_BUCKET;

exports.listObjects = async (req, res) => {
  try {
    const prefix = req.query.prefix || '';
    const objects = await recallService.queryBucket(AGENT_INDEX_BUCKET, prefix);
    return res.json({ objects });
  } catch (err) {
    console.error('listObjects error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.fetchObject = async (req, res) => {
  try {
    const { key } = req.params;
    const content = await recallService.getObject(AGENT_INDEX_BUCKET, key);
    return res.json({ content });
  } catch (err) {
    console.error('fetchObject error:', err);
    return res.status(500).json({ error: err.message });
  }
};
