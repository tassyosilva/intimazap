import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Box,
    LinearProgress,
    Alert,
    Grid,
    Chip,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell
} from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface ItemProcessado {
    id: number;
    nome: string;
    telefone: string;
    status: string;
    mensagem: string;
    hora: string;
    progresso: string;
}

interface ProgressoEnvioProps {
    visible: boolean;
    onComplete: () => void;
}

const ProgressoEnvio: React.FC<ProgressoEnvioProps> = ({ visible, onComplete }) => {
    const [progresso, setProgresso] = useState({
        ativo: false,
        total: 0,
        processados: 0,
        porcentagem: 0,
        itensProcessados: [] as ItemProcessado[]
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!visible) return;

        // Iniciar polling
        const interval = setInterval(() => {
            fetchProgresso();
        }, 2000); // Verificar a cada 2 segundos

        return () => clearInterval(interval);
    }, [visible]);

    // Verificar se o processo foi finalizado
    useEffect(() => {
        if (progresso.ativo && progresso.total > 0 && progresso.processados >= progresso.total) {
            // Processo finalizado
            setTimeout(() => {
                onComplete();
            }, 3000); // Dar tempo para o usuário ver a conclusão
        }
    }, [progresso, onComplete]);

    const fetchProgresso = async () => {
        try {
            const response = await axios.get(`${API_URL}/progresso-envio`);
            setProgresso(response.data);
            setError('');
        } catch (err: any) {
            console.error('Erro ao buscar progresso:', err);
            setError(err.response?.data?.error || 'Erro ao obter progresso do envio');
        }
    };

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'enviado':
                return <Chip icon={<CheckCircle />} label="Enviado" color="success" size="small" />;
            case 'erro':
                return <Chip icon={<Error />} label="Erro" color="error" size="small" />;
            default:
                return <Chip label={status} color="default" size="small" />;
        }
    };

    if (!visible) return null;

    return (
        <Paper elevation={3} sx={{ p: 3, my: 3 }}>
            <Typography variant="h6" gutterBottom>
                Progresso do Envio
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                        <LinearProgress
                            variant="determinate"
                            value={progresso.porcentagem}
                            sx={{ height: 10, borderRadius: 5 }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary" align="right">
                            {progresso.processados} de {progresso.total} ({progresso.porcentagem}%)
                        </Typography>
                    </Grid>
                </Grid>
            </Box>

            {progresso.itensProcessados.length > 0 && (
                <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Progresso</TableCell>
                                <TableCell>ID</TableCell>
                                <TableCell>Nome</TableCell>
                                <TableCell>Telefone</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Mensagem</TableCell>
                                <TableCell>Hora</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {progresso.itensProcessados.map((item, index) => (
                                <TableRow key={`${item.id}-${index}`}>
                                    <TableCell>{item.progresso}</TableCell>
                                    <TableCell>{item.id}</TableCell>
                                    <TableCell>{item.nome}</TableCell>
                                    <TableCell>{item.telefone}</TableCell>
                                    <TableCell>{getStatusChip(item.status)}</TableCell>
                                    <TableCell>{item.mensagem}</TableCell>
                                    <TableCell>{item.hora}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {progresso.ativo && progresso.total > 0 && progresso.processados >= progresso.total && (
                <Alert severity="success" sx={{ mt: 2 }}>
                    Processamento concluído com sucesso!
                </Alert>
            )}
        </Paper>
    );
};

export default ProgressoEnvio;