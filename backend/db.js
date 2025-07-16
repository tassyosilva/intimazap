const { Pool } = require('pg');
require('dotenv').config();

// Criar pool com configurações adicionais para timezone
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // Adicionar declaração de configuração de timezone em cada conexão
  statement_timeout: 10000,
  query_timeout: 10000,
  connectionTimeoutMillis: 10000,
  idle_in_transaction_session_timeout: 10000
});

// Configurar o timezone em cada conexão do pool
pool.on('connect', (client) => {
  client.query('SET timezone = "America/Boa_Vista"');
  console.log('Nova conexão estabelecida com timezone configurado para America/Boa_Vista');
});

// Inicializar tabelas
async function initDatabase() {
  try {
    // Configurar explicitamente o timezone para cada consulta
    await pool.query(`SET timezone = 'America/Boa_Vista'`);
    console.log('Timezone configurado para America/Boa_Vista');

    // Verificar a configuração atual
    const tzResult = await pool.query('SHOW timezone');
    console.log('Configuração atual de timezone:', tzResult.rows[0].timezone);

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
        data_envio TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de logs de envio
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs_envio (
        id SERIAL PRIMARY KEY,
        intimacao_id INTEGER REFERENCES intimacoes(id),
        status VARCHAR(50),
        erro TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL DEFAULT 'padrao',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de configurações do sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS config_sistema (
        id SERIAL PRIMARY KEY,
        chave VARCHAR(255) UNIQUE NOT NULL,
        valor TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de comunicados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comunicados (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255),
        telefone VARCHAR(255),
        mensagem TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        data_envio TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de logs de envio para comunicados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs_comunicados (
        id SERIAL PRIMARY KEY,
        comunicado_id INTEGER REFERENCES comunicados(id),
        status VARCHAR(50),
        erro TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Verificar se existe pelo menos um usuário admin
    const adminResult = await pool.query(`
      SELECT COUNT(*) FROM usuarios WHERE tipo = 'admin'
    `);

    if (parseInt(adminResult.rows[0].count) === 0) {
      // Criar usuário admin padrão (senha: admin)
      await pool.query(`
        INSERT INTO usuarios (nome, email, senha, tipo) 
        VALUES ('Administrador', 'admin', 'admin', 'admin')
      `);
      console.log('Usuário admin padrão criado');
    }

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