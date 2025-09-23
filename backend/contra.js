// server.js

const jwt = require('jsonwebtoken');
const SECRET_KEY = 'MI_CLAVE_SUPER_SECRETA_123'; // 🔐 puedes cambiarla, NO compartirla


const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
//const connection = require('./db');
const mysql = require('mysql2');

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',  // Dirección del servidor MySQL
  user: 'comunidad_root',           // Nombre de usuario de la base de datos
  password: 'Holamundo1,',    // Contraseña del usuario
  database: 'comunidad_recicla' // Nombre de la base de datos
});

// Conexión a la base de datos
connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
    return;
  }
  console.log('Conexión establecida con ID:', connection.threadId);
});

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
                  host: 'smtp.gmail.com',
                  port: 465,
                  secure: true, // TLS
                  auth: {
                    user: 'darleysaavedra@gmail.com', // tu correo
                    pass: 'rqvhgxpupeivbeff'  // app password
                  }
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




// 🚀 Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
