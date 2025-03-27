const sql = require('mssql');

// Configuración de la conexión a SQL Server
const config = {
  user: 'AdmiCcentralized',
  password: 'AdminLabyC!',
  server: 'db-centralizated.cvlg4ux5a67o.us-east-2.rds.amazonaws.com',
  database: '4DLAB_IGSS_Z11',
  options: {
    encrypt: true, // Si es necesario para tu entorno de trabajo
    trustServerCertificate: true // Si estás usando un servidor local o sin un certificado SSL válido
  }
};

// Función para obtener una conexión a SQL Server
const getDbConnection = async () => {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('Error en la conexión a la base de datos', err);
    throw err;
  }
};
