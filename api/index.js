export default function handler(req, res) {
  return res.status(200).json({
    status: "online",
    message: "Servidor de licencias activo"
  });
}
