// server.js

const jwt = require('jsonwebtoken');
const SECRET_KEY = 'MI_CLAVE_SUPER_SECRETA_123'; // 🔐 puedes cambiarla, NO compartirla


const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connection = require('./db2');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // ⚠️ ajusta según tus necesidades
  }
});

const PORT = 3000;

app.use(cors());
app.use(express.json());

// ✅ Ruta de prueba: para consultar
app.get('/api/tipos-residuos', (req, res) => {
  const query = 'SELECT id, nombre, descripcion, icono_url, images1, images2, images3, images4, images5 FROM tipos_residuos WHERE estado = 1  LIMIT 100;';

  connection.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error al consultar:', err.message);
      return res.status(500).json({ error: err.message });
    }

    res.status(200).json(results);
  });
});

// 🟢 Escuchar conexiones WebSocket
io.on('connection', (socket) => {
  console.log('🧠 Cliente conectado vía WebSocket');

  socket.on('disconnect', () => {
    console.log('🚪 Cliente desconectado');
  });
});

// ⏱️ Polling a la base de datos cada 15 segundos (AJUSTADO)
let lastDataJSON = '';
setInterval(() => {
  connection.query('SELECT id, nombre, descripcion, icono_url, images1, images2, images3, images4, images5 FROM tipos_residuos WHERE estado = 1  LIMIT 100;', (err, results) => {
    if (err) return console.error('❌ Error al consultar:', err.message);

    const newDataJSON = JSON.stringify(results);
    if (newDataJSON !== lastDataJSON) {
      console.log('🔔 Cambio detectado en tipos_residuos');
      lastDataJSON = newDataJSON;
      io.emit('tipos-residuos-actualizado', results);
    }
  });
}, 15000); // 15 segundos en lugar de 5 segundos

/* 🚀 Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
*/

// // ✅ Ruta para registrar usuarios
app.post('/api/registrar', (req, res) => {
  let { nombre, correo, contrasena, ubicacion_actual, fecha_registro } = req.body;

  if (!nombre || !correo || !contrasena || !ubicacion_actual || !fecha_registro) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
  }

  nombre = nombre.toUpperCase(); // ✅ Convertir a mayúsculas

  // 🔍 Verificar si ya existe el correo o el nombre
  const checkQuery = `SELECT * FROM usuarios WHERE correo = ? OR nombre = ?`;
  connection.query(checkQuery, [correo, nombre], (checkErr, results) => {
    if (checkErr) {
      console.error('❌ Error al verificar existencia:', checkErr.message);
      return res.status(500).json({ mensaje: 'Error al verificar usuario existente', error: checkErr.message });
    }

    if (results.length > 0) {
      return res.status(409).json({ mensaje: 'Este usuario ya está registrado.' });
    }

    // ✅ Insertar nuevo usuario
    const insertQuery = `INSERT INTO usuarios (nombre, correo, contrasena, ubicacion_actual, fecha_registro)
                         VALUES (?, ?, ?, ?, ?)`;

    connection.query(insertQuery, [nombre, correo, contrasena, ubicacion_actual, fecha_registro], (insertErr, result) => {
      if (insertErr) {
        console.error('❌ Error al registrar usuario:', insertErr.message);
        return res.status(500).json({ mensaje: 'Error al registrar usuario', error: insertErr.message });
      }

      res.status(200).json({ mensaje: '✅ Usuario registrado correctamente', id: result.insertId });
    });
  });
});


// ✅ Ruta de inicio de sesión
app.post('/api/login', (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios' });
  }

  //const query = 'SELECT * FROM usuarios WHERE correo = ?';
  const query = `
  SELECT 

    CONCAT(
      SUBSTRING_INDEX(nombre, ' ', 1), 
      ' ', 
      LEFT(SUBSTRING_INDEX(SUBSTRING_INDEX(nombre, ' ', 2), ' ', -1), 1), 
      '.'
    ) AS nombre, correo, contrasena, id
  FROM usuarios 
  WHERE correo = ?`;

  connection.query(query, [correo], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar usuario:', err.message);
      return res.status(500).json({ mensaje: 'Error al consultar usuario', error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const usuario = results[0];

    if (usuario.contrasena !== contrasena) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // 🔐 Generar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo
      },
      SECRET_KEY,
      { expiresIn: '1h' } // 🔓 Token válido por 1 hora
    );

    // ✅ Respuesta con token
    res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo
      }
    });
  });
});

// ✅ Middleware para verificar el token
function verificarToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(403).json({ mensaje: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.usuario = decoded; // lo puedes usar en la ruta
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

// a. script para el juego
app.post('/api/juego/guardar-puntaje', (req, res) => {
  const { usuario_id, puntaje } = req.body;

  if (!usuario_id || puntaje == null) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const getQuery = `SELECT * FROM progreso_juego WHERE usuario_id = ?`;
  connection.query(getQuery, [usuario_id], (err, result) => {
    if (err) return res.status(500).json({ mensaje: 'Error al consultar progreso', error: err.message });

    const nuevoNivel = puntaje >= 500 ? 3 : puntaje >= 300 ? 2 : 1;
    let medallas = '';
    if (puntaje >= 100) medallas += '🥉';
    if (puntaje >= 300) medallas += '🥈';
    if (puntaje >= 500) medallas += '🥇';

    if (result.length === 0) {
      // Insertar nuevo
      const insert = `INSERT INTO progreso_juego (usuario_id, puntaje, nivel, medallas) VALUES (?, ?, ?, ?)`;
      connection.query(insert, [usuario_id, puntaje, nuevoNivel, medallas], (err2) => {
        if (err2) return res.status(500).json({ mensaje: 'Error al insertar', error: err2.message });
        return res.status(200).json({ mensaje: '✅ Progreso registrado correctamente (nuevo)' });
      });
    } else {
      // Actualizar si ya existe
      const update = `UPDATE progreso_juego SET puntaje = puntaje + ?, nivel = ?, medallas = ? WHERE usuario_id = ?`;
      connection.query(update, [puntaje, nuevoNivel, medallas, usuario_id], (err2) => {
        if (err2) return res.status(500).json({ mensaje: 'Error al actualizar', error: err2.message });
        return res.status(200).json({ mensaje: '✅ Progreso actualizado correctamente' });
      });
    }
  });
});



// ✅ Ruta protegida (fuera de la función verificarToken)
app.get('/api/protegido', verificarToken, (req, res) => {
  res.json({ mensaje: '🔐 Ruta protegida accedida', usuario: req.usuario });
});




// 🚀 Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
