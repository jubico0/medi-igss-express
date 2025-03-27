const axios = require("axios");
const { Parser, parseStringPromise } = require("xml2js");
const sql = require('mssql');
const { XMLParser } = require("fast-xml-parser");

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
    // console.log(pool)
    return pool;
  } catch (err) {
    console.error('Error en la conexión a la base de datos', err);
    throw err;
  }
};

// Consultar cita existente o realizar consulta externa
const pagingQuery = async (req, res) => {
  try {
    const { noOrden } = req.params;
    const { nameBD } = req.user;

    // Verificar si existe la cita en la base de datos
    const existeCita = await evaluateCita(noOrden, nameBD);
    if (existeCita) {
      console.log(`La cita con NoOrden ${noOrden} ya existe en la BD.`);
      const response = await dataEtiqueta(noOrden, nameBD);
      return res.json(response);
    }

    const data = await queryAxios(noOrden);

    if ('code' in data && data.code === 404) {
      return res.status(404).json({
        statusCode: 404,
        message: data.message,
      });
    }
  
  
    return res.json(cleanArrayValues(data));

    // // Si no existe, realizar consulta externa con Axios
    // console.log(`La cita con NoOrden ${noOrden} no existe en la BD, consultando a Axios...`);
    // const data = await queryAxios(noOrden);

    // if (data.code === 404) {
    //   return res.status(404).json({
    //     statusCode: 404,
    //     message: data.message,
    //   });
    // }

    // return res.json(cleanArrayValues(data));

  } catch (error) {
    console.error("Error en pagingQuery:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Error interno del servidor",
    });
  }
};

// Consultar fechas disponibles para la cita
const checkAvailableDates = async (req, res) => {
  const { noOrden } = req.params;
  const nameBD = req.user.nameBD;

  try {
    const data = await queryAxios(noOrden);
    const formatData = cleanArrayValues(data);

    if (!formatData.SOLICITUD || !formatData.SOLICITUD.FECHA_PROXIMA_CITA || formatData.SOLICITUD.FECHA_PROXIMA_CITA.trim() === "") {
      return res.status(200).json({ fechas: [] });
    }

    const date = formatData.SOLICITUD.FECHA_PROXIMA_CITA;
    const query = `EXEC SP_FECHA_CITA2 '${date}', 'HMPZ11'`;
    const pool = await getDbConnection();
    const data2 = await pool.request().query(query);

    const resultado = { fechas: data2.recordset.map(item => item.fecha) };
    if (resultado.fechas.length === 0) {
      return res.json({ statusCode: 500, message: 'Si quiere cita personalizada, comuníquese a laboratorio' });
    } else {
      return res.json(resultado);
    }

  } catch (error) {
    console.error("Error en checkAvailableDates:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Error interno del servidor",
    });
  }
};

// Crear cita para el paciente
const createCita = async (req, res) => {

    console.log("CITAS")

  const { noOrden, fecha } = req.params;
  const nameBD = req.user.nameBD;

  console.log("ljkjljjklj", noOrden, fecha)

  try {
    const existeCita = await evaluateCita(noOrden, nameBD);
    if (existeCita) {
      return res.status(400).json({
        statusCode: 400,
        message: "El paciente ya cuenta con una cita realizada.",
      });
    }

    const data = await queryAxios(noOrden);
    const info = cleanArrayValues(data);

    const detalles = Array.isArray(info.DETALLE) ? info.DETALLE : [info.DETALLE];
    const codigosExamen = detalles.map(item => item.CODIGO_EXAMEN).join(",");

    const queryInsert = `
      INSERT INTO [dbo].[temp_citas_igss] (
        [id_cita], [fecha_cita], [afiliacion], [nombre], [primerApellido],
        [segundoApellido], [sexo], [fechaNacimiento], [TipoPaciente],
        [TipoPrograma], [servicio], [codigo_medico], [pruebas], [telefono],
        [direccion], [usuario], [medico]
      ) VALUES (
        '${noOrden}', '${fecha}', '${info.RESPUESTA.NUMERO_AFILIADO}',
        '${info.RESPUESTA.NOMBRES}', '${info.RESPUESTA.PRIMER_APELLIDO}',
        '${info.RESPUESTA.SEGUNDO_APELLIDO}', '${info.RESPUESTA.SEXO_AFILIADO}',
        '${info.RESPUESTA.FECHA_NACIMIENTO}', '${info.RESPUESTA.TIPO_DERECHOHABIENTE}',
        '${info.RESPUESTA.COD_PROGRAMA}', '404', '${info.SOLICITUD.COLEGIADO_MEDICO}',
        '${codigosExamen}', '${info.RESPUESTA.TELEFONO}', 'Guatemala', '4DLAB',
        '${info.SOLICITUD.NOMBRE_MEDICO}'
      );
    `;
    const pool = await getDbConnection();
    await pool.request().query(queryInsert);

    const query = `EXEC sp_creacion_cita_orden '${noOrden}'`;
    const data2 = await pool.request().query(query);

    if (!Array.isArray(data2.recordset) || data2.recordset.length === 0) {
      return res.status(500).json({
        statusCode: 500,
        message: "Error: El procedimiento almacenado no devolvió las condiciones de la cita.",
      });
    }

    let referenciaCita = await dataEtiqueta(noOrden, nameBD);
    if (!referenciaCita) {
      await new Promise(resolve => setTimeout(resolve, 500));
      referenciaCita = await dataEtiqueta(noOrden, nameBD);
    }

    if (!referenciaCita) {
      return res.status(500).json({
        statusCode: 500,
        message: "Error: No se pudo obtener la referencia de la cita.",
      });
    }

    return res.json(referenciaCita);
  } catch (error) {
    console.error("Error en createCita:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Error interno del servidor",
    });
  }
};

