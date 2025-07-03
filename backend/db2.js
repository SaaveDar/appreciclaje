// backend/db2.js
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'bjrazdoyvhxjqgx1ezlk-mysql.services.clever-cloud.com',   // ✅ hosting remoto
  user: 'ur5tlszso76lti47',
  password: 'vUEUnJXSq9UmXaq1Lkyy,',
  database: 'bjrazdoyvhxjqgx1ezlk',
  port: 3306  ,                // opcional, si es diferente al default
  charset: 'utf8mb4'
});

// Verificar la conexión
connection.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar a MySQL:', err.message);
    return;
  }
  console.log('✅ Conexión exitosa a MySQL remoto');
});

module.exports = connection;
