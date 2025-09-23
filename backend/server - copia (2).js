// server.js

const jwt = require('jsonwebtoken');
const SECRET_KEY = 'MI_CLAVE_SUPER_SECRETA_123'; // 🔐 puedes cambiarla, NO compartirla


const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connection = require('./db');
const multer = require('multer');
const path = require('path');

// Ruta para cambiar contraseña
const bcrypt = require('bcrypt');
// ⚠️ Mueve la importación de crypto aquí, al inicio del archivo
const crypto = require('crypto'); 
const nodemailer = require('nodemailer');

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
app.use(express.urlencoded({ extended: true })); // <-- ¡Añade esta línea!
//const upload = multer(); // <-- ¡Añade esta línea!

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

  const query = `
    SELECT 
      CONCAT(
        SUBSTRING_INDEX(nombre, ' ', 1), ' ',
        UPPER(LEFT(SUBSTRING_INDEX(apellido, ' ', 1), 1)), '.'
      ) AS nombre, tipo_usuario,
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

    // 🔒 Comparar contraseñas con bcrypt.compare
    bcrypt.compare(contrasena, usuario.contrasena, (errCompare, isMatch) => {
      if (errCompare) {
        console.error('❌ Error al comparar contraseñas:', errCompare);
        return res.status(500).json({ mensaje: 'Error al validar contraseña' });
      }

      if (!isMatch) {
        return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
      }

      // ✅ Registrar acceso en tabla accesos
      const insertAccesoQuery = `INSERT INTO accesos (id_usuario) VALUES (?)`;
      connection.query(insertAccesoQuery, [usuario.id], (err2) => {
        if (err2) {
          console.error('⚠️ Error al registrar acceso:', err2.message);
          // Nota: no se corta el flujo, solo se registra el error
        }

        // 🔐 Generar token JWT
        const token = jwt.sign(
          {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo
          },
          SECRET_KEY,
          { expiresIn: '1h' }
        );

        // ✅ Respuesta con token y datos del usuario
        res.status(200).json({
          mensaje: 'Inicio de sesión exitoso',
          token,
          usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            tipo_usuario: usuario.tipo_usuario  // <-- 🔥 IMPORTANTE 🔥
          }
        });
      });
    });
  });
});



app.post('/api/cambiar-contrasena', (req, res) => {
  const { id_usuario, nueva_contrasena } = req.body;

  if (!id_usuario || !nueva_contrasena) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
  }

  bcrypt.hash(nueva_contrasena, 10, (err, hash) => {
    if (err) {
      console.error('❌ Error al encriptar contraseña:', err);
      return res.status(500).json({ mensaje: 'Error interno al encriptar' });
    }

    const sql = 'UPDATE usuarios SET contrasena = ? WHERE id = ?';
    connection.query(sql, [hash, id_usuario], (error, result) => {
      if (error) {
        console.error('❌ Error al actualizar contraseña:', error);
        return res.status(500).json({ mensaje: 'Error al actualizar contraseña' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      return res.status(200).json({ mensaje: '✅ Contraseña actualizada correctamente' });
    });
  });
});

// listar cursos por id logueado

app.post('/api/listar-cursos_id', (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ mensaje: "El correo es obligatorio" });
  }

  const query = `
    SELECT c.nombre, c.duracion, c.horario, c.precio, c.modalidad, c.extra, c.id, cj.curso_id,
            s.id_sesion, s.sesion, s.subtitulo, s.descripcion, s.contenido, s.url_imagen, s.video, s.orden
    FROM cursos c
    INNER JOIN cursos_canjeados cj ON cj.curso_id = c.id
    INNER JOIN usuarios u ON u.id = cj.usuario_id
    LEFT JOIN sesion_cursos s ON s.id_curso = c.id
    WHERE u.correo = ? and c.estado = 'activo'
    ORDER BY s.id_sesion ASC
  `;

  connection.query(query, [correo], (err, results) => {
    if (err) {
      console.error("❌ Error al obtener cursos canjeados:", err);
      return res.status(500).json({ mensaje: "Error al consultar cursos", error: err });
    }

    res.json(results);
  });
});


// listar cursos PARA ADMINISTRADOR Y DOCENTE

app.get('/api/listar-todos-los-cursos', (req, res) => {
  const query = `
    SELECT c.id, c.nombre, c.duracion, c.horario, c.precio, c.modalidad, c.extra, 
           s.id_sesion AS id_sesion, s.sesion, s.subtitulo, s.descripcion, s.contenido, s.url_imagen, s.video, s.orden
    FROM cursos c
    LEFT JOIN sesion_cursos s ON c.id = s.id_curso

    ORDER BY c.id, s.id_sesion
  `;
  //     WHERE c.estado = 'activo'

  connection.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error al obtener cursos:", err);
      return res.status(500).json({ mensaje: "Error al consultar cursos", error: err });
    }

    res.json(results);
  });
});

// Ruta: Registrar Sesión (POST)
app.post('/api/registrar-sesion', (req, res) => {
  const { id_curso, sesion, subtitulo, descripcion, contenido, url_imagen, video, estado } = req.body;

  // Primero, consulta el último valor de 'orden' para el id_curso dado.
  const queryConsultaOrden = `
    SELECT MAX(orden) as max_orden
    FROM sesion_cursos
    WHERE id_curso = ?
  `;

  connection.query(queryConsultaOrden, [id_curso], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar la secuencia de orden:', err);
      return res.status(500).json({ mensaje: 'Error al consultar la secuencia de orden', error: err });
    }

    let nuevoOrden = 1;
    if (results.length > 0 && results[0].max_orden !== null) {
      // Si ya existen sesiones para este curso, el nuevo orden es el máximo + 1.
      nuevoOrden = results[0].max_orden + 1;
    }
    // Si no existen sesiones, nuevoOrden se mantiene en 1.

    const queryInsertarSesion = `
      INSERT INTO sesion_cursos (id_curso, sesion, subtitulo, descripcion, contenido, url_imagen, video, estado, orden)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(
      queryInsertarSesion,
      [id_curso, sesion, subtitulo, descripcion, contenido, url_imagen, video, estado, nuevoOrden],
      (err, result) => {
        if (err) {
          console.error('❌ Error al registrar la sesión:', err);
          return res.status(500).json({ mensaje: 'Error al registrar sesión', error: err });
        }

        res.json({ mensaje: '✅ Sesión registrada correctamente', idInsertado: result.insertId, nuevoOrden: nuevoOrden });
      }
    );
  });
});

