// src/modules/media/media.service.js
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const path = require("path");
const { s3Client, bucketName, publicBaseUrl } = require("../../config/s3.config.js");
const db = require("../index.js");

const ProductImage = db.productImage;

/**
 * Sube un buffer directo a S3 / MinIO
 */
exports.uploadFileToStorage = async (file, folder = "products") => {
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const key = `${folder}/${uniqueName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL: "public-read", // Habilitar si el bucket no tiene policy pública global
  });

  await s3Client.send(command);

  // Armar la URL pública
  let imageUrl = "";
  if (publicBaseUrl) {
    imageUrl = `${publicBaseUrl}/${key}`;
  } else {
    imageUrl = `https://${bucketName}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;
  }

  return { key, imageUrl };
};

/**
 * Sube una o varias imágenes y las asocia a un producto en la base de datos
 */
exports.uploadProductImages = async ({ productId, files, isPrimaryFirst = false }) => {
  const uploadedImages = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { key, imageUrl } = await exports.uploadFileToStorage(file, `products/${productId}`);

    // Si la tabla product_images tiene registros, revisamos el display_order
    const count = await ProductImage.count({ where: { product_id: productId } });

    const newImage = await ProductImage.create({
      product_id: productId,
      image_url: imageUrl,
      alt_text: file.originalname,
      display_order: count + 1,
      is_primary: count === 0 ? true : (isPrimaryFirst && i === 0),
    });

    uploadedImages.push(newImage);
  }

  return uploadedImages;
};

/**
 * Elimina un objeto de S3 / MinIO y de la BD
 */
exports.deleteProductImage = async (imageId) => {
  const image = await ProductImage.findByPk(imageId);
  if (!image) {
    const error = new Error("Imagen no encontrada.");
    error.status = 404;
    throw error;
  }

  // Extraer el Key a partir de la URL (después del bucket)
  const urlParts = image.image_url.split(`${bucketName}/`);
  const key = urlParts[1];

  if (key) {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    try {
      await s3Client.send(command);
    } catch (err) {
      console.warn("No se pudo borrar el archivo en S3:", err.message);
    }
  }

  await image.destroy();
  return { message: "Imagen eliminada con éxito." };
};

/**
 * Permite marcar manualmente una imagen existente como portada (is_primary = true)
 * y desmarca las demás fotos del producto dentro de una transacción.
 */
exports.setPrimaryImage = async (productId, imageId) => {
  const image = await ProductImage.findOne({
    where: { id: imageId, product_id: productId },
  });

  if (!image) {
    const error = new Error("Imagen no encontrada para este producto.");
    error.status = 404;
    throw error;
  }

  return await db.sequelize.transaction(async (t) => {
    // 1. Quitar portada a todas las fotos de este producto
    await ProductImage.update(
      { is_primary: false },
      { where: { product_id: productId }, transaction: t }
    );

    // 2. Establecer la foto seleccionada como la nueva portada principal
    image.is_primary = true;
    await image.save({ transaction: t });

    return image;
  });
};