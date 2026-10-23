"use strict";

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const IMAGE_DIR = path.join(ROOT, "assets", "img");

fs.mkdirSync(IMAGE_DIR, { recursive: true });

app.use(express.json({ limit: "1mb" }));

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, IMAGE_DIR),
  filename: (_req, file, callback) => {
    const originalExt = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
    const extension = allowedExtensions.includes(originalExt) ? originalExt : ".img";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
    callback(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return callback(new Error("Envie um arquivo de imagem válido."));
    }
    callback(null, true);
  }
});

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhuma imagem foi enviada." });
  }

  res.json({ path: `/assets/img/${req.file.filename}` });
});

app.get("/api/images", (_req, res) => {
  fs.readdir(IMAGE_DIR, (error, files) => {
    if (error) return res.status(500).json({ error: "Não foi possível listar as imagens." });

    res.json(files);
  });
});

app.use("/assets", express.static(path.join(ROOT, "assets")));
app.use(express.static(ROOT));

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.use((error, _req, res, _next) => {
  const message = error.message || "Erro ao enviar a imagem.";
  const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Catálogo disponível em http://localhost:${PORT}`);
});
