const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  database:           process.env.DB_NAME     || 'skilllink_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0
});

// Ping every 5 minutes to keep connection alive
setInterval(async () => {
  try { await pool.query('SELECT 1'); } catch (e) { /* reconnects automatically */ }
}, 5 * 60 * 1000);

module.exports = pool;
