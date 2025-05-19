require('./fix-crypto.js');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { initDatabase, pool } = require('./db');
const { startBot, processarFilaIntimacoes, getConnectionStatus, disconnectBot, getDeviceInfo } = require('./whatsappBot');
const { processarPlanilha, obterEstatisticas, listarIntimacoes } = require('./processor');

require('dotenv').config();

// Funções para acompanhar progresso do envio
function atualizarProgressoEnvio(item) {
    global.progressoEnvio.processados++;
    global.progressoEnvio.porcentagem = Math.round((global.progressoEnvio.processados / global.progressoEnvio.total) * 100);
    global.progressoEnvio.itensProcessados.push(item);
}

function resetarProgressoEnvio(total = 0) {
    global.processoEnvioAtivo = total > 0;
    global.progressoEnvio = {
        total,
        processados: 0,
        porcentagem: 0,
        itensProcessados: []
    };
}

// Tornando as funções de progresso disponíveis globalmente
global.processoEnvioAtivo = false;
global.progressoEnvio = {
    total: 0,
    processados: 0,
    porcentagem: 0,
    itensProcessados: []
};
global.atualizarProgressoEnvio = atualizarProgressoEnvio;
global.resetarProgressoEnvio = resetarProgressoEnvio;

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

// Middleware de autenticação
function autenticarUsuario(req, res, next) {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificação simples do token (em produção use JWT)
    // Formato do token: email:tipo
    const [email, tipo] = token.split(':');

    if (!email || !tipo) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    // Adicionar informações do usuário ao request
    req.usuario = { email, tipo };
    next();
}

// Middleware para verificar se é admin
function verificarAdmin(req, res, next) {
    if (req.usuario.tipo !== 'admin') {
        return res.status(403).json({ error: 'Acesso permitido apenas para administradores' });
    }
    next();
}

