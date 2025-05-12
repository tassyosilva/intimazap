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
        }
    });

    return sock;
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
            // Formatar o número no padrão WhatsApp (remover caracteres não numéricos)
            let numeroFormatado = telefone.replace(/\D/g, '');

            // Adicionar 55 no início se não começar com 55 (Brasil)
            if (!numeroFormatado.startsWith('55')) {
                numeroFormatado = '55' + numeroFormatado;
            }

            // Garantir formato completo com @s.whatsapp.net
            destino = `${numeroFormatado}@s.whatsapp.net`;
        }

        console.log(`Enviando mensagem para: ${destino}`);
        await sock.sendMessage(destino, { text: mensagem });

        return true;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
    }
}

// Função para processar fila de intimações pendentes
async function processarFilaIntimacoes() {
    try {
        // Buscar intimações pendentes no banco de dados
        const result = await pool.query(
            'SELECT * FROM intimacoes WHERE status = $1 ORDER BY id LIMIT 50',
            ['pendente']
        );

        console.log(`Processando ${result.rows.length} intimações pendentes`);

        // Agrupar intimações por telefone para garantir que cada número receba apenas sua intimação
        const intimacoesPorTelefone = {};

        // Organizar intimações por número de telefone
        for (const intimacao of result.rows) {
            // Formatar o número no padrão WhatsApp (remover caracteres não numéricos)
            let numeroFormatado = intimacao.telefone.replace(/\D/g, '');

            // Adicionar 55 no início se não começar com 55 (Brasil)
            if (!numeroFormatado.startsWith('55')) {
                numeroFormatado = '55' + numeroFormatado;
            }

            // Usar o número formatado como chave para o agrupamento
            intimacoesPorTelefone[numeroFormatado] = intimacao;
        }

        // Processar cada intimação para seu número específico
        for (const numeroTelefone in intimacoesPorTelefone) {
            const intimacao = intimacoesPorTelefone[numeroTelefone];

            try {
                console.log(`Enviando mensagem para: ${numeroTelefone}@s.whatsapp.net`);

                // Enviar a mensagem específica para este número
                await enviarMensagem(numeroTelefone, intimacao.mensagem);

                // Atualizar status para enviado
                await pool.query(
                    'UPDATE intimacoes SET status = $1, data_envio = NOW() WHERE id = $2',
                    ['enviado', intimacao.id]
                );

                // Registrar log de sucesso
                await pool.query(
                    'INSERT INTO logs_envio (intimacao_id, status) VALUES ($1, $2)',
                    [intimacao.id, 'enviado']
                );

                // Pequena pausa para evitar bloqueio por spam
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.error(`Erro ao enviar intimação #${intimacao.id}:`, error);

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
            }
        }

        return { processados: Object.keys(intimacoesPorTelefone).length };
    } catch (error) {
        console.error('Erro ao processar fila de intimações:', error);
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

module.exports = {
    startBot,
    enviarMensagem,
    processarFilaIntimacoes,
    getConnectionStatus
};