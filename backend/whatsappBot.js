require('./fix-crypto.js');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const { pool } = require('./db');

const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_ENV === 'true';
console.log(`Executando em ambiente Docker: ${isDocker ? 'Sim' : 'Não'}`);

const AUTH_DIR = isDocker
    ? path.resolve('/app/auth_info_baileys')
    : path.join(__dirname, 'auth_info_baileys');

console.log(`Diretório de autenticação configurado: ${AUTH_DIR}`);

let sock = null;
let qrString = null;
let isConnected = false;
let connectionStatus = 'desconectado';
let deviceInfo = null;

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

const clearAuthInfo = async () => {
    try {
        console.log(`🧹 Limpando dados de autenticação no diretório: ${AUTH_DIR}`);
        const files = await fs.readdir(AUTH_DIR);
        for (const file of files) {
            const filePath = path.join(AUTH_DIR, file);
            await fs.remove(filePath);
            console.log(`Arquivo removido: ${file}`);
        }
        console.log('✅ Dados de autenticação limpos com sucesso!');
    } catch (error) {
        console.error('⚠️ Erro ao limpar dados de autenticação:', error);
    }
};

async function startBot() {
    try {
        await fs.ensureDir(AUTH_DIR);
        console.log(`Diretório de autenticação garantido: ${AUTH_DIR}`);

        try {
            await fs.access(AUTH_DIR, fs.constants.R_OK | fs.constants.W_OK);
            console.log('Diretório de autenticação tem permissões de leitura/escrita');
            const files = await fs.readdir(AUTH_DIR);
            console.log(`Arquivos no diretório de autenticação (${files.length}):`, files);
        } catch (error) {
            console.error('Erro de permissão no diretório de autenticação:', error);
            try {
                await fs.chmod(AUTH_DIR, 0o755);
                console.log('Tentativa de correção de permissões aplicada');
            } catch (permError) {
                console.error('Falha ao corrigir permissões:', permError);
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        console.log('Estado de autenticação carregado com sucesso');

        sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            logger: pino({ level: 'silent' })
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;

            if (qr) {
                console.log('🔑 Novo QR Code gerado. Escaneie no WhatsApp:');
                qrcode.generate(qr, { small: true });
                qrString = qr;
                connectionStatus = 'aguardando_qr';
            }

            if (connection === 'close') {
                console.log('Conexão fechada.');

                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode || 'Desconhecido';
                const errorMessage = lastDisconnect?.error?.message || 'Sem detalhes adicionais.';
                const fullError = lastDisconnect?.error || {};

                console.log(`Motivo da desconexão: ${reason}`);
                console.log(`Mensagem de erro: ${errorMessage}`);
                console.log('Detalhes completos do erro:', fullError);

                if (reason === DisconnectReason.loggedOut) {
                    console.log('❌ Usuário deslogado no celular. Limpando dados e gerando novo QR Code...');
                    await clearAuthInfo();
                    startBot();
                } else if (reason === DisconnectReason.connectionClosed || reason === 401) {
                    console.log('🔌 Reconectando após perda de conexão...');
                    setTimeout(() => startBot(), 3000);
                } else {
                    console.log('❗ Motivo inesperado. Tentando reconectar como fallback...');
                    setTimeout(() => startBot(), 5000);
                }

                isConnected = false;
                connectionStatus = 'desconectado';
                deviceInfo = null;
            } else if (connection === 'open') {
                console.log('✅ Conexão estabelecida com sucesso!');
                isConnected = true;
                connectionStatus = 'conectado';
                qrString = null;

                try {
                    const phoneNumber = sock.user?.id?.split(':')[0]?.split('@')[0];
                    const formattedNumber = phoneNumber ? formatPhoneNumber(phoneNumber) : 'Desconhecido';
                    const platform = sock.user?.platform || 'Desconhecido';
                    const pushName = sock.user?.name || 'Desconhecido';
                    const device = sock.user?.phone?.device_manufacturer
                        ? `${sock.user.phone.device_manufacturer} ${sock.user.phone.device_model}`
                        : 'Desconhecido';

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

        return sock;
    } catch (error) {
        console.error('Erro crítico ao inicializar o bot WhatsApp:', error);
        throw error;
    }
}

function formatPhoneNumber(phoneNumber) {
    if (phoneNumber.startsWith('55') && phoneNumber.length >= 12) {
        const ddd = phoneNumber.substring(2, 4);
        const numero = phoneNumber.substring(4);
        return `(${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`;
    }
    return phoneNumber;
}

async function enviarMensagem(telefone, mensagem) {
    if (!isConnected) {
        throw new Error('Bot não está conectado ao WhatsApp');
    }

    try {
        let destino;
        if (telefone.includes('@s.whatsapp.net')) {
            destino = telefone;
        } else {
            const numeroFormatado = formatPhoneNumber(telefone);
            destino = `${numeroFormatado}@s.whatsapp.net`;
        }

        console.log(`Enviando mensagem para: ${destino}`);
        const result = await sock.sendMessage(destino, { text: mensagem });
        console.log(`Mensagem enviada com ID: ${result?.key?.id || 'desconhecido'}`);
        return true;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
    }
}

// Função `getDeviceInfo` declarada corretamente
function getDeviceInfo() {
    return deviceInfo || null;
}

// Função para verificar conexão
function getConnectionStatus() {
    return {
        isConnected,
        status: connectionStatus,
        qrCode: qrString
    };
}

async function disconnectBot() {
    try {
        if (!sock) {
            throw new Error('Bot não está inicializado');
        }

        console.log('Iniciando desconexão do WhatsApp...');
        if (isConnected) {
            await fs.remove(AUTH_DIR);
            await fs.ensureDir(AUTH_DIR);
            isConnected = false;
            connectionStatus = 'desconectado';
            qrString = null;
            console.log('Sessão encerrada. Gerando um novo QR Code...');
            setTimeout(() => startBot(), 1000);
        }
        return { success: true, message: 'WhatsApp desconectado com sucesso' };
    } catch (error) {
        console.error('Erro ao desconectar WhatsApp:', error);
        throw error;
    }
}

module.exports = {
    startBot,
    enviarMensagem,
    getConnectionStatus,
    disconnectBot,
    getDeviceInfo, 
    AUTH_DIR
};