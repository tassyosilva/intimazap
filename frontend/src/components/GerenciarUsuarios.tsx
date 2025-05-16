import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    IconButton,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Box,
    SelectChangeEvent
} from '@mui/material';
import { Delete, PersonAdd } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface Usuario {
    id: number;
    nome: string;
    email: string;
    tipo: string;
    created_at: string;
}

const GerenciarUsuarios: React.FC = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [novoUsuario, setNovoUsuario] = useState({
        nome: '',
        email: '',
        senha: '',
        tipo: 'padrao'
    });
    const [statusMensagem, setStatusMensagem] = useState('');
    const [statusTipo, setStatusTipo] = useState<'success' | 'error'>('success');

    // Obter lista de usuários
    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/usuarios`);
            setUsuarios(response.data);
            setError('');
        } catch (err: any) {
            console.error('Erro ao buscar usuários:', err);
            setError(err.response?.data?.error || 'Erro ao buscar usuários');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    // Abrir diálogo de novo usuário
    const handleOpenDialog = () => {
        setNovoUsuario({
            nome: '',
            email: '',
            senha: '',
            tipo: 'padrao'
        });
        setOpenDialog(true);
    };

    // Fechar diálogo
    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    // Atualizar campo do novo usuário para inputs normais
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNovoUsuario(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Atualizar campo do novo usuário para selects
    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setNovoUsuario(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Criar novo usuário
    const handleSubmit = async () => {
        try {
            // Validação simples
            if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha) {
                setError('Todos os campos são obrigatórios');
                return;
            }

            await axios.post(`${API_URL}/usuarios`, novoUsuario);
            handleCloseDialog();
            fetchUsuarios();
            setStatusMensagem('Usuário criado com sucesso!');
            setStatusTipo('success');

            // Limpar mensagem após 3 segundos
            setTimeout(() => setStatusMensagem(''), 3000);
        } catch (err: any) {
            console.error('Erro ao criar usuário:', err);
            setError(err.response?.data?.error || 'Erro ao criar usuário');
        }
    };

    // Excluir usuário
    const handleDeleteUsuario = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) {
            return;
        }

        try {
            await axios.delete(`${API_URL}/usuarios/${id}`);
            fetchUsuarios();
            setStatusMensagem('Usuário excluído com sucesso!');
            setStatusTipo('success');

            // Limpar mensagem após 3 segundos
            setTimeout(() => setStatusMensagem(''), 3000);
        } catch (err: any) {
            console.error('Erro ao excluir usuário:', err);
            setStatusMensagem(err.response?.data?.error || 'Erro ao excluir usuário');
            setStatusTipo('error');

            // Limpar mensagem após 5 segundos
            setTimeout(() => setStatusMensagem(''), 5000);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Gerenciar Usuários</Typography>
                <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={handleOpenDialog}
                >
                    Novo Usuário
                </Button>
            </Box>

            {statusMensagem && (
                <Alert severity={statusTipo} sx={{ mb: 2 }}>
                    {statusMensagem}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Nome</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {usuarios.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        Nenhum usuário encontrado
                                    </TableCell>
                                </TableRow>
                            ) : (
                                usuarios.map((usuario) => (
                                    <TableRow key={usuario.id}>
                                        <TableCell>{usuario.id}</TableCell>
                                        <TableCell>{usuario.nome}</TableCell>
                                        <TableCell>{usuario.email}</TableCell>
                                        <TableCell>{usuario.tipo === 'admin' ? 'Administrador' : 'Padrão'}</TableCell>
                                        <TableCell>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDeleteUsuario(usuario.id)}
                                                // Desabilitar botão para o usuário admin
                                                disabled={usuario.email === 'admin'}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Diálogo para adicionar novo usuário */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Novo Usuário</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="nome"
                        label="Nome"
                        fullWidth
                        value={novoUsuario.nome}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        name="email"
                        label="Email"
                        fullWidth
                        value={novoUsuario.email}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        name="senha"
                        label="Senha"
                        type="password"
                        fullWidth
                        value={novoUsuario.senha}
                        onChange={handleInputChange}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Tipo</InputLabel>
                        <Select
                            name="tipo"
                            value={novoUsuario.tipo}
                            label="Tipo"
                            onChange={handleSelectChange}
                        >
                            <MenuItem value="padrao">Padrão</MenuItem>
                            <MenuItem value="admin">Administrador</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="inherit">Cancelar</Button>
                    <Button onClick={handleSubmit} color="primary">Salvar</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default GerenciarUsuarios;