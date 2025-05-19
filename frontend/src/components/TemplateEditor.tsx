import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Box,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Divider,
    Chip
} from '@mui/material';
import { Save, Info } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const TemplateEditor: React.FC = () => {
    const [template, setTemplate] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchTemplate();
    }, []);

    const fetchTemplate = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/template-mensagem`);
            setTemplate(response.data.template);
            setError('');
        } catch (err: any) {
            console.error('Erro ao buscar template:', err);
            setError(err.response?.data?.error || 'Erro ao buscar template de mensagem');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await axios.post(`${API_URL}/template-mensagem`, { template });
            setSuccess('Template salvo com sucesso!');
            setError('');

            // Limpar mensagem de sucesso após 3 segundos
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Erro ao salvar template:', err);
            setError(err.response?.data?.error || 'Erro ao salvar template de mensagem');
            setSuccess('');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Editor de Template de Mensagem
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Info color="info" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                    Use {'{nome}'}, {'{data}'} e {'{hora}'} como marcadores para substituição automática.
                </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
                <Chip label="Nome: {nome}" sx={{ mr: 1, mb: 1 }} />
                <Chip label="Data: {data}" sx={{ mr: 1, mb: 1 }} />
                <Chip label="Hora: {hora}" sx={{ mb: 1 }} />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <TextField
                        label="Template de Mensagem"
                        multiline
                        fullWidth
                        rows={15}
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                    />

                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Save />}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Salvar Template'}
                    </Button>
                </>
            )}
        </Paper>
    );
};

export default TemplateEditor;