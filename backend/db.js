const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

// Inicializar tabelas
async function initDatabase() {
    try {
        // Tabela de registros de intimações
        await pool.query(`
      CREATE TABLE IF NOT EXISTS intimacoes (
        id SERIAL PRIMARY KEY,
        bo_registro VARCHAR(255),
        nome VARCHAR(255),
        telefone VARCHAR(255),
        data_intimacao VARCHAR(255),
        hora_intimacao VARCHAR(255),
        mensagem TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        data_envio TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Tabela de logs de envio
        await pool.query(`
      CREATE TABLE IF NOT EXISTS logs_envio (
        id SERIAL PRIMARY KEY,
        intimacao_id INTEGER REFERENCES intimacoes(id),
        status VARCHAR(50),
        erro TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('Banco de dados inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        throw error;
    }
}

module.exports = {
    pool,
    initDatabase
};