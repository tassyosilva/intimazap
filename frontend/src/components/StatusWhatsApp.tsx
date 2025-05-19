import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Chip,
    Button,
    Grid,
    Alert
} from '@mui/material';
import { Check, Error, Warning, QrCode2 } from '@mui/icons-material';
import axios from 'axios';
import QRCode from 'qrcode.react';

// Usando URL relativa que será resolvida conforme a config do axios em main.tsx
const API_URL = '/api';

const StatusWhatsApp = () => {
    const [status, setStatus] = useState<{
        isConnected: boolean;
        status: string;
        qrCode: string | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/status`);
            setStatus(response.data);
            setError('');
        } catch (err: any) {
            console.error('Erro ao buscar status:', err);
            setError(err.response?.data?.error || 'Erro ao buscar status da conexão');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();

        // Atualizar status a cada 10 segundos
        const interval = setInterval(() => {
            fetchStatus();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

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

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Status da Conexão WhatsApp
            </Typography>

            {loading && !status ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 3 }}>
                    <CircularProgress size={40} />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            ) : (
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={status?.qrCode ? 6 : 12}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Chip
                                icon={getStatusIcon()}
                                label={getStatusText()}
                                color={getStatusColor() as any}
                                sx={{ fontWeight: 'bold' }}
                            />

                            <Button
                                size="small"
                                variant="outlined"
                                onClick={fetchStatus}
                                disabled={loading}
                            >
                                {loading ? 'Atualizando...' : 'Atualizar'}
                            </Button>
                        </Box>

                        {status?.status === 'aguardando_qr' && !status.qrCode && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                QR Code disponível apenas no terminal. Verifique o console da aplicação.
                            </Alert>
                        )}
                    </Grid>

                    {status?.qrCode && (
                        <Grid item xs={12} md={6}>
                            <Box display="flex" justifyContent="center" p={2} border="1px solid #eee" borderRadius={1}>
                                <QRCode value={status.qrCode || ''} size={150} />
                            </Box>
                            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                                Escaneie este QR Code com seu WhatsApp
                            </Typography>
                        </Grid>
                    )}
                </Grid>
            )}
        </Paper>
    );
};

export default StatusWhatsApp;