// Importando fix-crypto.js primeiro para garantir que as correções sejam aplicadas
require('./fix-crypto.js');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { initDatabase } = require('./db');
const { startBot, processarFilaIntimacoes, getConnectionStatus } = require('./whatsappBot');
const { processarPlanilha, obterEstatisticas, listarIntimacoes } = require('./processor');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração para upload de arquivos
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, 'uploads');
            fs.ensureDirSync(uploadDir);
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    })
});

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar o banco de dados e o bot WhatsApp
async function inicializarApp() {
    await initDatabase();
    await startBot();
    console.log('Aplicação inicializada com sucesso');
}

// Rota para upload da planilha
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { dataIntimacao, horaIntimacao } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        if (!dataIntimacao || !horaIntimacao) {
            return res.status(400).json({ error: 'Data e hora da intimação são obrigatórios' });
        }

        const filePath = req.file.path;
        const resultados = await processarPlanilha(filePath, dataIntimacao, horaIntimacao);

        res.json({
            success: true,
            message: 'Arquivo processado com sucesso',
            resultados
        });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para obter status da conexão WhatsApp
app.get('/api/status', (req, res) => {
    const status = getConnectionStatus();
    res.json(status);
});

// Rota para processar a fila de intimações pendentes
app.post('/api/processar-fila', async (req, res) => {
    try {
        const resultado = await processarFilaIntimacoes();
        res.json({
            success: true,
            message: 'Fila processada com sucesso',
            resultado
        });
    } catch (error) {
        console.error('Erro ao processar fila:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para obter estatísticas
app.get('/api/estatisticas', async (req, res) => {
    try {
        const estatisticas = await obterEstatisticas();
        res.json(estatisticas);
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para listar intimações com paginação
app.get('/api/intimacoes', async (req, res) => {
    try {
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 20;
        const filtro = {};

        if (req.query.status) filtro.status = req.query.status;
        if (req.query.texto) filtro.texto = req.query.texto;

        const resultado = await listarIntimacoes(pagina, limite, filtro);
        res.json(resultado);
    } catch (error) {
        console.error('Erro ao listar intimações:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar o servidor
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    await inicializarApp();
});