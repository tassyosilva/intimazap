require('./fix-crypto.js');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const { pool } = require('./db');

// Configuração para armazenar estados de conexão
let sock = null;
let qrString = null;
let isConnected = false;
let connectionStatus = 'desconectado';
let deviceInfo = null;

// Garantir acesso às variáveis globais
if (!global.atualizarProgressoEnvio) {
    global.atualizarProgressoEnvio = function (item) {
        console.log('Função atualizarProgressoEnvio não disponível!');
    };
}

if (!global.resetarProgressoEnvio) {
    global.resetarProgressoEnvio = function (total = 0) {
        console.log('Função resetarProgressoEnvio não disponível!');
    };
}

// Função para iniciar o bot WhatsApp
async function startBot() {
    await fs.ensureDir('./auth_info_baileys');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrString = qr;
            connectionStatus = 'aguardando_qr';
            console.log('QR Code gerado. Escaneie com seu WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;

            console.log('Conexão fechada devido a ', lastDisconnect?.error);
            isConnected = false;
            connectionStatus = 'desconectado';
            deviceInfo = null; // Limpar informações do dispositivo

            if (shouldReconnect) {
                console.log('Reconectando...');
                startBot();
            } else {
                console.log('Desconectado permanentemente.');
            }
        } else if (connection === 'open') {
            console.log('Conexão estabelecida com sucesso!');
            isConnected = true;
            connectionStatus = 'conectado';
            qrString = null;

            // Obter e armazenar informações do dispositivo
            try {
                const phoneNumber = sock.user?.id?.split(':')[0]?.split('@')[0];
                const formattedNumber = phoneNumber ? formatPhoneNumber(phoneNumber) : 'Desconhecido';
                const platform = sock.user?.platform || 'Desconhecido';
                const pushName = sock.user?.name || 'Desconhecido';
                const device = sock.user?.phone?.device_manufacturer ?
                    `${sock.user.phone.device_manufacturer} ${sock.user.phone.device_model}` :
                    'Desconhecido';

                deviceInfo = {
                    phoneNumber: formattedNumber,
                    pushName: pushName,
                    platform: platform,
                    device: device,
                    connectedAt: new Date().toISOString()
                };

                console.log('Informações do dispositivo:', deviceInfo);
            } catch (error) {
                console.error('Erro ao obter informações do dispositivo:', error);
                deviceInfo = { error: 'Não foi possível obter informações do dispositivo.' };
            }
        }
    });

    // Adicionar função auxiliar para formatar número de telefone
    function formatPhoneNumber(phoneNumber) {
        // Remover o "55" inicial para mostrar apenas DDD + número
        if (phoneNumber.startsWith('55') && phoneNumber.length >= 12) {
            const ddd = phoneNumber.substring(2, 4);
            const numero = phoneNumber.substring(4);
            return `(${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`;
        }
        return phoneNumber;
    }

    return sock;
}

// Função para formatar corretamente o número de telefone
function formatarNumeroTelefone(numeroOriginal) {
    // Remover todos os caracteres não numéricos
    let numero = numeroOriginal.replace(/\D/g, '');

    // Se já começa com 55, verificar se precisa ajustar o formato
    if (numero.startsWith('55')) {
        // Verificar se tem o formato 55+DDD+9+número (13 dígitos)
        if (numero.length === 13) {
            // Remover o 9 após o DDD (assumindo que está na posição correta)
            return numero.substring(0, 4) + numero.substring(5);
        }
        return numero; // Já está no formato correto ou outro formato
    }

    // Se começa com o DDD (formato "DDD+número")
    if (numero.length >= 10) {
        // Extrair os dois primeiros dígitos como DDD
        const ddd = numero.substring(0, 2);
        let restante = numero.substring(2);

        // Se o primeiro dígito após o DDD for 9, removê-lo
        if (restante.startsWith('9') && restante.length > 8) {
            restante = restante.substring(1);
        }

        return `55${ddd}${restante}`;
    }

    // Número sem DDD, adicionar DDD padrão (95 para Roraima)
    if (numero.length <= 9) {
        // Se começa com 9 e tem 9 dígitos, remover o 9 inicial
        if (numero.startsWith('9') && numero.length === 9) {
            return `5595${numero.substring(1)}`;
        }
        return `5595${numero}`;
    }

    // Para outros casos, apenas adicionar 55 no início
    console.log(`Formato de número não padrão: ${numero}. Adicionando 55 no início.`);
    return `55${numero}`;
}

// Função para enviar uma mensagem
async function enviarMensagem(telefone, mensagem) {
    if (!isConnected) {
        throw new Error('Bot não está conectado ao WhatsApp');
    }

    try {
        // Verificar se o número já está formatado (contém @s.whatsapp.net)
        let destino;
        if (telefone.includes('@s.whatsapp.net')) {
            destino = telefone;
        } else {
            // Formatar o número no padrão WhatsApp
            let numeroFormatado = formatarNumeroTelefone(telefone);

            // Garantir formato completo com @s.whatsapp.net
            destino = `${numeroFormatado}@s.whatsapp.net`;
        }

        console.log(`Enviando mensagem para: ${destino}`);
        console.log(`Conteúdo da mensagem (primeiros 100 caracteres): ${mensagem.substring(0, 100)}...`);

        // Criar um objeto de mensagem específico
        const mensagemObj = {
            text: mensagem
        };

        // Enviar a mensagem uma única vez para o destinatário específico
        const result = await sock.sendMessage(destino, mensagemObj);
        console.log(`Mensagem enviada com ID: ${result?.key?.id || 'desconhecido'}`);

        return true;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
    }
}

