// server.js adaptado FINAL para consumir api.php correctamente

const jwt = require('jsonwebtoken');
const SECRET_KEY = 'MI_CLAVE_SUPER_SECRETA_123'; // ¡Considera usar variables de entorno!

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } }); // ✅ CORS para WebSocket

const PORT = 3000;
const API_URL = 'https://comunidadvmapps.com/api.php'; // URL de tu API PHP en CPanel

app.use(cors()); // ✅ Habilitar CORS para Express HTTP
app.use(express.json()); // ✅ Para parsear JSON en las solicitudes

// ✔️ Funciones para consumir api.php
const consultarAPI = async (params = '') => {
  const url = `${API_URL}${params}`;
  const response = await axios.get(url);
  return response.data;
};

const enviarDatosAPI = async (data = {}) => {
  const response = await axios.post(API_URL, data, {
    headers: { 'Content-Type': 'application/json' } // ✅ Asegura que Axios envíe JSON
  });
  return response.data;
};

// ✔️ Ruta de prueba: obtener tipos de residuos
app.get('/api/tipos-residuos', async (req, res) => {
  try {
    const results = await consultarAPI('?consulta=tipos-residuos');
    res.status(200).json(results);
  } catch (err) {
    console.error('❌ Error al consultar API PHP:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✔️ WebSocket
io.on('connection', (socket) => {
  console.log('🧠 Cliente conectado vía WebSocket');
  socket.on('disconnect', () => console.log('🚪 Cliente desconectado'));
});

// ✔️ Polling cada 15 segundos para tipos de residuos
let lastDataJSON = '';
setInterval(async () => {
  try {
    const results = await consultarAPI('?consulta=tipos-residuos');
    const newDataJSON = JSON.stringify(results);

    if (newDataJSON !== lastDataJSON) {
      console.log('🔔 Cambio detectado en tipos_residuos');
      lastDataJSON = newDataJSON;
      io.emit('tipos-residuos-actualizado', results); // Emitir a todos los clientes conectados
    }
  } catch (err) {
    console.error('❌ Error en el polling:', err.message);
  }
}, 15000);

// ✔️ Ruta para registrar usuarios (PROXIES a api.php)
app.post('/api/registrar', async (req, res) => {
  try {
    const data = await enviarDatosAPI({ consulta: 'registrar', ...req.body });
    res.status(200).json(data);
  } catch (err) {
    const mensaje = err.response?.data?.mensaje || err.message;
    console.error('❌ Error al registrar usuario:', mensaje);
    res.status(err.response?.status || 500).json({ mensaje });
  }
});

// ✔️ Ruta de login (PROXIES a api.php y genera JWT)
app.post('/api/login', async (req, res) => {
  try {
    const data = await enviarDatosAPI({ consulta: 'login', ...req.body });

    // Si la API PHP devuelve un error o no hay usuario, el catch se encargará.
    // Si llega aquí, significa que el login en PHP fue exitoso.
    if (!data || !data.usuario) {
      // Esto rara vez se ejecutará si la API PHP maneja bien los errores,
      // pero es una capa extra de seguridad.
      return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }

    // Generar JWT si el login fue exitoso en PHP
    const token = jwt.sign({
      id: data.usuario.id,
      nombre: data.usuario.nombre,
      correo: data.usuario.correo
    }, SECRET_KEY, { expiresIn: '1h' }); // Token válido por 1 hora

    res.status(200).json({ mensaje: 'Inicio de sesión exitoso', token, usuario: data.usuario });
  } catch (err) {
    const mensaje = err.response?.data?.mensaje || err.message;
    console.error('❌ Error al iniciar sesión:', mensaje);
    res.status(err.response?.status || 500).json({ mensaje });
  }
});

// ✔️ Middleware para verificar el token
function verificarToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Espera "Bearer TOKEN"
  if (!token) return res.status(403).json({ mensaje: 'Token no proporcionado' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.usuario = decoded; // Adjuntar los datos decodificados al objeto de solicitud
    next(); // Continuar a la siguiente función de middleware/ruta
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

// ✔️ Guardar puntaje del juego (PROXIES a api.php) - ASUME QUE LA LÓGICA ESTÁ EN PHP
app.post('/api/juego/guardar-puntaje', async (req, res) => {
  try {
    const data = await enviarDatosAPI({ consulta: 'guardar-puntaje', ...req.body });
    res.status(200).json(data);
  } catch (err) {
    const mensaje = err.response?.data?.mensaje || err.message;
    console.error('❌ Error al guardar puntaje:', mensaje);
    res.status(err.response?.status || 500).json({ mensaje });
  }
});

// ✔️ Ruta protegida (requiere un token JWT válido)
app.get('/api/protegido', verificarToken, (req, res) => {
  res.json({ mensaje: '🔐 Ruta protegida accedida', usuario: req.usuario });
});

// ✔️ Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});