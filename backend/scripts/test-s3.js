const path = require("path");
// Apunta a .env.development en la carpeta padre de scripts
require("dotenv").config({ path: path.resolve(__dirname, "../.env.development") });

console.log("Valores detectados:");
console.log("- BUCKET:", process.env.S3_BUCKET_NAME);
console.log("- REGION:", process.env.S3_REGION);
console.log("- KEY:", process.env.S3_ACCESS_KEY ? "Presente" : "FALTA");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

if (!process.env.S3_BUCKET_NAME) {
  console.error("\nALERTA: No se encontró S3_BUCKET_NAME en ../.env.development");
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

async function testUpload() {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: "test-upload.txt",
    Body: "¡Conexión exitosa desde Node.js a AWS S3!",
    ContentType: "text/plain",
  };

  try {
    console.log("\nSubiendo archivo de prueba a S3...");
    const res = await s3.send(new PutObjectCommand(params));
    console.log("Éxito! Archivo subido. ETag:", res.ETag);
    console.log(
      `URL pública: https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/test-upload.txt`
    );
  } catch (err) {
    console.error("Error conectando a S3:", err.message);
  }
}

testUpload();