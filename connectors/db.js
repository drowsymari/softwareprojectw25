require('dotenv').config();
const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.PG_HOST || '127.0.0.1',
    port: Number(process.env.PG_PORT || 2025),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '1234',
    database: process.env.PG_DATABASE || 'giu_foodtruck',
    searchPath: ['foodtruck', 'public']  // This is important!
  },
  pool: { min: 2, max: 10 }
});
module.exports = knex;