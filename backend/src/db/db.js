const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "diploma_platform",
  password: "7292",
  port: 5432,
});

module.exports = pool;
