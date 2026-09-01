// catchAsync — envuelve una función async y reenvía cualquier error a next(),
// para que caiga en error.middleware.js en vez de tumbar el proceso o
// requerir un try/catch repetido en cada controller.
//
// Uso:
//   exports.getById = catchAsync(async (req, res) => {
//     const role = await roleService.getById(req.params.id);
//     res.status(200).send(role);
//   });

module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
