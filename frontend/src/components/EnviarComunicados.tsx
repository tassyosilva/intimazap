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

    // Estados para o progresso em tempo real
    const [progressoEnvio, setProgressoEnvio] = useState({
        ativo: false,
        total: 0,
        processados: 0,
        porcentagem: 0
    });

    // Carregar template de mensagem ao montar o componente
    useEffect(() => {
        carregarTemplate();
    }, []);

    // useEffect para monitorar o progresso
    useEffect(() => {
        let interval: number;

        if (showProgress) {
            // Iniciar polling do progresso
            interval = setInterval(async () => {
                try {
                    const response = await axios.get(`${API_URL}/progresso-envio`);
                    setProgressoEnvio(response.data);

                    // Se o processo terminou, parar o polling
                    if (!response.data.ativo && response.data.processados > 0) {
                        setShowProgress(false);
                        // Recarregar os dados para mostrar o resultado final
                        setTimeout(() => {
                            // Forçar atualização da página para mostrar resultados
                            window.location.reload();
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Erro ao buscar progresso:', error);
                }
            }, 1000); // Verificar a cada 1 segundo
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [showProgress]);

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

            // Mostrar progresso e processar automaticamente
            setShowProgress(true);
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

            // Não desligar o showProgress aqui - deixar o useEffect controlar
            // setShowProgress(false);
            // setIsProcessing(false);
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
        setShowProgress(false);
        setIsProcessing(false);
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
                    <InputLabel htmlFor="file-upload">
                        Selecione a planilha de comunicados (.xlsx)
                    </InputLabel>
                    <Box sx={{ mt: 1 }}>
                        <input
                            id="file-upload"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="file-upload">
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<CloudUpload />}
                                fullWidth
                                sx={{ py: 2 }}
                            >
                                {file ? file.name : 'Escolher arquivo'}
                            </Button>
                        </label>
                    </Box>
                </Grid>
                <Grid item xs={12}>
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        startIcon={<Send />}
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
                {progressoEnvio.ativo && progressoEnvio.total > 0 && (
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                        Progresso de envio: {progressoEnvio.processados} de {progressoEnvio.total} envios realizados.
                    </Typography>
                )}
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
                        : 'Aguardando processamento da fila...'}
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

    const renderTemplateSection = () => (
        <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
                Template da Mensagem de Comunicado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use {'{nome}'} para inserir o nome do destinatário automaticamente.
            </Typography>
            <TextField
                fullWidth
                multiline
                rows={8}
                value={templateMensagem}
                onChange={(e) => setTemplateMensagem(e.target.value)}
                placeholder="Digite o template da mensagem de comunicado..."
                sx={{ mb: 2 }}
            />
            <Button
                variant="outlined"
                onClick={salvarTemplate}
                disabled={!templateMensagem.trim()}
            >
                Salvar Template
            </Button>
        </Box>
    );

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, my: 4 }}>
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Envio de Comunicados via WhatsApp
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
                {renderTemplateSection()}
            </Paper>
        </Container>
    );
};

export default EnviarComunicados;