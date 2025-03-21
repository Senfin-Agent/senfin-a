const recallService = require('../services/recallService.js');

exports.createBucket = async (req, res) => {
  try {
    const bucket = await recallService.createBucket();
    return res.json({ bucket });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.addObject = async (req, res) => {
  try {
    const { bucket, key, content } = req.body;
    const txHash = await recallService.addObject(bucket, key, content);
    return res.json({ txHash });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.queryObjects = async (req, res) => {
  try {
    const { bucket } = req.body;
    const objects = await recallService.queryObjects(bucket);
    return res.json({ objects });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getObject = async (req, res) => {
  try {
    const { bucket, key } = req.body;
    const content = await recallService.getObject(bucket, key);
    return res.json({ content });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.queryBucket = async (req, res) => {
  try {
    const { bucket, prefix } = req.body;
    const objects = await recallService.queryBucket(bucket, prefix || '');
    return res.json({ objects });
  } catch (err) {
    console.error('queryBucket error:', err);
    return res.status(500).json({ error: err.message });
  }
};