// Função para processar fila de intimações pendentes
async function processarFilaIntimacoes() {
    try {
        // Configurar timezone explicitamente para esta transação
        await pool.query(`SET timezone = 'America/Boa_Vista'`);

        // Buscar intimações pendentes no banco de dados
        const result = await pool.query(
            'SELECT * FROM intimacoes WHERE status = $1 ORDER BY id LIMIT 50',
            ['pendente']
        );

        const totalIntimacoes = result.rows.length;
        console.log(`Processando ${totalIntimacoes} intimações pendentes`);

        // Resetar progresso global
        global.resetarProgressoEnvio(totalIntimacoes);

        // Debug: listar todas as intimações com detalhes específicos
        for (let i = 0; i < result.rows.length; i++) {
            const item = result.rows[i];
            console.log(`DEBUG [${i}] ID: ${item.id}, Nome: ${item.nome}, Telefone: ${item.telefone}`);
            console.log(`DEBUG [${i}] Mensagem (primeiros 50 caracteres): ${item.mensagem.substring(0, 50)}...`);
        }

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
                // Formatar o número corretamente
                let numeroFormatado = formatarNumeroTelefone(intimacao.telefone);

                console.log(`\n[PROCESSANDO ${i + 1}/${result.rows.length}] Intimação #${intimacao.id} para ${intimacao.nome}`);
                console.log(`Número original: ${intimacao.telefone}`);
                console.log(`Número formatado: ${numeroFormatado}@s.whatsapp.net`);
                console.log(`ID da mensagem: ${intimacao.id}`);

                // Pausa antes de enviar (para garantir sincronização)
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Enviar a mensagem específica para este número
                await enviarMensagem(numeroFormatado, intimacao.mensagem);
                console.log(`Mensagem enviada com sucesso para ${intimacao.nome}`);

                registro.status = 'enviado';
                registro.mensagem = 'Mensagem enviada com sucesso';

                // Usar JavaScript para obter a hora local e formatá-la para salvar
                const agora = new Date();
                const horaLocal = agora.toLocaleString('pt-BR');
                console.log(`Hora local obtida via JavaScript: ${horaLocal}`);

                // Verificar hora atual no PostgreSQL antes do update
                const verificaHora = await pool.query(`SELECT NOW() as agora, NOW() AT TIME ZONE 'America/Boa_Vista' as hora_boa_vista`);
                console.log(`Hora PostgreSQL antes do update: ${verificaHora.rows[0].agora}`);
                console.log(`Hora Boa Vista antes do update: ${verificaHora.rows[0].hora_boa_vista}`);

                // Atualizar status para enviado com timestamp explícito
                await pool.query(
                    `UPDATE intimacoes SET status = $1, data_envio = CURRENT_TIMESTAMP WHERE id = $2`,
                    ['enviado', intimacao.id]
                );

                // Verificar qual timestamp foi realmente salvo
                const horaRegistrada = await pool.query(
                    `SELECT data_envio, 
                      data_envio AT TIME ZONE 'UTC' as utc_time,
                      data_envio AT TIME ZONE 'America/Boa_Vista' as local_time
                     FROM intimacoes WHERE id = $1`,
                    [intimacao.id]
                );

                console.log(`Timestamp salvo: ${horaRegistrada.rows[0].data_envio}`);
                console.log(`Timestamp em UTC: ${horaRegistrada.rows[0].utc_time}`);
                console.log(`Timestamp em Boa Vista: ${horaRegistrada.rows[0].local_time}`);

                console.log(`Status atualizado para 'enviado' para intimação #${intimacao.id}`);

                // Registrar log de sucesso
                await pool.query(
                    'INSERT INTO logs_envio (intimacao_id, status) VALUES ($1, $2)',
                    [intimacao.id, 'enviado']
                );

                processados++;

                // Atualizar progresso global
                global.atualizarProgressoEnvio(registro);
                resultadosDetalhados.push(registro);

                // Pausa maior entre envios para evitar problemas de sincronização e limite de taxa
                console.log(`Aguardando 5 segundos antes do próximo envio...`);
                await new Promise(resolve => setTimeout(resolve, 5000));

            } catch (error) {
                console.error(`Erro ao enviar intimação #${intimacao.id}:`, error);

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

        return {
            processados,
            resultadosDetalhados
        };
    } catch (error) {
        console.error('Erro ao processar fila de intimações:', error);
        // Finalizar processo em caso de erro
        global.processoEnvioAtivo = false;
        throw error;
    }
}

// Obter status da conexão
function getConnectionStatus() {
    return {
        isConnected,
        status: connectionStatus,
        qrCode: qrString
    };
}

// Função para desconectar o bot
async function disconnectBot() {
    try {
        if (!sock) {
            throw new Error('Bot não está inicializado');
        }

        console.log('Iniciando desconexão do WhatsApp...');

        // Verificar se há uma sessão ativa
        if (isConnected) {
            // Limpar diretório de autenticação para forçar nova autenticação
            await fs.remove('./auth_info_baileys');
            await fs.ensureDir('./auth_info_baileys');

            // Atualizar estado
            isConnected = false;
            connectionStatus = 'desconectado';
            qrString = null;

            console.log('Sessão WhatsApp encerrada. Reiniciando conexão para gerar novo QR code...');

            // Reiniciar o bot após um breve atraso
            setTimeout(() => {
                startBot();
            }, 1000);

            return { success: true, message: 'WhatsApp desconectado com sucesso' };
        } else {
            return { success: false, message: 'WhatsApp já está desconectado' };
        }
    } catch (error) {
        console.error('Erro ao desconectar WhatsApp:', error);
        throw error;
    }
}

// Obter informações do dispositivo
function getDeviceInfo() {
    return deviceInfo || null;
}

module.exports = {
    startBot,
    enviarMensagem,
    processarFilaIntimacoes,
    getConnectionStatus,
    disconnectBot,
    getDeviceInfo
};