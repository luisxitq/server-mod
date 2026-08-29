const ENCRYPTION_KEY = "JiM21rNU12eERlNmpqa3FuQks";
const EXPECTED_TOKEN = "KJGMDKFJDHG34KD";
const CURRENT_VERSION = "1.0";

const VALID_KEYS = {
  "TEST-KEY-123": { expiry: "2026-12-31T23:59:59Z", banned: false },
  "VIP-USER-2026": { expiry: "2027-01-01T00:00:00Z", banned: false }
};

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

module.exports = async (req, res) => {
  // Asegurar cabecera de respuesta JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON format in body" });
      }
    }

    if (!body || body.token !== EXPECTED_TOKEN) {
      return res.status(401).json({ error: "Invalid app token" });
    }

    if (!body.data) {
      return res.status(400).json({ error: "Missing payload data" });
    }

    const payload = decryptPayload(body.data, ENCRYPTION_KEY);
    if (!payload) {
      return res.status(400).json({ error: "Decryption failed" });
    }

    const { license_key, version } = payload;
    let responsePayload = {};

    if (version !== CURRENT_VERSION) {
      responsePayload = {
        status: "error",
        message: "Old version. Please update.",
        data: { version: CURRENT_VERSION }
      };
    } else if (!VALID_KEYS[license_key]) {
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

    const encryptedData = encryptPayload(responsePayload, ENCRYPTION_KEY);
    return res.status(200).json({ data: encryptedData });

  } catch (err) {
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
