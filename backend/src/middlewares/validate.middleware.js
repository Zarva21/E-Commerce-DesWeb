// validate.middleware.js — valida req.body contra un esquema Joi.
// Uso: router.post("/ruta", validateBody(miSchema), controller.accion);

module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,   // junta TODOS los errores, no solo el primero
    stripUnknown: true   // descarta campos no declarados en el schema
  });

  if (error) {
    return res.status(400).send({
      message: "Datos de entrada inválidos.",
      details: error.details.map((d) => d.message)
    });
  }

  req.body = value; // body ya limpio/tipado
  next();
};