// Ruta: Editar Sesión (POST)
app.post('/api/editar-sesion', (req, res) => {
  const { id_sesion, sesion, subtitulo, descripcion, contenido, url_imagen, video } = req.body;

  const query = `
    UPDATE sesion_cursos
    SET sesion = ?, subtitulo = ?, descripcion = ?, contenido = ?, url_imagen = ?, video = ?
    WHERE id_sesion = ?
  `;

  connection.query(query, [sesion, subtitulo, descripcion, contenido, url_imagen, video, id_sesion], (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar la sesión:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar sesión', error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Sesión no encontrada' });
    }

    res.json({ mensaje: '✅ Sesión actualizada correctamente' });
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



// Ruta para solicitar la recuperación de contraseña
app.post('/api/recuperar-contrasena', (req, res) => {
    const { correo } = req.body;

    const query = 'SELECT id, nombre, correo FROM usuarios WHERE correo = ?';
    connection.query(query, [correo], async (err, results) => {
        if (err) return res.status(500).json({ mensaje: 'Error en la consulta', error: err.message });

        // Si el correo no existe, devuelve un mensaje genérico por seguridad
        if (results.length === 0) {
            return res.status(200).json({ mensaje: 'Si el correo existe, se ha enviado una nueva contraseña.' });
        }

        const usuario = results[0];

        // Generar nueva contraseña temporal
        const nuevaContrasena = Math.random().toString(36).slice(-8); // 8 caracteres
        const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

        // Calcular expiración (24 horas desde ahora)
        const fechaExpiracion = new Date();
        //fechaExpiracion.setHours(fechaExpiracion.getHours() + 24); // 24 horas
        fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 5);  // 5 mminutos

        // Guardar nueva contraseña y fecha de expiración en la BD
        connection.query(
            'UPDATE usuarios SET contrasena = ?, contrasena_expira = ? WHERE id = ?',
            [hashedPassword, fechaExpiracion, usuario.id],
            (updateErr) => {
                if (updateErr) return res.status(500).json({ mensaje: 'Error al actualizar la contraseña', error: updateErr.message });

                // Configuración de envío de correo
                const transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: { user: 'darleysaavedra@gmail.com', pass: 'rqvhgxpupeivbeff' } // sin espacios en pass
                });

                const mailOptions = {
                    to: usuario.correo,
                    from: 'darleysaavedra@gmail.com',
                    subject: 'Recuperación de Contraseña - ECORECICLA',
                    html: `<h3>Hola, ${usuario.nombre}</h3>
                           <p>Tu nueva contraseña temporal es:</p>
                           <h2>${nuevaContrasena}</h2>
                           <p>Esta contraseña expirará el <b>${fechaExpiracion.toLocaleString()}</b>.</p>
                           <p>Por favor, cámbiala después de iniciar sesión.</p>`
                };

                transporter.sendMail(mailOptions, (mailErr, info) => {
                    if (mailErr) {
                        console.error('❌ Error al enviar el correo:', mailErr);
                        return res.status(500).json({ mensaje: 'Error al enviar el correo de recuperación.' });
                    }

                    console.log('✅ Correo enviado:', info.response);
                    return res.status(200).json({ mensaje: 'Si el correo existe, se ha enviado una nueva contraseña.' });
                });
            }
        );
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
     SELECT id, nombre, apellido, correo, tipo_usuario, en_linea, ultima_conexion, permiso_reciclaje  FROM usuarios ORDER BY id;

  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error al listar usuarios:', err.message);
      return res.status(500).json({ mensaje: 'Error al listar usuarios', error: err.message });
    }

    res.status(200).json(results);
  });
});

