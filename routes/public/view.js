const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.hjs'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/login.hjs'));
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/register.hjs'));
});

router.get('/customerHomepage', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/customerHomepage.hjs'));
});

router.get('/truckOwnerHomePage', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/truckOwnerHomePage.hjs'));
});

module.exports = router;