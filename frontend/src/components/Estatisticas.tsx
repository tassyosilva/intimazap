import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Box,
    Grid,
    Chip,
    CircularProgress,
    Alert,
    Button
} from '@mui/material';
import { Refresh, Check, Error, Pending, MoreHoriz, TaskAlt } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface Estatistica {
    status: string;
    quantidade: number;
}

interface EstatisticasData {
    total: number;
    porStatus: Estatistica[];
}

interface EstatisticasProps {
    refreshTrigger?: number;
}

const Estatisticas: React.FC<EstatisticasProps> = ({ refreshTrigger = 0 }) => {
    const [estatisticas, setEstatisticas] = useState<EstatisticasData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchEstatisticas = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/estatisticas`);
            setEstatisticas(response.data);
            setError('');
        } catch (err: any) {
            console.error('Erro ao buscar estatísticas:', err);
            setError(err.response?.data?.error || 'Erro ao buscar estatísticas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEstatisticas();
    }, [refreshTrigger]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'enviado':
                return <Check />;
            case 'erro':
                return <Error />;
            case 'pendente':
                return <Pending />;
            case 'finalizado':
                return <TaskAlt />;
            default:
                return <MoreHoriz />; // Ícone padrão em vez de null
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'enviado':
                return 'success';
            case 'erro':
                return 'error';
            case 'pendente':
                return 'warning';
            case 'finalizado':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusTranslation = (status: string) => {
        switch (status) {
            case 'enviado':
                return 'Enviados';
            case 'erro':
                return 'Erros';
            case 'pendente':
                return 'Pendentes';
            case 'finalizado':
                return 'Finalizados';
            default:
                return status;
        }
    };

    const renderChipForStatus = (item: Estatistica) => {
        return (
            <Chip
                icon={getStatusIcon(item.status)}
                label={getStatusTranslation(item.status)}
                color={getStatusColor(item.status) as any}
                size="small"
                sx={{ mb: 1 }}
            />
        );
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                    Estatísticas de Envio
                </Typography>
                <Button
                    startIcon={<Refresh />}
                    size="small"
                    onClick={fetchEstatisticas}
                    disabled={loading}
                >
                    {loading ? 'Atualizando...' : 'Atualizar'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && !estatisticas ? (
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                </Box>
            ) : estatisticas && (
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="h4" align="center">
                                {estatisticas.total || 0}
                            </Typography>
                            <Typography variant="subtitle1" align="center">
                                Total de Intimações
                            </Typography>
                        </Box>
                    </Grid>

                    {estatisticas.porStatus.map((item) => (
                        <Grid item xs={12} sm={3} key={item.status}>
                            <Box sx={{
                                p: 2,
                                border: `1px solid ${getStatusColor(item.status) === 'success' ? '#4caf50' :
                                    getStatusColor(item.status) === 'error' ? '#f44336' :
                                        getStatusColor(item.status) === 'warning' ? '#ff9800' : '#e0e0e0'
                                    }`,
                                borderRadius: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                {renderChipForStatus(item)}
                                <Typography variant="h5">
                                    {item.quantidade}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Paper>
    );
};

export default Estatisticas;