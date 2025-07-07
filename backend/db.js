const mysql = require('mysql2');

// Configura los datos de conexión a tu base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root', // Coloca tu contraseña si tiene
  database: 'reciclaje_inteligente' // Este debe ser el nombre de tu base de datos
});

// Establece la conexión
connection.connect((err) => {
  if (err) {
    console.error('❌ Error de conexión a MySQL:', err.stack);
    return;
  }
  console.log('✅ Conectado a la base de datos MySQL local con ID', connection.threadId);
});

module.exports = connection;
