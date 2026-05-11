const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Simple helper to load .env file manually without extra dependencies
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
    console.log('✅ .env file loaded');
  } else {
    console.log('❌ .env file not found');
  }
}

async function testConnection() {
  loadEnv();

  console.log('Connecting to database with:');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log('---');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      ssl: false,
    });

    console.log('🚀 Successfully connected to the database!');

    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    console.log('✅ Query test successful! (1 + 1 = ' + rows[0].result + ')');

    // Check if tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Found tables:', tables.map(t => Object.values(t)[0]).join(', ') || 'None');

    await connection.end();
    console.log('---');
    console.log('Connection closed cleanly.');
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error details:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\nTip: Check if your database host is correct and the server is running.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nTip: Check if your username and password are correct.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\nTip: The host address could not be resolved.');
    }
  }
}

testConnection();
