import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Container,
    Paper,
    TextField,
    Alert,
    CircularProgress,
    Grid,
    InputLabel,
    Divider} from '@mui/material';
import { Upload, Send } from '@mui/icons-material';
import axios from 'axios';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

const API_URL = 'http://localhost:3000/api';

const UploadForm = () => {
    const [file, setFile] = useState<File | null>(null);
    const [dataIntimacao, setDataIntimacao] = useState<Date | null>(null);
    const [horaIntimacao, setHoraIntimacao] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [error, setError] = useState<string>('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            setError('Selecione um arquivo para enviar');
            return;
        }

        if (!dataIntimacao) {
            setError('Selecione uma data para a intimação');
            return;
        }

        if (!horaIntimacao) {
            setError('Informe a hora da intimação');
            return;
        }

        // Formatar a data para DD/MM/YYYY
        const dataFormatada = format(dataIntimacao, 'dd/MM/yyyy');

        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('dataIntimacao', dataFormatada);
        formData.append('horaIntimacao', horaIntimacao);

        try {
            const response = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setUploadResult(response.data);
        } catch (err: any) {
            console.error('Erro no upload:', err);
            setError(err.response?.data?.error || 'Erro ao processar o arquivo');
        } finally {
            setIsUploading(false);
        }
    };

    const handleProcessarFila = async () => {
        try {
            setIsUploading(true);
            const response = await axios.post(`${API_URL}/processar-fila`);
            setUploadResult((prev: any) => ({
                ...prev,
                filaProcessada: response.data
            }));
        } catch (err: any) {
            console.error('Erro ao processar fila:', err);
            setError(err.response?.data?.error || 'Erro ao processar a fila de envios');
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setDataIntimacao(null);
        setHoraIntimacao('');
        setUploadResult(null);
        setError('');
    };

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, my: 4 }}>
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Upload de Planilha para Envio de Intimações
                </Typography>

                <Divider sx={{ mb: 3 }} />

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {uploadResult ? (
                    <Box>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            <Typography variant="body1">
                                Arquivo processado com sucesso!
                            </Typography>
                        </Alert>

                        <Box sx={{ my: 2 }}>
                            <Typography variant="h6">Resultados do processamento:</Typography>
                            <Typography>Total de registros: {uploadResult.resultados.total}</Typography>
                            <Typography>Processados: {uploadResult.resultados.processados}</Typography>
                            <Typography>Erros: {uploadResult.resultados.erros}</Typography>
                        </Box>

                        <Grid container spacing={2} sx={{ mt: 2 }}>
                            <Grid item xs={6}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    startIcon={<Send />}
                                    onClick={handleProcessarFila}
                                    disabled={isUploading}
                                >
                                    Processar Fila de Envio
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={resetForm}
                                    disabled={isUploading}
                                >
                                    Novo Upload
                                </Button>
                            </Grid>
                        </Grid>

                        {uploadResult.filaProcessada && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body1">
                                    Fila processada: {uploadResult.filaProcessada.resultado.processados} mensagens enviadas.
                                </Typography>
                            </Alert>
                        )}

                    </Box>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1 }}>
                                    <input
                                        accept=".xlsx,.xls"
                                        style={{ display: 'none' }}
                                        id="file-upload"
                                        type="file"
                                        onChange={handleFileChange}
                                    />
                                    <InputLabel htmlFor="file-upload">
                                        <Button
                                            component="span"
                                            startIcon={<Upload />}
                                            variant="contained"
                                            fullWidth
                                        >
                                            Selecionar Planilha
                                        </Button>
                                    </InputLabel>

                                    {file && (
                                        <Box sx={{ mt: 2 }}>
                                            <Alert severity="info">
                                                Arquivo selecionado: {file.name}
                                            </Alert>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                                    <DatePicker
                                        label="Data da Intimação"
                                        value={dataIntimacao}
                                        onChange={(newValue) => setDataIntimacao(newValue)}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                required: true
                                            }
                                        }}
                                    />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Hora da Intimação"
                                    fullWidth
                                    required
                                    value={horaIntimacao}
                                    onChange={(e) => setHoraIntimacao(e.target.value)}
                                    placeholder="Ex: 14:30"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    disabled={isUploading || !file || !dataIntimacao || !horaIntimacao}
                                    startIcon={isUploading ? <CircularProgress size={24} color="inherit" /> : <Send />}
                                >
                                    {isUploading ? 'Processando...' : 'Enviar Planilha'}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                )}
            </Paper>
        </Container>
    );
};

export default UploadForm;