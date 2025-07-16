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
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';
import { Upload, Send, CheckCircle, Error, Refresh } from '@mui/icons-material';
import axios from 'axios';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import ProgressoEnvio from './ProgressoEnvio';


const API_URL = '/api';

interface ResultadoDetalhado {
    id: number;
    nome: string;
    telefone: string;
    status: string;
    mensagem: string;
    hora: string;
}

const UploadForm = () => {
    const [file, setFile] = useState<File | null>(null);
    const [dataIntimacao, setDataIntimacao] = useState<Date | null>(null);
    const [horaIntimacao, setHoraIntimacao] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isReenvioProcessing, setIsReenvioProcessing] = useState<boolean>(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [resultadosDetalhados, setResultadosDetalhados] = useState<ResultadoDetalhado[]>([]);
    const [showProgress, setShowProgress] = useState<boolean>(false);
    const [openReenvioDialog, setOpenReenvioDialog] = useState<boolean>(false);
    const [reenvioResult, setReenvioResult] = useState<any>(null);

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

    const handleProcessComplete = () => {
        setShowProgress(false);
        // Atualizar os resultados
        setIsProcessing(false);
        setIsReenvioProcessing(false);
    };

    const handleProcessarFila = async () => {
        try {
            setIsProcessing(true);
            setShowProgress(true);
            setError('');

            const response = await axios.post(`${API_URL}/processar-fila`);

            // Atualizar resultados detalhados
            if (response.data?.resultado?.resultadosDetalhados) {
                setResultadosDetalhados(response.data.resultado.resultadosDetalhados);
            }

            setUploadResult((prev: any) => ({
                ...prev,
                filaProcessada: response.data
            }));
        } catch (err: any) {
            console.error('Erro ao processar fila:', err);
            setError(err.response?.data?.error || 'Erro ao processar a fila de envios');
            setShowProgress(false);
            setIsProcessing(false);
        }
    };

    // Nova função para reenviar todas as intimações não finalizadas
    const handleReenviarNaoFinalizadas = async () => {
        try {
            setIsReenvioProcessing(true);
            setShowProgress(true);
            setOpenReenvioDialog(false);
            setError('');

            const response = await axios.post(`${API_URL}/reenviar-nao-finalizadas`);

            // Atualizar resultados detalhados
            if (response.data?.resultado?.resultadosDetalhados) {
                setResultadosDetalhados(response.data.resultado.resultadosDetalhados);
            }

            // Guardar o resultado do reenvio separadamente
            setReenvioResult(response.data);
        } catch (err: any) {
            console.error('Erro ao reenviar intimações não finalizadas:', err);
            setError(err.response?.data?.error || 'Erro ao reenviar intimações não finalizadas');
            setShowProgress(false);
            setIsReenvioProcessing(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setDataIntimacao(null);
        setHoraIntimacao('');
        setUploadResult(null);
        setReenvioResult(null);
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
                            label="Data limite para comparecimento"
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
                        label="Horário Limite para comparecimento"
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
    );

    const renderUploadResult = () => (
        <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body1">
                    Arquivo processado com sucesso!
                </Typography>
            </Alert>

            <Box sx={{ my: 2 }}>
                <Typography variant="h6">Resultados do processamento:</Typography>
                {uploadResult && uploadResult.resultados && (
                    <>
                        <Typography>Total de registros: {uploadResult.resultados.total}</Typography>
                        <Typography>Processados: {uploadResult.resultados.processados}</Typography>
                        <Typography>Erros: {uploadResult.resultados.erros}</Typography>
                    </>
                )}
            </Box>

            <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Send />}
                        onClick={handleProcessarFila}
                        disabled={isProcessing || isReenvioProcessing}
                    >
                        {isProcessing ? 'Processando...' : 'Processar Fila de Envio'}
                    </Button>
                </Grid>
                <Grid item xs={6}>
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={resetForm}
                        disabled={isProcessing || isReenvioProcessing}
                    >
                        Novo Upload
                    </Button>
                </Grid>
            </Grid>

            {/* Resultado do processamento/reenvio */}
            {!showProgress && (uploadResult?.filaProcessada || reenvioResult) && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body1">
                        {uploadResult?.filaProcessada
                            ? `Fila processada: ${uploadResult.filaProcessada.resultado.processados} mensagens enviadas.`
                            : reenvioResult
                                ? `Reenvio concluído: ${reenvioResult.resultado.processados} de ${reenvioResult.resultado.total} mensagens reenviadas.`
                                : ''}
                    </Typography>
                </Alert>
            )}
        </Box>
    );

    const renderResultadosDetalhados = () => (
        resultadosDetalhados.length > 0 && (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Detalhes do Processamento
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
                    Upload de Planilha SITTEL para Envio de Intimações
                </Typography>

                <Divider sx={{ mb: 3 }} />

                {/* Botão para reenviar intimações não finalizadas */}
                <Box sx={{ mb: 4 }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<Refresh />}
                        fullWidth
                        onClick={() => setOpenReenvioDialog(true)}
                        disabled={isReenvioProcessing || isProcessing}
                    >
                        {isReenvioProcessing ? 'Reenviando...' : 'Reenviar intimações não finalizadas'}
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {uploadResult ? renderUploadResult() : renderUploadForm()}

                {/* Componente de Progresso */}
                <ProgressoEnvio
                    visible={showProgress}
                    onComplete={handleProcessComplete}
                />

                {renderResultadosDetalhados()}
            </Paper>

            {/* Diálogo de confirmação para reenvio em massa */}
            <Dialog
                open={openReenvioDialog}
                onClose={() => setOpenReenvioDialog(false)}
            >
                <DialogTitle>Reenviar Intimações Não Finalizadas</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem certeza que deseja reenviar todas as intimações que não estão marcadas como finalizadas?
                        Este processo pode demorar dependendo da quantidade de intimações.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenReenvioDialog(false)} color="inherit">
                        Cancelar
                    </Button>
                    <Button onClick={handleReenviarNaoFinalizadas} color="secondary" variant="contained">
                        Reenviar Todas
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default UploadForm;