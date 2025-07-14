// server.js

const jwt = require('jsonwebtoken');
const SECRET_KEY = 'MI_CLAVE_SUPER_SECRETA_123'; // 🔐 puedes cambiarla, NO compartirla


const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connection = require('./db');

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
  let {
    nombre,
    apellido,
    tipo_documento,
    documento,
    fecha_nacimiento,
    correo,
    contrasena,
    ubicacion_actual,
    fecha_registro
  } = req.body;

  console.log('📥 Datos recibidos:', req.body);

  // ✅ Verificar campos obligatorios
  if (!nombre || !apellido || !tipo_documento || !documento || !fecha_nacimiento || !correo || !contrasena || !ubicacion_actual || !fecha_registro) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
  }

  // 🔠 Convertir a mayúsculas
  nombre = nombre.toUpperCase();
  apellido = apellido.toUpperCase();

  // 🔍 Verificar si ya existe el correo o el documento
  const checkQuery = `SELECT * FROM usuarios WHERE correo = ? OR documento = ?`;
  connection.query(checkQuery, [correo, documento], (checkErr, results) => {
    if (checkErr) {
      console.error('❌ Error al verificar existencia:', checkErr.message);
      return res.status(500).json({ mensaje: 'Error al verificar usuario existente', error: checkErr.message });
    }

    if (results.length > 0) {
      return res.status(409).json({ mensaje: 'Este correo o documento ya está registrado.' });
    }

    // ✅ Insertar nuevo usuario
    const insertQuery = `
      INSERT INTO usuarios
      (nombre, apellido, tipo_documento, documento, fecha_nacimiento, correo, contrasena, ubicacion_actual, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(insertQuery, [nombre, apellido, tipo_documento, documento, fecha_nacimiento, correo, contrasena, ubicacion_actual, fecha_registro], (insertErr, result) => {
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
      SUBSTRING_INDEX(nombre, ' ', 1), ' ',                             -- Primer nombre completo
      UPPER(LEFT(SUBSTRING_INDEX(apellido, ' ', 1), 1)), '.'           -- Inicial del primer apellido
    ) AS nombre,
    correo,
    contrasena,
    id
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

// ✅ Ruta para consultar el perfil completo
app.get('/api/perfil/:id', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT nombre, apellido,correo, tipo_documento, documento, fecha_nacimiento, DATE_FORMAT(fecha_registro, '%d/%m/%Y %H:%i:%s') AS fecha_registro, tipo_usuario
    FROM usuarios
    WHERE id = ? LIMIT 1
  `;

  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar perfil:', err.message);
      return res.status(500).json({ mensaje: 'Error al consultar perfil', error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Perfil no encontrado' });
    }

    res.status(200).json(results[0]);
  });
});

// Obtener progreso del usuario desde la tabla proceso_juego
app.get('/api/progreso/:id', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT puntaje, nivel, medallas 
    FROM progreso_juego 
    WHERE usuario_id = ? LIMIT 1
  `;

  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar progreso:', err.message);
      return res.status(500).json({ mensaje: 'Error al consultar progreso', error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Progreso no encontrado' });
    }

    res.status(200).json(results[0]);
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

// ✅ Ruta para listar todos los usuarios
app.get('/api/usuarios', (req, res) => {
  const query = `
    SELECT id, nombre, apellido, correo, tipo_documento, documento, 
           DATE_FORMAT(fecha_registro, '%d/%m/%Y %H:%i:%s') AS fecha_registro, tipo_usuario
    FROM usuarios
    ORDER BY fecha_registro DESC
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error al listar usuarios:', err.message);
      return res.status(500).json({ mensaje: 'Error al listar usuarios', error: err.message });
    }

    res.status(200).json(results);
  });
});


// a. script para el juego
app.post('/api/juego/guardar-puntaje', (req, res) => {
  const { usuario_id, puntaje, nivel, medallas } = req.body;

  // Validación básica
  if (!usuario_id || puntaje == null || !nivel || !medallas) {
    return res.status(400).json({ mensaje: '⚠️ Datos incompletos' });
  }

  const getQuery = `SELECT * FROM progreso_juego WHERE usuario_id = ?`;
  connection.query(getQuery, [usuario_id], (err, result) => {
    if (err) return res.status(500).json({ mensaje: '❌ Error al consultar progreso', error: err.message });

    if (result.length === 0) {
      // 🔰 No existe: insertar nuevo progreso
      const insert = `INSERT INTO progreso_juego (usuario_id, puntaje, nivel, medallas) VALUES (?, ?, ?, ?)`;
      connection.query(insert, [usuario_id, puntaje, nivel, medallas], (err2) => {
        if (err2) return res.status(500).json({ mensaje: '❌ Error al insertar', error: err2.message });
        return res.status(200).json({ mensaje: '✅ ¡Muy bien! Estas empezando con el pie derecho.' });
      });
    } else {
      // 🛠️ Ya existe: actualizar progreso acumulando puntaje
      /*const update = `UPDATE progreso_juego SET puntaje = puntaje + ?, nivel = ?, medallas = ? WHERE usuario_id = ?`;
      connection.query(update, [puntaje, nivel, medallas, usuario_id], (err2) => {
        if (err2) return res.status(500).json({ mensaje: '❌ Error al actualizar', error: err2.message });
        return res.status(200).json({ mensaje: '✅ Progreso actualizado correctamente' }); */
        const progresoActual = result[0];

        const nuevoNivel = nivel > progresoActual.nivel ? nivel : progresoActual.nivel;
        const nuevaMedalla = nivel > progresoActual.nivel ? medallas : progresoActual.medallas;

        const update = `UPDATE progreso_juego SET puntaje = puntaje + ?, nivel = ?, medallas = ? WHERE usuario_id = ?`;
        connection.query(update, [puntaje, nuevoNivel, nuevaMedalla, usuario_id], (err2) => {
          if (err2) return res.status(500).json({ mensaje: '❌ Error al actualizar', error: err2.message });
          return res.status(200).json({ mensaje: '✅ Progreso actualizado correctamente' });
      });
    }
  });
});


