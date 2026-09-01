module.exports = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_SECRET_INT || "1h"
};