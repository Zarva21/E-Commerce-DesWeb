module.exports = {
  URL: process.env.DATABASE_URL,
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  DB: process.env.DB_NAME,
  PORT: process.env.DB_PORT,
  dialect: process.env.DB_DIALECT || "postgres",
  ssl: process.env.DB_SSL === "true",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};