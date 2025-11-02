// db.js
const { Pool } = require('pg');
require('dotenv').config();

const connectionString =
    process.env.DATABASE_URL || process.env.PG_URL || 'postgres://localhost:5432/pillmate';

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : undefined,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};