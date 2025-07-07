-- Crear base de datos
DROP DATABASE IF EXISTS reciclaje_inteligente;
CREATE DATABASE reciclaje_inteligente;
USE reciclaje_inteligente;

-- Tabla: usuarios
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  tipo_documento VARCHAR(20) NOT NULL,
  documento VARCHAR(15) NOT NULL,
  fecha_nacimiento date not NULL,
  correo VARCHAR(100) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL,
  ubicacion_actual VARCHAR(255),
  tipo_usuario ENUM('administrador', 'docente', 'estandar') DEFAULT 'estandar',
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

/*
ALTER TABLE usuarios
ADD COLUMN fecha_nacimiento DATE NOT NULL DEFAULT '2000-01-01'
AFTER documento;

¨*/

-- progreso_juego

-- tabla cursos
CREATE TABLE cursos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  duracion VARCHAR(100),
  horario VARCHAR(100),
  precio DECIMAL(10,2),
  modalidad VARCHAR(100),
  extra VARCHAR(100),
  estado ENUM('activo', 'inactivo') DEFAULT 'activo'
);

-- Registros iniciales
INSERT INTO cursos (nombre, duracion, horario, precio, modalidad, extra, estado)
VALUES
('Curso básico de reciclaje', '4 semanas', 'Lunes 7pm a 9pm', 100.00, 'virtual', 'Certificado', 'activo'),
('Gestión ambiental', '6 semanas', 'Miércoles 6pm a 9pm', 150.00, 'presencial', 'Incluye prácticas', 'activo');



CREATE TABLE progreso_juego (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  puntaje INT DEFAULT 0,
  nivel INT DEFAULT 1,
  medallas VARCHAR(255) DEFAULT '',
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- tabla recompensas
CREATE TABLE recompensas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  puntos_requeridos INT NOT NULL,
  url_certificado VARCHAR(255) DEFAULT NULL,
  estado TINYINT DEFAULT 1
);


-- Tabla: tipos_residuos
CREATE TABLE tipos_residuos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50),
  descripcion TEXT,
  icono_url VARCHAR(255),
  images1 VARCHAR(255),
  images2 VARCHAR(255),
  images3 VARCHAR(255),
  images4 VARCHAR(255),
  images5 VARCHAR(255),
  estado INT
);

-- Tabla: puntos_reciclaje
CREATE TABLE puntos_reciclaje (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100),
  direccion TEXT,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  horario VARCHAR(100),
  tipos_residuos_admitidos TEXT,
  telefono_contacto VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE
);

-- Tabla: registros_reciclaje
CREATE TABLE registros_reciclaje (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT,
  id_punto_reciclaje INT,
  id_tipo_residuo INT,
  cantidad_kg DECIMAL(5,2),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
  FOREIGN KEY (id_punto_reciclaje) REFERENCES puntos_reciclaje(id),
  FOREIGN KEY (id_tipo_residuo) REFERENCES tipos_residuos(id)
);

-- Tabla: reportes
CREATE TABLE reportes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT,
  tipo VARCHAR(50),
  descripcion TEXT,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(20) DEFAULT 'pendiente',
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- Tabla: estadisticas_usuario
CREATE TABLE estadisticas_usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT,
  total_kg_reciclado DECIMAL(10,2) DEFAULT 0,
  puntos_obtenidos INT DEFAULT 0,
  nivel VARCHAR(20) DEFAULT 'Principiante',
  ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- Datos de ejemplo: usuarios
INSERT INTO `usuarios` VALUES (1,'Ana Lucia Pérez Garcia','ana@gmail.com','123456','Av. Principal 123','2025-06-14 23:34:20'),
(2,'Luis Torres','luis@gmail.com','abc123','Calle Falsa 456','2025-06-14 23:34:20'),
(3,'Darley Evangelista Saavedra','darleysaavedra@gmail.com','123456','Lat: -8.09, Lng: -79.021','2025-06-20 00:00:00'),
(4,'ana sifuentes','ana@gmai.com','123','Lat: -8.09, Lng: -79.021','2025-06-20 01:41:19'),
(5,'luis linares','linares@gmail.com','1234','Lat: -8.09, Lng: -79.021','2025-06-20 01:43:43'),
(6,'juana','juana@gmail.com','123','Lat: -8.09, Lng: -79.021','2025-06-20 01:49:00'),
(7,'Luis Valdez','v@gmail.com','12334','lt 5, La Ladera Mz C, Trujillo 13001, Perú','2025-06-20 01:55:39'),
(8,'LUIS SANCHEZ','luissanchez@gmail.com','123','Andrés Castello 202, El Porvenir 13003, Perú','2025-06-29 03:14:20');

-- Datos de ejemplo: tipos_residuos
INSERT INTO `tipos_residuos` VALUES 
(1,'Plástico','Botellas, bolsas y empaques de plástico.','naranja','/images/plastico/plastico_1.jpg','/images/plastico/plastico_2.jpg','/images/plastico/plastico_3.jpg','/images/plastico/plastico__4.webp',NULL,1),
(2,'Papel','Hojas usadas, cartón y periódicos.','azul','/images/papel/papel.jpg','/images/papel/carton.jpg','/images/papel/carton y periodicos.webp','/images/papel/papel.jpg',NULL,1),
(3,'Vidrio','Botellas y frascos de vidrio.','verde','/images/vidrio/vidrio_1.png','/images/vidrio/vidrio_2.jpg',NULL,NULL,NULL,1),
(4,'Orgánico','Restos de comida, vegetales y frutas.','plomo','/images/organico/organigado_1.jpg','/images/organico/organigado_2.jpg','/images/organico/organigado_3.jpg','/images/organico/organigado_4.jpg',NULL,1),
(5,'Electrónicos','Celulares, baterías, laptops, etc.','rojo','/images/electronico/electronico_1.png','/images/electronico/electronico_2.jpg','/images/electronico/electronico_3.jpg',NULL,NULL,1),
(6,'Metales','Aluminio, cobre, hierro y acero','amarillo',NULL,NULL,NULL,NULL,NULL,0);

-- Datos de ejemplo: puntos_reciclaje
INSERT INTO puntos_reciclaje (nombre, direccion, latitud, longitud, horario, tipos_residuos_admitidos, telefono_contacto) VALUES
('Punto Verde Central', 'Parque Central - Lima', -12.0464, -77.0428, 'Lun a Sab: 8am - 5pm', '1,2,3', '987654321'),
('Eco Estación Norte', 'Av. Ecológica 234', -12.0545, -77.0900, 'Lun a Dom: 9am - 6pm', '1,4,5', '912345678');
