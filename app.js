// const express = require('express');
// const app = express();
// const port = 3000;

// // Requerir las funciones que definimos en el archivo anterior
// const { pagingQuery, checkAvailableDates, createCita } = require('./medigss.controller');

// // Middleware para manejar el cuerpo de las solicitudes en formato JSON
// app.use(express.json());

// // Middleware para la autenticación de usuario (por ejemplo, sesión o JWT)
// app.use((req, res, next) => {
//   // Aquí puedes agregar tu lógica para autenticar al usuario
//   // Por ejemplo, añadiendo datos del usuario a `req.user`
//   req.user = { nameBD: 'your_database_name' }; // Ejemplo de un nombre de base de datos
//   next();
// });

// // Ruta para consultar citas
// app.get('/api/citas/:noOrden', pagingQuery);

// // Ruta para consultar fechas disponibles para la cita
// app.get('/api/citas/fechas/:noOrden', checkAvailableDates);

// // Ruta para crear una cita
// app.post('/api/citas/:noOrden/:fecha', createCita);

// // Iniciar el servidor
// app.listen(port, () => {
//   console.log(`Servidor corriendo en http://localhost:${port}`);
// });



const express = require('express');
const cors = require('cors'); // Importar cors
const app = express();
const port = 44446;

// Requerir las funciones que definimos en el archivo anterior
const { pagingQuery, checkAvailableDates, createCita } = require('./medigss.controller');

// Habilitar CORS para todas las rutas
app.use(cors());
// const corsOptions = {
//     origin: 'http://tudominio.com', // Solo permitir solicitudes desde tu dominio
//     methods: ['GET', 'POST'], // Solo permitir ciertos métodos HTTP
//     allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
//   };
  
//   app.use(cors(corsOptions)); // Usar las opciones personalizadas

// Middleware para manejar el cuerpo de las solicitudes en formato JSON
app.use(express.json());

// Middleware para la autenticación de usuario (por ejemplo, sesión o JWT)
app.use((req, res, next) => {
  // Aquí puedes agregar tu lógica para autenticar al usuario
  // Por ejemplo, añadiendo datos del usuario a `req.user`
  req.user = { nameBD: 'your_database_name' }; // Ejemplo de un nombre de base de datos
  next();
});

// Ruta para consultar citas
app.get('/voceo/data-medeigss/:noOrden', pagingQuery);

// Ruta para consultar fechas disponibles para la cita
app.get('/voceo/dates-medeigss/:noOrden', checkAvailableDates);

// Ruta para crear una cita
app.post('/voceo/create-cita/:noOrden/:fecha', createCita);

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
