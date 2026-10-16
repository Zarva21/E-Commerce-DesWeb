const mediaService = require("./media.service.js");

// Subida general (devuelve solo la URL, útil para logos o banners)
exports.uploadSingle = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "No se envió ningún archivo." });
    }
    const result = await mediaService.uploadFileToStorage(req.file, "general");
    res.status(201).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// Subida de lote de fotos asociadas a un producto
exports.uploadForProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ message: "Debes subir al menos una imagen." });
    }

    const images = await mediaService.uploadProductImages({
      productId,
      files: req.files,
      isPrimaryFirst: req.body.is_primary_first === "true",
    });

    res.status(201).send(images);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// Eliminar imagen
exports.deleteImage = async (req, res) => {
  try {
    const result = await mediaService.deleteProductImage(req.params.id);
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};