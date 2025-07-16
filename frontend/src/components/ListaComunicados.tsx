import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    CircularProgress,
    Alert,
    Button
} from '@mui/material';
import { Search, Refresh, CheckCircle, Error, Pending } from '@mui/icons-material';
import axios from 'axios';

const API_URL = '/api';

interface Comunicado {
    id: number;
    nome: string;
    telefone: string;
    status: string;
    data_envio: string | null;
    created_at: string;
}

interface ListagemProps {
    refreshTrigger?: number;
}

const ListaComunicados: React.FC<ListagemProps> = ({ refreshTrigger = 0 }) => {
    const [comunicados, setComunicados] = useState<Comunicado[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterText, setFilterText] = useState('');

    const fetchComunicados = async () => {
        try {
            setLoading(true);

            const params: any = {
                pagina: page + 1,
                limite: rowsPerPage
            };

            if (filterStatus) params.status = filterStatus;
            if (filterText) params.texto = filterText;

            const queryString = new URLSearchParams(params).toString();
            const response = await axios.get(`${API_URL}/comunicados?${queryString}`);

            setComunicados(response.data.comunicados || []);
            setTotal(response.data.total || 0);
            setError('');
        } catch (err: any) {
            console.error('Erro ao carregar comunicados:', err);
            setError('Erro ao carregar comunicados');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComunicados();
    }, [page, rowsPerPage, filterStatus, filterText, refreshTrigger]);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterChange = () => {
        setPage(0);
        fetchComunicados();
    };

    const getStatusChip = (status: string) => {
        switch (status.toLowerCase()) {
            case 'enviado':
                return (
                    <Chip
                        icon={<CheckCircle />}
                        label="Enviado"
                        color="success"
                        size="small"
                        variant="outlined"
                    />
                );
            case 'erro':
                return (
                    <Chip
                        icon={<Error />}
                        label="Erro"
                        color="error"
                        size="small"
                        variant="outlined"
                    />
                );
            case 'pendente':
                return (
                    <Chip
                        icon={<Pending />}
                        label="Pendente"
                        color="warning"
                        size="small"
                        variant="outlined"
                    />
                );
            default:
                return (
                    <Chip
                        label={status}
                        color="default"
                        size="small"
                        variant="outlined"
                    />
                );
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Data inválida';
        }
    };

    if (loading && comunicados.length === 0) {
        return (
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Carregando comunicados...
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                    Comunicações Enviadas
                </Typography>
                <Button
                    size="small"
                    startIcon={<Refresh />}
                    onClick={() => fetchComunicados()}
                    disabled={loading}
                >
                    Atualizar
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={filterStatus}
                            label="Status"
                            onChange={(e) => {
                                setFilterStatus(e.target.value);
                                handleFilterChange();
                            }}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="pendente">Pendente</MenuItem>
                            <MenuItem value="enviado">Enviado</MenuItem>
                            <MenuItem value="erro">Erro</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={6}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Buscar por nome ou telefone"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleFilterChange();
                            }
                        }}
                        InputProps={{
                            endAdornment: (
                                <Search
                                    sx={{ cursor: 'pointer' }}
                                    onClick={handleFilterChange}
                                />
                            )
                        }}
                    />
                </Grid>

                <Grid item xs={12} sm={12} md={3}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleFilterChange}
                        disabled={loading}
                        sx={{ height: '40px' }}
                    >
                        Filtrar
                    </Button>
                </Grid>
            </Grid>

            <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>ID</strong></TableCell>
                            <TableCell><strong>Nome</strong></TableCell>
                            <TableCell><strong>Telefone</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Data Criação</strong></TableCell>
                            <TableCell><strong>Data Envio</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {comunicados.map((comunicado) => (
                            <TableRow key={comunicado.id} hover>
                                <TableCell>{comunicado.id}</TableCell>
                                <TableCell>{comunicado.nome}</TableCell>
                                <TableCell>{comunicado.telefone}</TableCell>
                                <TableCell>{getStatusChip(comunicado.status)}</TableCell>
                                <TableCell>{formatDate(comunicado.created_at)}</TableCell>
                                <TableCell>
                                    {comunicado.data_envio ? formatDate(comunicado.data_envio) : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {comunicados.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                        Nenhum comunicado encontrado
                    </Typography>
                </Box>
            )}

            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Registros por página:"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                }
            />
        </Paper>
    );
};

export default ListaComunicados;