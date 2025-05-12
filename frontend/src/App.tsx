import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Divider,
  Button,
  AppBar,
  Toolbar,
  Grid
} from '@mui/material';
import { Send, Refresh } from '@mui/icons-material';
import axios from 'axios';
import StatusWhatsApp from './components/StatusWhatsApp';
import UploadForm from './components/UploadForm';
import Estatisticas from './components/Estatisticas';
import ListaIntimacoes from './components/ListaIntimacoes';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessarFila = async () => {
    try {
      setIsProcessing(true);
      await axios.post(`${API_URL}/processar-fila`);
      // Atualizar componentes após processar a fila
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao processar fila:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            IntimaZap
          </Typography>
          <Button
            color="inherit"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Atualizar
          </Button>
          <Button
            color="inherit"
            startIcon={<Send />}
            onClick={handleProcessarFila}
            disabled={isProcessing}
            sx={{ ml: 1 }}
          >
            {isProcessing ? 'Processando...' : 'Processar Fila'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <StatusWhatsApp />
          </Grid>

          <Grid item xs={12} md={4}>
            <Estatisticas refreshTrigger={refreshTrigger} />
          </Grid>

          <Grid item xs={12} md={8}>
            <UploadForm />
          </Grid>

          <Grid item xs={12}>
            <ListaIntimacoes refreshTrigger={refreshTrigger} />
          </Grid>
        </Grid>

        <Box mt={3} pb={3}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} - IntimaZap - Sistema de envio de intimações via WhatsApp
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default App;