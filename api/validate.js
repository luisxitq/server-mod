// Constantes configuradas en tu cliente C++
const ENCRYPTION_KEY = "JiM21rNU12eERlNmpqa3FuQks";
const EXPECTED_WS_TOKEN = "KJGMDKFJDHG34KD";
const CURRENT_VERSION = "1.0";

// Base de datos de licencias de prueba (puedes reemplazar esto con Supabase, MongoDB, etc.)
const VALID_KEYS = {
  "MI-LLAVE-VIP-123": {
    expiry: "2026-12-31T23:59:59Z",
    banned: false
  },
  "CLAVE-PRUEBA-2026": {
    expiry: "2026-10-15T12:00:00Z",
    banned: false
  }
};

// Cifrado / Descifrado XOR + Base64
function xorEncryptDecrypt(data, key) {
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function base64Encode(str) {
  return Buffer.from(str, "utf8").toString("base64");
}

function base64Decode(str) {
  return Buffer.from(str, "base64").toString("utf8");
}

function decryptPayload(encodedData, key) {
  try {
    const decoded = base64Decode(encodedData);
    const decrypted = xorEncryptDecrypt(decoded, key);
    return JSON.parse(decrypted);
  } catch (e) {
    return null;
  }
}

function encryptPayload(dataObject, key) {
  const jsonStr = JSON.stringify(dataObject);
  const encrypted = xorEncryptDecrypt(jsonStr, key);
  return base64Encode(encrypted);
}

export default async function handler(req, res) {
  // Solo se permiten peticiones POST
  if (req.method !== "POST") {
    return res.status(450).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // 1. Validar Token estático enviado en la petición
    if (!body.token || body.token !== EXPECTED_WS_TOKEN) {
      return res.status(401).json({ error: "Invalid app token" });
    }

    // 2. Descifrar el cuerpo recibido
    if (!body.data) {
      return res.status(400).json({ error: "Missing data payload" });
    }

    const payload = decryptPayload(body.data, ENCRYPTION_KEY);
    if (!payload) {
      return res.status(400).json({ error: "Decryption failed" });
    }

    const { license_key, hwid, game_type, version } = payload;

    let responsePayload = {};

    // 3. Comprobar la versión del cliente C++
    if (version !== CURRENT_VERSION) {
      responsePayload = {
        status: "error",
        message: "Old version. Please update.",
        data: { version: CURRENT_VERSION }
      };
    } else if (!VALID_KEYS[license_key]) {
      // 4. Validar si la llave existe
      responsePayload = {
        status: "error",
        message: "Invalid license key"
      };
    } else {
      const keyData = VALID_KEYS[license_key];

      if (keyData.banned) {
        responsePayload = {
          status: "error",
          message: "License banned"
        };
      } else {
        // 5. Autenticación exitosa
        responsePayload = {
          status: "success",
          data: {
            auth_token: "0wQRlDkgoQlf",
            version: CURRENT_VERSION,
            expiry_date: keyData.expiry
          }
        };
      }
    }

    // Encapsular la respuesta cifrada en el objeto "data"
    const encryptedData = encryptPayload(responsePayload, ENCRYPTION_KEY);
    return res.status(200).json({ data: encryptedData });

  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