// ✅ Ruta para obtener el progreso actual de un usuario
app.get('/api/progreso/:usuario_id', (req, res) => {
  const { usuario_id } = req.params;

  const query = 'SELECT * FROM progreso_juego WHERE usuario_id = ?';
  connection.query(query, [usuario_id], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar progreso:', err.message);
      return res.status(500).json({ mensaje: 'Error al consultar progreso', error: err.message });
    }

    if (results.length === 0) {
      // Si aún no tiene progreso, devolvemos datos base (nivel 0)
      return res.status(200).json({ nivel: 0, puntaje: 0, medallas: '' });
    }

    res.status(200).json(results[0]);
  });
});

// 🔍 Listar cursos
app.get('/api/cursos', (req, res) => {
  const query = 'SELECT * FROM cursos WHERE estado = "activo"';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener cursos:', err.message);
      return res.status(500).json({ error: 'Error al obtener cursos', detalle: err.message });
    }
    res.status(200).json(results);
  });
});

// ➕ Registrar nuevo curso
app.post('/api/cursos', (req, res) => {
  const { nombre, duracion, horario, precio, modalidad, extra, estado } = req.body;

  if (!nombre || !duracion || !horario || !precio || !modalidad || !estado) {
    return res.status(400).json({ error: 'Todos los campos obligatorios deben ser completados' });
  }

  const query = `
    INSERT INTO cursos (nombre, duracion, horario, precio, modalidad, extra, estado) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  connection.query(query, [nombre, duracion, horario, precio, modalidad, extra, estado], (err, result) => {
    if (err) {
      console.error('❌ Error al registrar curso:', err.message);
      return res.status(500).json({ error: 'Error al registrar curso', detalle: err.message });
    }

    res.status(201).json({ mensaje: '✅ Curso registrado correctamente', id: result.insertId });
  });
});

// registor de canjear_cursos
app.post('/api/canjear-curso', (req, res) => {
  const { usuario_id, curso_id, puntos_utilizados } = req.body;

  if (!usuario_id || !curso_id || !puntos_utilizados) {
    return res.status(400).json({ error: 'Faltan datos para el canje' });
  }

  // 1️⃣ Verificar si ya se canjeó ese curso
  const checkSql = `SELECT id FROM cursos_canjeados WHERE usuario_id = ? AND curso_id = ?`;
  connection.query(checkSql, [usuario_id, curso_id], (checkErr, checkResult) => {
    if (checkErr) {
      console.error('❌ Error al verificar canje:', checkErr);
      return res.status(500).json({ error: 'Error al verificar canje' });
    }

    if (checkResult.length > 0) {
      return res.status(409).json({ mensaje: '⚠️ Ya canjeaste este curso anteriormente.' });
    }

    // 2️⃣ Obtener puntos actuales
    const puntosQuery = `SELECT puntaje FROM progreso_juego WHERE usuario_id = ?`;
    connection.query(puntosQuery, [usuario_id], (err2, result2) => {
      if (err2 || result2.length === 0) {
        return res.status(500).json({ error: 'Error al obtener puntaje' });
      }

      const puntosActuales = result2[0].puntaje;

      // 3️⃣ Validar si tiene puntos suficientes
      if (puntosActuales < puntos_utilizados) {
        return res.status(400).json({ mensaje: '⚠️ No tienes suficientes puntos para canjear este curso.' });
      }

      // 4️⃣ Insertar el canje
      const insertSql = `INSERT INTO cursos_canjeados (usuario_id, curso_id, puntos_utilizados) VALUES (?, ?, ?)`;
      connection.query(insertSql, [usuario_id, curso_id, puntos_utilizados], (insertErr) => {
        if (insertErr) {
          console.error('❌ Error al registrar curso canjeado:', insertErr);
          return res.status(500).json({ error: 'Error al registrar el canje', detalle: insertErr.message });
        }

        // 5️⃣ Restar puntos
        const updateSql = `UPDATE progreso_juego SET puntaje = puntaje - ? WHERE usuario_id = ?`;
        connection.query(updateSql, [puntos_utilizados, usuario_id], (updateErr) => {
          if (updateErr) {
            console.error('❌ Error al descontar puntos:', updateErr);
            return res.status(500).json({ error: 'Error al descontar puntos' });
          }

          return res.status(200).json({ mensaje: '🎉 Curso canjeado exitosamente' });
        });
      });
    });
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
