import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    Grid,
    Button,
    Box,
    InputLabel,
    Alert,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TextField,
    Divider
} from '@mui/material';
import {
    CloudUpload,
    Send,
    CheckCircle,
    Error
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = '/api';

interface UploadResult {
    resultados: {
        total: number;
        processados: number;
        erros: number;
        detalhes: any[];
    };
    filaProcessada?: {
        resultado: {
            total: number;
            processados: number;
        };
    };
}

interface ResultadoDetalhado {
    id: number;
    nome: string;
    telefone: string;
    status: string;
    mensagem: string;
    hora: string;
}

const EnviarComunicados: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [error, setError] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [showProgress, setShowProgress] = useState<boolean>(false);
    const [resultadosDetalhados, setResultadosDetalhados] = useState<ResultadoDetalhado[]>([]);
    const [templateMensagem, setTemplateMensagem] = useState<string>('');

    // Carregar template de mensagem ao montar o componente
    useEffect(() => {
        carregarTemplate();
    }, []);

    const carregarTemplate = async () => {
        try {
            const response = await axios.get(`${API_URL}/template-comunicado`);
            setTemplateMensagem(response.data.template);
        } catch (error) {
            console.error('Erro ao carregar template:', error);
        }
    };

    const salvarTemplate = async () => {
        try {
            await axios.post(`${API_URL}/template-comunicado`, {
                template: templateMensagem
            });
            alert('Template salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar template:', error);
            alert('Erro ao salvar template');
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!file) {
            setError('Por favor, selecione um arquivo');
            return;
        }

        try {
            setIsProcessing(true);
            setError('');
            setUploadResult(null);
            setResultadosDetalhados([]);

            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(`${API_URL}/upload-comunicados`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setUploadResult(response.data);
            setShowProgress(true);

            // Processar a fila automaticamente após o upload
            await processarFila();

        } catch (err: any) {
            console.error('Erro no upload:', err);
            setError(err.response?.data?.error || 'Erro ao processar arquivo');
            setIsProcessing(false);
        }
    };

    const processarFila = async () => {
        try {
            const response = await axios.post(`${API_URL}/processar-fila-comunicados`);

            if (response.data?.resultado?.resultadosDetalhados) {
                setResultadosDetalhados(response.data.resultado.resultadosDetalhados);
            }

            setUploadResult(prev => ({
                ...prev!,
                filaProcessada: response.data
            }));

            setShowProgress(false);
            setIsProcessing(false);
        } catch (err: any) {
            console.error('Erro ao processar fila:', err);
            setError(err.response?.data?.error || 'Erro ao processar fila de comunicados');
            setShowProgress(false);
            setIsProcessing(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setUploadResult(null);
        setError('');
        setResultadosDetalhados([]);
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

    const renderUploadForm = () => (
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
                                variant="outlined"
                                component="span"
                                startIcon={<CloudUpload />}
                                fullWidth
                                sx={{ py: 2 }}
                            >
                                {file ? file.name : 'Selecionar Planilha (.xlsx)'}
                            </Button>
                        </InputLabel>
                        <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                            A planilha deve conter as colunas: "nome" e "telefone"
                        </Typography>
                    </Box>
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        label="Mensagem do Comunicado"
                        multiline
                        rows={8}
                        fullWidth
                        value={templateMensagem}
                        onChange={(e) => setTemplateMensagem(e.target.value)}
                        helperText="Use {nome} para personalizar a mensagem com o nome da pessoa"
                        variant="outlined"
                    />
                    <Box sx={{ mt: 1 }}>
                        <Button
                            variant="outlined"
                            onClick={salvarTemplate}
                            size="small"
                        >
                            Salvar Template
                        </Button>
                    </Box>
                </Grid>

                <Grid item xs={12}>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={<Send />}
                        fullWidth
                        disabled={!file || isProcessing}
                        sx={{ py: 2 }}
                    >
                        {isProcessing ? 'Processando...' : 'Enviar Comunicados'}
                    </Button>
                </Grid>
            </Grid>
        </form>
    );

    const renderProgress = () => (
        showProgress && (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Enviando Comunicados...
                </Typography>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>
                    Por favor, aguarde enquanto os comunicados são enviados.
                </Typography>
            </Box>
        )
    );

    const renderResultados = () => (
        uploadResult && (
            <Alert severity="success" sx={{ mt: 3 }}>
                <Typography variant="body1">
                    <strong>Upload concluído:</strong> {uploadResult.resultados.processados} de {uploadResult.resultados.total} registros processados.
                </Typography>
                <Typography variant="body1">
                    {uploadResult.filaProcessada
                        ? `Envio concluído: ${uploadResult.filaProcessada.resultado.processados} mensagens enviadas.`
                        : ''}
                </Typography>
            </Alert>
        )
    );

    const renderResultadosDetalhados = () => (
        resultadosDetalhados.length > 0 && (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Detalhes do Envio
                </Typography>
                <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Nome</TableCell>
                                <TableCell>Telefone</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Mensagem</TableCell>
                                <TableCell>Hora</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resultadosDetalhados.map((item) => (
                                <TableRow key={item.id}>
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
            </Box>
        )
    );

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, my: 4 }}>
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Enviar Comunicado em Massa
                </Typography>

                <Divider sx={{ mb: 3 }} />

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {!uploadResult ? renderUploadForm() : (
                    <Box sx={{ textAlign: 'center' }}>
                        <Button
                            variant="outlined"
                            onClick={resetForm}
                            sx={{ mb: 2 }}
                        >
                            Enviar Novos Comunicados
                        </Button>
                    </Box>
                )}

                {renderProgress()}
                {renderResultados()}
                {renderResultadosDetalhados()}
            </Paper>
        </Container>
    );
};

export default EnviarComunicados;