// Rota de login
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        // Buscar usuário
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND senha = $2',
            [email, senha]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const usuario = result.rows[0];

        // Criar token simples (em produção use JWT)
        const token = `${usuario.email}:${usuario.tipo}`;

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rotas de usuários (protegidas)
app.get('/api/usuarios', autenticarUsuario, verificarAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome, email, tipo, created_at FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/usuarios', autenticarUsuario, verificarAdmin, async (req, res) => {
    try {
        const { nome, email, senha, tipo } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }

        // Verificar se o email já existe
        const existente = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (existente.rows.length > 0) {
            return res.status(400).json({ error: 'Este email já está em uso' });
        }

        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo',
            [nome, email, senha, tipo || 'padrao']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/usuarios/:id', autenticarUsuario, verificarAdmin, async (req, res) => {
    try {
        const id = req.params.id;

        // Verificar se está tentando excluir o próprio usuário
        if (req.usuario.email === 'admin' && id === '1') {
            return res.status(400).json({ error: 'Não é possível excluir o usuário admin padrão' });
        }

        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

        res.json({ success: true, message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para upload da planilha (protegida)
app.post('/api/upload', autenticarUsuario, upload.single('file'), async (req, res) => {
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

// Rotas para gerenciar conexão WhatsApp (protegidas)
app.get('/api/status', autenticarUsuario, (req, res) => {
    const status = getConnectionStatus();
    res.json(status);
});

// Rota para obter informações do dispositivo
app.get('/api/device-info', autenticarUsuario, (req, res) => {
    const deviceInfo = getDeviceInfo();
    res.json(deviceInfo || { message: 'Nenhum dispositivo conectado' });
});

app.post('/api/disconnect', autenticarUsuario, verificarAdmin, async (req, res) => {
    try {
        const resultado = await disconnectBot();
        res.json(resultado);
    } catch (error) {
        console.error('Erro ao desconectar WhatsApp:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para processar a fila de intimações pendentes (protegida)
app.post('/api/processar-fila', autenticarUsuario, async (req, res) => {
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

// Rota para obter estatísticas (protegida)
app.get('/api/estatisticas', autenticarUsuario, async (req, res) => {
    try {
        const estatisticas = await obterEstatisticas();
        res.json(estatisticas);
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para listar intimações com paginação (protegida)
app.get('/api/intimacoes', autenticarUsuario, async (req, res) => {
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

// Rota para obter o template de mensagem
app.get('/api/template-mensagem', autenticarUsuario, async (req, res) => {
    try {
        // Verificar se já existe um template no banco
        const result = await pool.query('SELECT * FROM config_sistema WHERE chave = $1', ['template_mensagem']);

        if (result.rows.length > 0) {
            res.json({ template: result.rows[0].valor });
        } else {
            // Retornar o template padrão do processor.js
            const templatePadrao = `Olá, {nome}!
O(A) Senhor(a) está recebendo uma intimação para comparecer à sede da Delegacia mais próxima de sua residência, até a data de {data}, às {hora}h, munido(a) de documento de identificação e deste MANDADO DE INTIMAÇÃO juntamente do aparelho celular em que foi recebida a presente mensagem, para prestar esclarecimento sobre fato em apuração.
{nome}, ao se apresentar, o(a) Senhor(a) deverá procurar o Delegado de Polícia e apresentar este MANDADO DE INTIMAÇÃO.
Em caso de ausência, favor justificar junto ao cartório da Delegacia mais próxima, pois a ausência injustificada poderá caracterizar crime de desobediência, previsto no artigo 330 do Código Penal.
Em caso de dúvidas, entre em contato através do número (95)99168-7209
A confirmação da titularidade desta conta de WhatsApp pela Polícia Civil do Estado de Roraima pode ser conferida acessando o site da PCRR no link abaixo: 
https://policiacivil.rr.gov.br/intimacao-eletronica-pcrr/`;

            // Inserir o template padrão no banco
            await pool.query(
                'INSERT INTO config_sistema (chave, valor) VALUES ($1, $2)',
                ['template_mensagem', templatePadrao]
            );

            res.json({ template: templatePadrao });
        }
    } catch (error) {
        console.error('Erro ao obter template de mensagem:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para atualizar o template de mensagem
app.post('/api/template-mensagem', autenticarUsuario, async (req, res) => {
    try {
        const { template } = req.body;

        if (!template) {
            return res.status(400).json({ error: 'Template de mensagem é obrigatório' });
        }

        // Verificar se já existe um template no banco
        const result = await pool.query('SELECT * FROM config_sistema WHERE chave = $1', ['template_mensagem']);

        if (result.rows.length > 0) {
            // Atualizar o template existente
            await pool.query(
                'UPDATE config_sistema SET valor = $1 WHERE chave = $2',
                [template, 'template_mensagem']
            );
        } else {
            // Inserir o novo template
            await pool.query(
                'INSERT INTO config_sistema (chave, valor) VALUES ($1, $2)',
                ['template_mensagem', template]
            );
        }

        res.json({ success: true, message: 'Template atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar template de mensagem:', error);
        res.status(500).json({ error: error.message });
    }
});

// Variáveis globais para acompanhar progresso do envio
let processoEnvioAtivo = false;
let progressoEnvio = {
    total: 0,
    processados: 0,
    porcentagem: 0,
    itensProcessados: []
};

// Função para atualizar o progresso
function atualizarProgressoEnvio(item) {
    progressoEnvio.processados++;
    progressoEnvio.porcentagem = Math.round((progressoEnvio.processados / progressoEnvio.total) * 100);
    progressoEnvio.itensProcessados.push(item);
}

// Função para resetar o progresso
function resetarProgressoEnvio(total = 0) {
    processoEnvioAtivo = total > 0;
    progressoEnvio = {
        total,
        processados: 0,
        porcentagem: 0,
        itensProcessados: []
    };
}

// Rota para obter o progresso do envio
app.get('/api/progresso-envio', autenticarUsuario, (req, res) => {
    res.json({
        ativo: processoEnvioAtivo,
        ...progressoEnvio
    });
});

// Iniciar o servidor
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    await inicializarApp();
});