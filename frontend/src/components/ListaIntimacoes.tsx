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
    Button,
    IconButton,
    Tooltip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import { Search, Refresh, Send, CheckCircle } from '@mui/icons-material';
import axios from 'axios';

const API_URL = '/api';

interface Intimacao {
    id: number;
    bo_registro: string;
    nome: string;
    telefone: string;
    data_intimacao: string;
    hora_intimacao: string;
    status: string;
    data_envio: string | null;
    created_at: string;
}

interface ListagemProps {
    refreshTrigger?: number;
}

const ListaIntimacoes: React.FC<ListagemProps> = ({ refreshTrigger = 0 }) => {
    const [intimacoes, setIntimacoes] = useState<Intimacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterText, setFilterText] = useState('');

    // Novo estado para controlar os diálogos de confirmação
    const [dialogConfirm, setDialogConfirm] = useState({
        open: false,
        action: '',
        intimacaoId: 0,
        nome: '',
        telefone: ''
    });

    // Novo estado para controlar o loading individual dos botões
    const [actionLoading, setActionLoading] = useState({
        id: 0,
        action: '',
        loading: false
    });

    const fetchIntimacoes = async () => {
        try {
            setLoading(true);

            const params: any = {
                pagina: page + 1,
                limite: rowsPerPage,
            };

            if (filterStatus) params.status = filterStatus;
            if (filterText) params.texto = filterText;

            const response = await axios.get(`${API_URL}/intimacoes`, { params });

            setIntimacoes(response.data.intimacoes);
            setTotal(response.data.total);
            setError('');
        } catch (err: any) {
            console.error('Erro ao buscar intimações:', err);
            setError(err.response?.data?.error || 'Erro ao buscar intimações');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIntimacoes();
    }, [page, rowsPerPage, refreshTrigger]);

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilter = () => {
        setPage(0);
        fetchIntimacoes();
    };

    const resetFilter = () => {
        setFilterStatus('');
        setFilterText('');
        setPage(0);
        setTimeout(fetchIntimacoes, 100);
    };

    // Função para abrir o diálogo de confirmação
    const openConfirmDialog = (action: string, intimacao: Intimacao) => {
        setDialogConfirm({
            open: true,
            action,
            intimacaoId: intimacao.id,
            nome: intimacao.nome,
            telefone: intimacao.telefone
        });
    };

    // Função para fechar o diálogo de confirmação
    const closeConfirmDialog = () => {
        setDialogConfirm({
            open: false,
            action: '',
            intimacaoId: 0,
            nome: '',
            telefone: ''
        });
    };

    // Função para finalizar a intimação
    const handleFinalizar = async (id: number) => {
        try {
            setActionLoading({ id, action: 'finalizar', loading: true });
            await axios.post(`${API_URL}/intimacoes/${id}/finalizar`);

            // Atualizar localmente o status da intimação
            setIntimacoes(prev =>
                prev.map(item =>
                    item.id === id ? { ...item, status: 'finalizado' } : item
                )
            );

            closeConfirmDialog();
        } catch (err: any) {
            console.error('Erro ao finalizar intimação:', err);
            setError(err.response?.data?.error || 'Erro ao finalizar intimação');
        } finally {
            setActionLoading({ id: 0, action: '', loading: false });
        }
    };

    // Função para reenviar a intimação
    const handleReenviar = async (id: number) => {
        try {
            setActionLoading({ id, action: 'reenviar', loading: true });
            await axios.post(`${API_URL}/intimacoes/${id}/reenviar`);

            // Atualizar a lista após o reenvio
            fetchIntimacoes();
            closeConfirmDialog();
        } catch (err: any) {
            console.error('Erro ao reenviar intimação:', err);
            setError(err.response?.data?.error || 'Erro ao reenviar intimação');
        } finally {
            setActionLoading({ id: 0, action: '', loading: false });
        }
    };

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'pendente':
                return <Chip label="Pendente" color="warning" size="small" />;
            case 'enviado':
                return <Chip label="Enviado" color="success" size="small" />;
            case 'erro':
                return <Chip label="Erro" color="error" size="small" />;
            case 'finalizado':
                return <Chip label="Finalizado" color="default" size="small" />;
            default:
                return <Chip label={status} color="default" size="small" />;
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Intimações Enviadas
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Buscar"
                        fullWidth
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Nome, BO ou telefone"
                        size="small"
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="status-filter-label">Status</InputLabel>
                        <Select
                            labelId="status-filter-label"
                            value={filterStatus}
                            label="Status"
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="pendente">Pendente</MenuItem>
                            <MenuItem value="enviado">Enviado</MenuItem>
                            <MenuItem value="erro">Erro</MenuItem>
                            <MenuItem value="finalizado">Finalizado</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            startIcon={<Search />}
                            onClick={handleFilter}
                            fullWidth
                        >
                            Filtrar
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={resetFilter}
                        >
                            Limpar
                        </Button>
                    </Box>
                </Grid>
            </Grid>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && !intimacoes.length ? (
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nº BO</TableCell>
                                    <TableCell>Nome</TableCell>
                                    <TableCell>Telefone</TableCell>
                                    <TableCell>Data limite para comparecimento</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Data do Envio</TableCell>
                                    <TableCell>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {intimacoes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            Nenhuma intimação encontrada
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    intimacoes.map((intimacao) => (
                                        <TableRow key={intimacao.id}>
                                            <TableCell>{intimacao.bo_registro || '-'}</TableCell>
                                            <TableCell>{intimacao.nome}</TableCell>
                                            <TableCell>{intimacao.telefone}</TableCell>
                                            <TableCell>
                                                {intimacao.data_intimacao} às {intimacao.hora_intimacao}h
                                            </TableCell>
                                            <TableCell>{getStatusChip(intimacao.status)}</TableCell>
                                            <TableCell>
                                                {intimacao.data_envio
                                                    ? new Date(intimacao.data_envio).toLocaleString('pt-BR')
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    {intimacao.status !== 'finalizado' && (
                                                        <Tooltip title="Reenviar intimação">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => openConfirmDialog('reenviar', intimacao)}
                                                                disabled={actionLoading.id === intimacao.id && actionLoading.action === 'reenviar' && actionLoading.loading}
                                                            >
                                                                {actionLoading.id === intimacao.id && actionLoading.action === 'reenviar' && actionLoading.loading ?
                                                                    <CircularProgress size={20} /> : <Send fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}

                                                    {intimacao.status !== 'finalizado' && (
                                                        <Tooltip title="Finalizar intimação">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => openConfirmDialog('finalizar', intimacao)}
                                                                disabled={actionLoading.id === intimacao.id && actionLoading.action === 'finalizar' && actionLoading.loading}
                                                            >
                                                                {actionLoading.id === intimacao.id && actionLoading.action === 'finalizar' && actionLoading.loading ?
                                                                    <CircularProgress size={20} /> : <CheckCircle fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage="Linhas por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                    />
                </>
            )}

            {/* Diálogo de Confirmação */}
            <Dialog
                open={dialogConfirm.open}
                onClose={closeConfirmDialog}
            >
                <DialogTitle>
                    {dialogConfirm.action === 'finalizar' ? 'Finalizar Intimação' : 'Reenviar Intimação'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {dialogConfirm.action === 'finalizar'
                            ? `Deseja finalizar a intimação para ${dialogConfirm.nome}?`
                            : `Deseja reenviar a intimação para ${dialogConfirm.nome} (${dialogConfirm.telefone})?`
                        }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeConfirmDialog} color="inherit">Cancelar</Button>
                    <Button
                        onClick={() =>
                            dialogConfirm.action === 'finalizar'
                                ? handleFinalizar(dialogConfirm.intimacaoId)
                                : handleReenviar(dialogConfirm.intimacaoId)
                        }
                        color={dialogConfirm.action === 'finalizar' ? 'success' : 'primary'}
                        variant="contained"
                    >
                        {dialogConfirm.action === 'finalizar' ? 'Finalizar' : 'Reenviar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default ListaIntimacoes;