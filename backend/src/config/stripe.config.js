// src/config/stripe.js
require('dotenv').config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY no está definida en el .env — los cobros en el módulo Sales van a fallar.");
}

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;