// Verificar si la cita ya existe
const evaluateCita = async (noOrden, nameBD) => {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input('noOrden', sql.VarChar, noOrden)
      .query("SELECT * FROM _CITA WHERE referenciaCita = @noOrden");
  
    console.log(result.recordset); // Verifica los resultados de la consulta
  
    return result.recordset.length > 0;
  };
// Obtener datos de la etiqueta para la cita
const dataEtiqueta = async (noOrden, nameBD) => {
  const pool = await getDbConnection();
  const tipoOrden = 'C';

  const result = await pool.request()
    .input('noOrden', sql.VarChar, noOrden)
    .input('tipoOrden', sql.VarChar, tipoOrden)
    .query(`
      SELECT 
        C.referenciaCita AS noOrden,
        O.nombre AS nombre,
        O.primerApellido AS primerApellido,
        O.segundoApellido AS segundoApellido,
        O.paciente AS afiliacion,
        FORMAT(O.fechaNacimiento, 'yyyy/MM/dd') AS fechaNacimiento,
        O.sexo AS sexo,
        O.telefono AS telefono,
        FORMAT(C.fechaCita, 'dd/MM/yyyy') + ' - 06:00 AM' AS fechaProximaCita,
        M.medico AS colegiadoMedico,
        M.nombre AS nombreMedico
      FROM _CITA C
      INNER JOIN _ORDEN O ON C.orden = O.Orden AND C.tipoOrden = O.tipoOrden
      INNER JOIN _CAT_MEDICO M ON O.codigoMedico = M.medico
      WHERE C.referenciaCita = @noOrden AND C.tipoOrden = @tipoOrden
    `);

  return result.recordset.length > 0 ? { respuesta: result.recordset[0], codigo: "CITA_RP_200" } : null;
};

// Limpiar valores de un array o objeto
const cleanArrayValues = (obj) => {
  if (Array.isArray(obj)) {
    return obj.length === 1 ? cleanArrayValues(obj[0]) : obj.map(cleanArrayValues);
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, cleanArrayValues(value)])
    );
  }
  return obj;
};

async function queryAxios(noOrden) {
    try {
        const soapXML = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                       xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ConsultarOrden xmlns="http://tempuri.org/">
              <Usuario>WsConsultaLabs</Usuario>
              <Clave>Igss.ws2020</Clave>
              <no_orden>${noOrden}</no_orden>
            </ConsultarOrden>
          </soap:Body>
        </soap:Envelope>`;

        // Configurar timeout más eficiente
        const request = axios.post(
            "https://servicios.igssgt.org/WServices/WsLabMediIGSS/WsLabMediIGSS.asmx",
            soapXML,
            {
                headers: {
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": '"http://tempuri.org/ConsultarOrden"',
                },
                timeout: 5000,
            }
        );

        // Forzar timeout si la respuesta tarda más de 4s
        const responseXML = await Promise.race([
            request,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000)
            ),
        ]);

        // Parser optimizado
        const parser = new XMLParser({ 
            ignoreAttributes: true, 
            trimValues: true, 
            parseTagValue: false 
        });
        const result = parser.parse(responseXML.data);
        
        // const consultaResult = result["soap:Envelope"]?.["soap:Body"]?.ConsultarOrdenResponse?.ConsultarOrdenResult?.IGSS_CONSULTA_LABORATORIOS;

        const consultaResult = result;
        let objeto = consultaResult?.["soap:Envelope"]?.["soap:Body"]?.ConsultarOrdenResponse?.ConsultarOrdenResult?.IGSS_CONSULTA_LABORATORIOS

        console.log(consultaResult?.["soap:Envelope"]?.["soap:Body"]?.ConsultarOrdenResponse?.ConsultarOrdenResult?.IGSS_CONSULTA_LABORATORIOS);
        
        if (!objeto || objeto.EXITO === "FALSE") {
            return {
                code: 404,
                message: objeto?.RESPUESTA || "La orden de Medi IGSS no existe",
            };
        }

        const respuesta = objeto.RESPUESTA;

        if (respuesta?.PACIENTE?.FOTOGRAFIA) {
            delete respuesta.PACIENTE.FOTOGRAFIA;
        }

        return {
            RESPUESTA: respuesta.PACIENTE || null,
            SOLICITUD: respuesta.SOLICITUD || null,
            DETALLE: respuesta.DETALLE || [],
        };

    } catch (error) {
        console.error("Error en queryAxios:", error.message);

        if (axios.isAxiosError(error)) {
            if (error.code === "ECONNABORTED") {
                return { code: 408, message: "Tiempo de espera agotado en la solicitud SOAP" };
            }
            if (error.response) {
                return { code: error.response.status, message: "Error en el servidor SOAP" };
            }
            return { code: 500, message: "Error desconocido al hacer la solicitud SOAP" };
        }

        return { code: 500, message: "Error interno en queryAxios" };
    }
}










module.exports = {
  pagingQuery,
  checkAvailableDates,
  createCita,
};
