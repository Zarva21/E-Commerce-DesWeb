import api from "../config/api";

export const mediaService = {
  /**
   * Sube hasta 5 imágenes y las asocia a un producto
   * @param {number|string} productId 
   * @param {File[]} fileList 
   * @param {boolean} isPrimaryFirst 
   */
  async uploadProductImages(productId, fileList, isPrimaryFirst = true) {
    const formData = new FormData();
    for (const file of fileList) {
      formData.append("images", file); // Coincide con upload.array("images", 5)
    }
    formData.append("is_primary_first", String(isPrimaryFirst));

    const res = await api.post(`/media/products/${productId}/images`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data?.data || res.data;
  },

  /**
   * Sube una foto genérica suelta (logos, banners)
   */
  async uploadSingle(file) {
    const formData = new FormData();
    formData.append("file", file); // Coincide con upload.single("file")

    const res = await api.post("/media/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data?.data || res.data;
  },

  /**
   * Elimina una foto por ID de product_images y de S3
   */
  async deleteImage(imageId) {
    const res = await api.delete(`/media/images/${imageId}`);
    return res.data;
  },
};