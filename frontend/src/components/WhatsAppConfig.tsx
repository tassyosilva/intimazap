import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Chip,
    Button,
    Grid,
    Alert,
    Divider
} from '@mui/material';
import { Check, Error, Warning, QrCode2, PowerSettingsNew, PhoneAndroid } from '@mui/icons-material';
import axios from 'axios';
import QRCode from 'qrcode.react';

// Usando URL relativa que será resolvida conforme a config do axios em main.tsx
const API_URL = '/api';

const WhatsAppConfig = () => {
    const [status, setStatus] = useState<{
        isConnected: boolean;
        status: string;
        qrCode: string | null;
    } | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDeviceInfoLoading, setIsDeviceInfoLoading] = useState(false);

    // Usando useCallback para evitar recriação desnecessária destas funções
    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/status`);
            setStatus(response.data);
            setError('');
            return response.data;
        } catch (err: any) {
            console.error('Erro ao buscar status:', err);
            setError(err.response?.data?.error || 'Erro ao buscar status da conexão');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDeviceInfo = useCallback(async () => {
        // Não buscar informações do dispositivo se não estiver conectado
        if (!status?.isConnected) {
            return;
        }

        try {
            setIsDeviceInfoLoading(true);
            const response = await axios.get(`${API_URL}/device-info`);
            if (response.data && Object.keys(response.data).length > 0) {
                setDeviceInfo(response.data);
            }
        } catch (err: any) {
            console.error('Erro ao buscar informações do dispositivo:', err);
        } finally {
            setIsDeviceInfoLoading(false);
        }
    }, [status?.isConnected]);

    // Este efeito é executado uma vez na montagem do componente
    useEffect(() => {
        // Função para buscar dados iniciais
        const fetchInitialData = async () => {
            const statusData = await fetchStatus();
            if (statusData?.isConnected) {
                await fetchDeviceInfo();
            }
        };

        fetchInitialData();

        // Configurar intervalo de atualização
        const interval = setInterval(() => {
            fetchStatus().then(statusData => {
                // Só buscar informações do dispositivo se estiver conectado
                if (statusData?.isConnected) {
                    fetchDeviceInfo();
                }
            });
        }, 10000); // Atualizar a cada 10 segundos

        // Limpar intervalo ao desmontar
        return () => clearInterval(interval);
    }, [fetchStatus, fetchDeviceInfo]);

    // Este efeito responde às mudanças no status de conexão
    useEffect(() => {
        // Se o status indicar que está conectado mas não temos informações do dispositivo
        // ou se as informações do dispositivo foram perdidas, buscá-las novamente
        if (status?.isConnected && (!deviceInfo || Object.keys(deviceInfo).length === 0)) {
            fetchDeviceInfo();
        } else if (!status?.isConnected && deviceInfo) {
            // Se desconectado, limpar informações do dispositivo
            setDeviceInfo(null);
        }
    }, [status?.isConnected, deviceInfo, fetchDeviceInfo]);

    const getStatusIcon = () => {
        if (!status) return <Warning color="warning" />;

        switch (status.status) {
            case 'conectado':
                return <Check color="success" />;
            case 'desconectado':
                return <Error color="error" />;
            case 'aguardando_qr':
                return <QrCode2 color="info" />;
            default:
                return <Warning color="warning" />;
        }
    };

    const getStatusColor = () => {
        if (!status) return 'default';

        switch (status.status) {
            case 'conectado':
                return 'success';
            case 'desconectado':
                return 'error';
            case 'aguardando_qr':
                return 'info';
            default:
                return 'warning';
        }
    };

    const getStatusText = () => {
        if (!status) return 'Desconhecido';

        switch (status.status) {
            case 'conectado':
                return 'Conectado';
            case 'desconectado':
                return 'Desconectado';
            case 'aguardando_qr':
                return 'Aguardando Escaneamento do QR Code';
            default:
                return status.status;
        }
    };

    const handleDisconnect = async () => {
        try {
            setLoading(true);
            await axios.post(`${API_URL}/disconnect`);
            // Limpar informações do dispositivo imediatamente
            setDeviceInfo(null);
            // Aguardar um pouco e buscar o status atualizado
            setTimeout(() => {
                fetchStatus();
            }, 1000);
        } catch (err: any) {
            console.error('Erro ao desconectar:', err);
            setError(err.response?.data?.error || 'Erro ao desconectar do WhatsApp');
            setLoading(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Configuração da Conexão WhatsApp
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {loading && !status ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 3 }}>
                    <CircularProgress size={40} />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Box display="flex" alignItems="center" gap={2} mb={3}>
                            <Chip
                                icon={getStatusIcon()}
                                label={getStatusText()}
                                color={getStatusColor() as any}
                                sx={{ fontWeight: 'bold' }}
                            />

                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    fetchStatus().then(statusData => {
                                        if (statusData?.isConnected) {
                                            fetchDeviceInfo();
                                        }
                                    });
                                }}
                                disabled={loading}
                            >
                                {loading ? 'Atualizando...' : 'Atualizar Status'}
                            </Button>

                            {status?.status === 'conectado' && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="error"
                                    startIcon={<PowerSettingsNew />}
                                    onClick={handleDisconnect}
                                    disabled={loading}
                                >
                                    Desconectar
                                </Button>
                            )}
                        </Box>
                    </Grid>

                    {status?.status === 'conectado' && (
                        <Grid item xs={12}>
                            {isDeviceInfoLoading && !deviceInfo ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                                    <CircularProgress size={30} />
                                </Box>
                            ) : deviceInfo && Object.keys(deviceInfo).length > 0 ? (
                                <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: '#f8f9fa' }}>
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        <PhoneAndroid color="primary" />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                            Informações do Dispositivo Conectado
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2">
                                                <strong>Número:</strong> {deviceInfo.phoneNumber || 'Não disponível'}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Nome:</strong> {deviceInfo.pushName || 'Não disponível'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2">
                                                <strong>Plataforma:</strong> {deviceInfo.platform || 'Não disponível'}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Dispositivo:</strong> {deviceInfo.device || 'Não disponível'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="body2">
                                                <strong>Conectado em:</strong> {deviceInfo.connectedAt ?
                                                    new Date(deviceInfo.connectedAt).toLocaleString('pt-BR') :
                                                    'Não disponível'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            ) : (
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    Carregando informações do dispositivo...
                                </Alert>
                            )}
                        </Grid>
                    )}

                    {status?.qrCode && (
                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Escaneie o QR Code abaixo com seu WhatsApp para conectar
                            </Alert>
                            <Box display="flex" justifyContent="center" p={3} border="1px solid #eee" borderRadius={1}>
                                <QRCode value={status.qrCode} size={250} />
                            </Box>
                            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                                Escaneie este QR Code com seu WhatsApp
                            </Typography>
                        </Grid>
                    )}

                    {status?.status === 'aguardando_qr' && !status.qrCode && (
                        <Grid item xs={12}>
                            <Alert severity="info">
                                QR Code disponível apenas no terminal. Verifique o console da aplicação.
                            </Alert>
                        </Grid>
                    )}

                    <Grid item xs={12} mt={3}>
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                <strong>Status da Conexão:</strong>
                            </Typography>
                            <Typography variant="body2">
                                • <strong>Conectado:</strong> O WhatsApp está autenticado e pronto para enviar mensagens.
                            </Typography>
                            <Typography variant="body2">
                                • <strong>Desconectado:</strong> O WhatsApp não está autenticado. Escaneie o QR Code para conectar.
                            </Typography>
                            <Typography variant="body2">
                                • <strong>Aguardando QR Code:</strong> Aguarde o QR Code aparecer para escaneá-lo.
                            </Typography>
                        </Alert>
                    </Grid>
                </Grid>
            )}
        </Paper>
    );
};

export default WhatsAppConfig;