// para filtrar por usuario en el grafico
app.get('/api/usuarios_x_id', (req, res) => {
  const usuarioId = req.query.usuarioId; // viene del select
  let query = `
    SELECT categoria, SUM(peso_kg) AS total_peso
    FROM historial_reciclaje
  `;

  if (usuarioId) {
    query += ` WHERE usuario_id = ? `;
  }

  query += ` GROUP BY categoria;`;

  connection.query(query, usuarioId ? [usuarioId] : [], (err, results) => {
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
  const query = 'SELECT * FROM cursos ';
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


// ✏️ Ruta para editar un curso (nueva)
app.put('/api/cursos/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, duracion, horario, precio, modalidad, extra, estado } = req.body;

  if (!id || !nombre || !duracion || !horario || !precio || !modalidad || !estado) {
    return res.status(400).json({ error: '⚠️ Faltan datos obligatorios para la edición' });
  }

  const query = `
    UPDATE cursos 
    SET nombre = ?, duracion = ?, horario = ?, precio = ?, modalidad = ?, extra = ?, estado = ?
    WHERE id = ?
  `;

  connection.query(query, [nombre, duracion, horario, precio, modalidad, extra, estado, id], (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar el curso:', err.message);
      return res.status(500).json({ error: 'Error al actualizar curso', detalle: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Curso no encontrado' });
    }

    res.status(200).json({ mensaje: '✅ Curso editado con éxito' });
  });
});


// REGISTRRAR EL CANJE DE CURSOS
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


// ✅ Ruta para obtener cursos canjeados por usuario
app.get('/api/cursos-canjeados/:usuarioId', (req, res) => {
  const { usuarioId } = req.params;

  const query = `
    SELECT 
      c.nombre, 
      c.duracion, 
      c.horario, 
      c.modalidad, 
      c.extra, 
      c.precio, 
      DATE_FORMAT(cj.fecha_canje, '%d/%m/%Y %H:%i:%s') AS fecha_canje
    FROM cursos_canjeados cj
    INNER JOIN cursos c ON cj.curso_id = c.id
    WHERE cj.usuario_id = ?
    ORDER BY cj.fecha_canje DESC
  `;

  connection.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error('❌ Error al obtener cursos canjeados:', err.message);
      return res.status(500).json({ mensaje: 'Error al obtener cursos canjeados', error: err.message });
    }

    res.status(200).json(results);
  });
});


// ✅ Escanear QR y sumar puntos al progreso
app.post('/api/escanear-qr', (req, res) => {
  const { usuario_id, puntos } = req.body;

  if (!usuario_id || !puntos) {
    return res.status(400).json({ mensaje: '⚠️ Datos incompletos' });
  }

  // Obtener el progreso actual
  const getQuery = `SELECT * FROM progreso_juego WHERE usuario_id = ?`;
  connection.query(getQuery, [usuario_id], (err, result) => {
    if (err) {
      console.error('❌ Error al consultar progreso:', err.message);
      return res.status(500).json({ mensaje: 'Error al consultar progreso', error: err.message });
    }

    if (result.length === 0) {
      // Si no hay progreso aún, insertar uno nuevo
      const insert = `INSERT INTO progreso_juego (usuario_id, puntaje, nivel, medallas, fecha_actualizacion) VALUES (?, ?, ?, ?, NOW())`;
      connection.query(insert, [usuario_id, puntos, 1, 'QR'], (err2) => {
        if (err2) {
          console.error('❌ Error al insertar progreso:', err2.message);
          return res.status(500).json({ mensaje: 'Error al registrar puntos QR', error: err2.message });
        }

        return res.status(200).json({ mensaje: '✅ ¡Has escaneado el QR y ganado 150 puntos!' });
      });
    } else {
      const progreso = result[0];
      const nuevoPuntaje = progreso.puntaje + puntos;
      const nuevoNivel = Math.floor(nuevoPuntaje / 500); // por ejemplo
      const update = `UPDATE progreso_juego SET puntaje = ?, nivel = ?, fecha_actualizacion = NOW() WHERE usuario_id = ?`;

      connection.query(update, [nuevoPuntaje, nuevoNivel, usuario_id], (err3) => {
        if (err3) {
          console.error('❌ Error al actualizar puntos QR:', err3.message);
          return res.status(500).json({ mensaje: 'Error al actualizar puntos', error: err3.message });
        }

        return res.status(200).json({ mensaje: '✅ ¡Has escaneado el QR y ganado 150 puntos!' });
      });
    }
  });
});



// ✅ Ruta protegida (fuera de la función verificarToken)
app.get('/api/protegido', verificarToken, (req, res) => {
  res.json({ mensaje: '🔐 Ruta protegida accedida', usuario: req.usuario });
});

/* --- Nuevas rutas para el Historial de Reciclaje --- */

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Declarar UNA sola vez
const upload = multer({ storage });

// ------------------- RUTAS -------------------

// Cambiar estado a EN LÍNEA
// Ruta para actualizar estado (en línea o desconectado)
// Solo datos, sin archivo
app.post('/api/estado', upload.none(), (req, res) => {
  const { correo, estado } = req.body;

  if (!correo || !estado) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
  }

  const enLinea = estado === 'en linea' ? 1 : 0;

  connection.query(
    'UPDATE usuarios SET en_linea = ?, ultima_conexion = NOW() WHERE correo = ?',
    [enLinea, correo],
    (error) => {
      if (error) {
        console.error('❌ Error al actualizar estado:', error);
        return res.status(500).json({ ok: false });
      }
      res.json({ ok: true, mensaje: `Estado actualizado a ${estado}` });
    }
  );
});


