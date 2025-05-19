import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress
} from '@mui/material';
import axios from 'axios';
import logo from '../assets/logo.png'; // Importando o logo

const API_URL = 'http://localhost:3000/api';

interface LoginProps {
    onLogin: (token: string, usuario: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !senha) {
            setError('Email e senha são obrigatórios');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await axios.post(`${API_URL}/login`, { email, senha });

            // Salvar token e informações do usuário
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('usuario', JSON.stringify(response.data.usuario));

            // Configurar o Axios para incluir o token em todas as requisições
            axios.defaults.headers.common['Authorization'] = response.data.token;

            // Notificar o componente pai
            onLogin(response.data.token, response.data.usuario);

        } catch (err: any) {
            console.error('Erro no login:', err);
            setError(err.response?.data?.error || 'Falha no login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                bgcolor: '#f5f5f5'
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: 2
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        mb: 3
                    }}
                >
                    {/* Logo da aplicação */}
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                        <img src={logo} alt="IntimaZap Logo" style={{ height: '80px' }} />
                    </Box>

                    <Typography variant="h5" component="h1" gutterBottom>
                        IntimaZap - Login
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Email"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />

                    <TextField
                        label="Senha"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        disabled={loading}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        sx={{ mt: 3 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Entrar'}
                    </Button>
                </form>
            </Paper>
        </Box>
    );
};

export default Login;