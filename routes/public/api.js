const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'GIU Food Truck API'
  });
});

module.exports = router;