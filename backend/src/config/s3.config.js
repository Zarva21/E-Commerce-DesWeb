// src/config/s3.config.js
const { S3Client } = require("@aws-sdk/client-s3");

const s3Config = {
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
};

// Si usamos MinIO o almacenamiento local compatible con S3
if (process.env.S3_ENDPOINT) {
  s3Config.endpoint = process.env.S3_ENDPOINT;
  s3Config.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
}

const s3Client = new S3Client(s3Config);

// src/config/s3.config.js
module.exports = {
  s3Client,
  bucketName: process.env.S3_BUCKET_NAME || "onrival-products-media",
  publicBaseUrl: (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, ""),
};