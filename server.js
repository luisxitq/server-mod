const WebSocket = require('ws');

// Render asigna el puerto mediante la variable de entorno PORT
const PORT = process.env.PORT || 3001;
const wss = new WebSocket.Server({ port: PORT });

const ENCRYPTION_KEY = "JiM21rNU12eERlNmpqa3FuQks";
const WS_TOKEN = "KJGMDKFJDHG34KD";
const CURRENT_VERSION = "1.0";

// Base de datos de licencias (clave -> fecha expiración)
const VALID_KEYS = {
    "LLAVE-MI-MOD-2026": "2026-12-31 23:59:59",
    "DEMO-1234": "2026-10-01 00:00:00"
};

function xorEncryptDecrypt(data, key) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

function base64Encode(str) { return Buffer.from(str, 'binary').toString('base64'); }
function base64Decode(str) { return Buffer.from(str, 'base64').toString('binary'); }

function encryptResponse(dataObj, key) {
    const jsonStr = JSON.stringify(dataObj);
    return JSON.stringify({ data: base64Encode(xorEncryptDecrypt(jsonStr, key)) });
}

function decryptPayload(encodedData, key) {
    try {
        return JSON.parse(xorEncryptDecrypt(base64Decode(encodedData), key));
    } catch (e) {
        return null;
    }
}

console.log(`Servidor iniciado en puerto ${PORT}`);

wss.on('connection', (ws) => {
    let isRegistered = false;

    ws.on('message', (message) => {
        try {
            const jsonReq = JSON.parse(message.toString());

            if (jsonReq.register && jsonReq.token === WS_TOKEN) {
                isRegistered = true;
                ws.send(JSON.stringify({ success: true }));
                return;
            }

            if (isRegistered && jsonReq.token === WS_TOKEN && jsonReq.data) {
                const payload = decryptPayload(jsonReq.data, ENCRYPTION_KEY);
                if (!payload) return ws.send(encryptResponse({ status: "error", message: "Error al desencriptar" }, ENCRYPTION_KEY));

                const { license_key, version } = payload;

                if (version !== CURRENT_VERSION) {
                    return ws.send(encryptResponse({
                        status: "error",
                        message: "Actualiza el mod",
                        data: { version: CURRENT_VERSION }
                    }, ENCRYPTION_KEY));
                }

                if (VALID_KEYS[license_key]) {
                    ws.send(encryptResponse({
                        status: "success",
                        data: {
                            expiry_date: VALID_KEYS[license_key],
                            version: CURRENT_VERSION,
                            auth_token: "0wQRlDkgoQlf",
                            license_key: license_key
                        }
                    }, ENCRYPTION_KEY));
                } else {
                    ws.send(encryptResponse({ status: "error", message: "Licencia invalida" }, ENCRYPTION_KEY));
                }
            }
        } catch (err) {
            console.error("Error:", err);
        }
    });
});
