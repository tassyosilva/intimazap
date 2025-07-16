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
import { Refresh, Check, Error, Pending, MoreHoriz } from '@mui/icons-material';
import axios from 'axios';

const API_URL = '/api';

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

const EstatisticasComunicados: React.FC<EstatisticasProps> = ({ refreshTrigger = 0 }) => {
    const [estatisticas, setEstatisticas] = useState<EstatisticasData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchEstatisticas = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axios.get(`${API_URL}/estatisticas-comunicados`);
            setEstatisticas(response.data);
        } catch (err: any) {
            console.error('Erro ao carregar estatísticas de comunicados:', err);
            setError('Erro ao carregar estatísticas de comunicados');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEstatisticas();
    }, [refreshTrigger]);

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'enviado':
                return <Check sx={{ color: '#4caf50' }} />;
            case 'erro':
                return <Error sx={{ color: '#f44336' }} />;
            case 'pendente':
                return <Pending sx={{ color: '#ff9800' }} />;
            default:
                return <MoreHoriz sx={{ color: '#9e9e9e' }} />;
        }
    };

    const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        switch (status.toLowerCase()) {
            case 'enviado':
                return 'success';
            case 'erro':
                return 'error';
            case 'pendente':
                return 'warning';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Carregando estatísticas de comunicados...
                </Typography>
            </Paper>
        );
    }

    if (error) {
        return (
            <Paper elevation={2} sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchEstatisticas}
                    fullWidth
                >
                    Tentar Novamente
                </Button>
            </Paper>
        );
    }

    return (
        <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Estatísticas de Comunicados
                </Typography>
                <Button
                    size="small"
                    startIcon={<Refresh />}
                    onClick={fetchEstatisticas}
                >
                    Atualizar
                </Button>
            </Box>

            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                    {estatisticas?.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Total de Comunicados
                </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Por Status:
            </Typography>

            <Grid container spacing={1}>
                {estatisticas?.porStatus?.map((item) => (
                    <Grid item xs={12} key={item.status}>
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 1,
                            borderBottom: '1px solid #f0f0f0'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getStatusIcon(item.status)}
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                    {item.status}
                                </Typography>
                            </Box>
                            <Chip
                                label={item.quantidade}
                                color={getStatusColor(item.status)}
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {(!estatisticas?.porStatus || estatisticas.porStatus.length === 0) && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    Nenhum comunicado encontrado
                </Alert>
            )}
        </Paper>
    );
};

export default EstatisticasComunicados;