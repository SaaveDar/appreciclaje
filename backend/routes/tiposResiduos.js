// backend/routes/tiposResiduos.js
const express = require('express');
const router = express.Router();
const connection = require('../db'); // Asegúrate de tener la conexión

router.get('/', (req, res) => {
  connection.query('SELECT * FROM tipos_residuos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
