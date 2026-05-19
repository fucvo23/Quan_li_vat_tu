const mysql = require('mysql2');

const pool = mysql.createPool({
  // Tự động lấy từ Docker, nếu không thấy thì dùng mặc định 'db'
  host: process.env.DB_HOST || 'db', 
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'quan_ly_vat_tu',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool.promise();