// Subida de foto
app.post('/api/registrar-reciclaje', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensaje: 'No se subió ninguna foto.' });
  }

  const { usuario_id, categoria, residuo, peso_kg } = req.body;
  const foto_url = `/uploads/${req.file.filename}`;

  if (!usuario_id || !categoria || !residuo || !peso_kg) {
    return res.status(400).json({ mensaje: 'Faltan campos obligatorios.' });
  }

  const query = 'INSERT INTO historial_reciclaje (usuario_id, categoria, residuo, peso_kg, foto_url) VALUES (?, ?, ?, ?, ?)';
  connection.query(query, [usuario_id, categoria, residuo, peso_kg, foto_url], (err, results) => {
    if (err) {
      console.error('Error al insertar en la base de datos:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ mensaje: 'Registro de reciclaje creado con éxito.', id: results.insertId });
  });
});

// [NUEVA RUTA] Obtener el historial de reciclaje de un usuario
//const path = require('path');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Tu endpoint para historial
app.get('/api/historial-reciclaje/:id', (req, res) => {
    const usuario_id = req.params.id;
    const query = 'SELECT id, usuario_id, categoria, residuo, peso_kg, foto_url, DATE_FORMAT(fecha, "%d/%m/%Y") AS fecha, DATE_FORMAT(fecha, "%H:%i:%s %p") AS hora  FROM historial_reciclaje WHERE usuario_id = ? ORDER BY fecha DESC';
    connection.query(query, [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});


// [NUEVA RUTA] Obtener el permiso de reciclaje de un usuario
app.get('/api/permiso-reciclaje/:id', (req, res) => {
    const usuario_id = req.params.id;
    const query = 'SELECT permiso_reciclaje FROM usuarios WHERE id = ?';
    connection.query(query, [usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }
        res.json({ estado: results[0].permiso_reciclaje });
    });
});

// [NUEVA RUTA] Actualizar el permiso de reciclaje de un usuario (Solo para administradores)
app.post('/api/actualizar-permiso-reciclaje', (req, res) => {
    const { usuario_id, estado } = req.body;
    if (!usuario_id || !estado) {
        return res.status(400).json({ mensaje: 'ID de usuario y estado son obligatorios.' });
    }

    const query = 'UPDATE usuarios SET permiso_reciclaje = ? WHERE id = ?';
    connection.query(query, [estado, usuario_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }
        res.json({ mensaje: 'Permiso de reciclaje actualizado con éxito.' });
    });
});


// ---------------- Historial reciclaje ------------------
app.get('/api/historial/:usuario_id', (req, res) => {
  const usuario_id = req.params.usuario_id;
  const sql = 'SELECT * FROM historial_reciclaje WHERE usuario_id = ? ORDER BY fecha DESC';
  connection.query(sql, [usuario_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error DB' });
    res.json(results);
  });
});

// 👇 Nueva ruta: todos los historiales con datos de usuarios (solo admin)
app.get('/api/historial-todos', (req, res) => {
  const sql = `
    SELECT u.id, u.nombre, u.correo, h.categoria, h.residuo, h.peso_kg, h.foto_url, DATE_FORMAT(h.fecha, '%d/%m/%y %h:%m:%s %p')as fecha
    FROM historial_reciclaje h
    INNER JOIN usuarios u ON u.id = h.usuario_id
    ORDER BY h.fecha DESC
  `;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error DB' });
    res.json(results);
  });
});


// 🚀 Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
