require('./fix-crypto.js');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { initDatabase, pool } = require('./db');
const { startBot, processarFilaIntimacoes, processarFilaComunicados, getConnectionStatus, disconnectBot, getDeviceInfo, enviarMensagem } = require('./whatsappBot');
const { processarPlanilha, obterEstatisticas, listarIntimacoes, processarPlanilhaComunicados, obterEstatisticasComunicados, listarComunicados } = require('./processor');

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

// Rota para finalizar uma intimação
app.post('/api/intimacoes/:id/finalizar', autenticarUsuario, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se a intimação existe
        const checkResult = await pool.query(
            'SELECT * FROM intimacoes WHERE id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Intimação não encontrada' });
        }

        // Atualizar o status para 'finalizado'
        await pool.query(
            'UPDATE intimacoes SET status = $1 WHERE id = $2',
            ['finalizado', id]
        );

        // Registrar no log
        await pool.query(
            'INSERT INTO logs_envio (intimacao_id, status) VALUES ($1, $2)',
            [id, 'finalizado']
        );

        res.json({
            success: true,
            message: 'Intimação finalizada com sucesso',
            id: parseInt(id)
        });
    } catch (error) {
        console.error('Erro ao finalizar intimação:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para reenviar uma intimação
app.post('/api/intimacoes/:id/reenviar', autenticarUsuario, async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar informações da intimação
        const result = await pool.query(
            'SELECT * FROM intimacoes WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Intimação não encontrada' });
        }

        const intimacao = result.rows[0];

        // Verificar se o WhatsApp está conectado
        const { isConnected } = getConnectionStatus();
        if (!isConnected) {
            return res.status(400).json({ error: 'WhatsApp não está conectado' });
        }

        try {
            // Tentar enviar a mensagem
            await enviarMensagem(intimacao.telefone, intimacao.mensagem);

            // Atualizar status e data de envio
            await pool.query(
                'UPDATE intimacoes SET status = $1, data_envio = CURRENT_TIMESTAMP WHERE id = $2',
                ['enviado', id]
            );

            // Registrar log
            await pool.query(
                'INSERT INTO logs_envio (intimacao_id, status) VALUES ($1, $2)',
                [id, 'enviado']
            );

            res.json({
                success: true,
                message: 'Intimação reenviada com sucesso',
                id: parseInt(id)
            });
        } catch (error) {
            // Atualizar status para erro
            await pool.query(
                'UPDATE intimacoes SET status = $1 WHERE id = $2',
                ['erro', id]
            );

            // Registrar log de erro
            await pool.query(
                'INSERT INTO logs_envio (intimacao_id, status, erro) VALUES ($1, $2, $3)',
                [id, 'erro', error.message || 'Erro desconhecido']
            );

            throw error;
        }
    } catch (error) {
        console.error('Erro ao reenviar intimação:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para reenviar todas as intimações não finalizadas
app.post('/api/reenviar-nao-finalizadas', autenticarUsuario, async (req, res) => {
    try {
        // Verificar se o WhatsApp está conectado
        const { isConnected } = getConnectionStatus();
        if (!isConnected) {
            return res.status(400).json({ error: 'WhatsApp não está conectado' });
        }

        // Buscar todas as intimações que não estão finalizadas
        const result = await pool.query(
            'SELECT * FROM intimacoes WHERE status != $1 ORDER BY id',
            ['finalizado']
        );

        const totalIntimacoes = result.rows.length;
        console.log(`Processando ${totalIntimacoes} intimações não finalizadas para reenvio`);

        // Resetar progresso global
        global.resetarProgressoEnvio(totalIntimacoes);
        global.processoEnvioAtivo = true;

        // Contador de processados
        let processados = 0;
        const resultadosDetalhados = [];

        // Processar cada intimação individualmente, com pausa entre elas
        for (let i = 0; i < result.rows.length; i++) {
            const intimacao = result.rows[i];
            const registro = {
                id: intimacao.id,
                nome: intimacao.nome,
                telefone: intimacao.telefone,
                status: '',
                mensagem: '',
                hora: new Date().toLocaleTimeString('pt-BR'),
                progresso: `${i + 1}/${totalIntimacoes}`
            };

            try {
                console.log(`\n[PROCESSANDO ${i + 1}/${result.rows.length}] Reenvio de intimação #${intimacao.id} para ${intimacao.nome}`);
                console.log(`Número: ${intimacao.telefone}`);

                // Pausa antes de enviar (para garantir sincronização)
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Enviar a mensagem específica para este número
                await enviarMensagem(intimacao.telefone, intimacao.mensagem);
                console.log(`Mensagem reenviada com sucesso para ${intimacao.nome}`);

                registro.status = 'enviado';
                registro.mensagem = 'Mensagem reenviada com sucesso';

                // Atualizar status para enviado com timestamp explícito
                await pool.query(
                    `UPDATE intimacoes SET status = $1, data_envio = CURRENT_TIMESTAMP WHERE id = $2`,
                    ['enviado', intimacao.id]
                );

                // Registrar log de sucesso
                await pool.query(
                    'INSERT INTO logs_envio (intimacao_id, status) VALUES ($1, $2)',
                    [intimacao.id, 'enviado']
                );

                processados++;

                // Atualizar progresso global
                global.atualizarProgressoEnvio(registro);
                resultadosDetalhados.push(registro);

                // Pausa entre envios para evitar problemas de sincronização e limite de taxa
                console.log(`Aguardando 5 segundos antes do próximo envio...`);
                await new Promise(resolve => setTimeout(resolve, 5000));

            } catch (error) {
                console.error(`Erro ao reenviar intimação #${intimacao.id}:`, error);

                registro.status = 'erro';
                registro.mensagem = error.message || 'Erro desconhecido';

                // Atualizar status para erro
                await pool.query(
                    'UPDATE intimacoes SET status = $1 WHERE id = $2',
                    ['erro', intimacao.id]
                );

                // Registrar log de erro
                await pool.query(
                    'INSERT INTO logs_envio (intimacao_id, status, erro) VALUES ($1, $2, $3)',
                    [intimacao.id, 'erro', error.message || 'Erro desconhecido']
                );

                // Atualizar progresso global
                global.atualizarProgressoEnvio(registro);
                resultadosDetalhados.push(registro);

                // Pausa após erro
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // Finalizar processo de envio
        global.processoEnvioAtivo = false;

        return res.json({
            success: true,
            message: `Reenvio de ${processados} intimações concluído`,
            resultado: {
                processados,
                total: totalIntimacoes,
                resultadosDetalhados
            }
        });
    } catch (error) {
        console.error('Erro ao reenviar intimações não finalizadas:', error);
        global.processoEnvioAtivo = false;
        res.status(500).json({ error: error.message });
    }
});

// Rotas para comunicados
// Rota para upload da planilha de comunicados
app.post('/api/upload-comunicados', autenticarUsuario, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const filePath = req.file.path;
        const resultados = await processarPlanilhaComunicados(filePath);

        res.json({
            success: true,
            message: 'Arquivo de comunicados processado com sucesso',
            resultados
        });
    } catch (error) {
        console.error('Erro no upload de comunicados:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para processar a fila de comunicados
app.post('/api/processar-fila-comunicados', autenticarUsuario, async (req, res) => {
    try {
        const resultado = await processarFilaComunicados();
        res.json({
            success: true,
            message: 'Fila de comunicados processada com sucesso',
            resultado
        });
    } catch (error) {
        console.error('Erro ao processar fila de comunicados:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para reenviar um comunicado específico
app.post('/api/comunicados/:id/reenviar', autenticarUsuario, async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar informações do comunicado
        const result = await pool.query(
            'SELECT * FROM comunicados WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comunicado não encontrado' });
        }

        const comunicado = result.rows[0];

        // Verificar se o bot está conectado
        const { isConnected } = getConnectionStatus();
        if (!isConnected) {
            return res.status(400).json({ error: 'WhatsApp não está conectado' });
        }

        try {
            // Enviar a mensagem
            await enviarMensagem(comunicado.telefone, comunicado.mensagem);

            // Atualizar status para enviado
            await pool.query(
                'UPDATE comunicados SET status = $1, data_envio = CURRENT_TIMESTAMP WHERE id = $2',
                ['enviado', id]
            );

            // Registrar log de sucesso
            await pool.query(
                'INSERT INTO logs_comunicados (comunicado_id, status) VALUES ($1, $2)',
                [id, 'enviado']
            );

            res.json({
                success: true,
                message: 'Comunicado reenviado com sucesso',
                id: parseInt(id)
            });

        } catch (error) {
            console.error(`Erro ao reenviar comunicado #${id}:`, error);

            // Atualizar status para erro
            await pool.query(
                'UPDATE comunicados SET status = $1 WHERE id = $2',
                ['erro', id]
            );

            // Registrar log de erro
            await pool.query(
                'INSERT INTO logs_comunicados (comunicado_id, status, erro) VALUES ($1, $2, $3)',
                [id, 'erro', error.message]
            );

            throw error;
        }

    } catch (error) {
        console.error('Erro ao reenviar comunicado:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para obter estatísticas de comunicados
app.get('/api/estatisticas-comunicados', autenticarUsuario, async (req, res) => {
    try {
        const estatisticas = await obterEstatisticasComunicados();
        res.json(estatisticas);
    } catch (error) {
        console.error('Erro ao obter estatísticas de comunicados:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para listar comunicados com paginação
app.get('/api/comunicados', autenticarUsuario, async (req, res) => {
    try {
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 20;
        const filtro = {};

        if (req.query.status) filtro.status = req.query.status;
        if (req.query.texto) filtro.texto = req.query.texto;

        const resultado = await listarComunicados(pagina, limite, filtro);
        res.json(resultado);
    } catch (error) {
        console.error('Erro ao listar comunicados:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para obter o template de comunicado
app.get('/api/template-comunicado', autenticarUsuario, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM config_sistema WHERE chave = $1', ['template_comunicado']);

        if (result.rows.length > 0) {
            res.json({ template: result.rows[0].valor });
        } else {
            const templatePadrao = `Olá, {nome}!

Esta é uma mensagem de comunicado importante.

Por favor, mantenha-se atento às nossas comunicações.

Atenciosamente,
Equipe de Comunicação`;

            await pool.query(
                'INSERT INTO config_sistema (chave, valor) VALUES ($1, $2)',
                ['template_comunicado', templatePadrao]
            );

            res.json({ template: templatePadrao });
        }
    } catch (error) {
        console.error('Erro ao obter template de comunicado:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para atualizar o template de comunicado
app.post('/api/template-comunicado', autenticarUsuario, async (req, res) => {
    try {
        const { template } = req.body;

        if (!template) {
            return res.status(400).json({ error: 'Template de comunicado é obrigatório' });
        }

        const result = await pool.query('SELECT * FROM config_sistema WHERE chave = $1', ['template_comunicado']);

        if (result.rows.length > 0) {
            await pool.query(
                'UPDATE config_sistema SET valor = $1 WHERE chave = $2',
                [template, 'template_comunicado']
            );
        } else {
            await pool.query(
                'INSERT INTO config_sistema (chave, valor) VALUES ($1, $2)',
                ['template_comunicado', template]
            );
        }

        res.json({ success: true, message: 'Template de comunicado atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar template de comunicado:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar o servidor
app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    await inicializarApp();
});