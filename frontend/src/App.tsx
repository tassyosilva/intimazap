import { useState, useEffect } from 'react';
import {
  Box,
  Toolbar,
  Button,
  CssBaseline,
  AppBar,
  Typography,
  Container,
  alpha,
  styled,
  useTheme  // Adicione esta linha
} from '@mui/material';
import { Send, Refresh } from '@mui/icons-material';
import axios from 'axios';

// Componentes
import Login from './components/Login';
import MenuLateral from './components/MenuLateral';
import Dashboard from './components/Dashboard';
import UploadForm from './components/UploadForm';
import GerenciarUsuarios from './components/GerenciarUsuarios';

const API_URL = 'http://localhost:3000/api';

// AppBar estilizado
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  boxShadow: `0 2px 10px ${alpha('#000', 0.2)}`,
  zIndex: theme.zIndex.drawer + 1,
}));

// Botão estilizado
const ActionButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 8px ${alpha('#000', 0.2)}`,
  },
}));

const drawerWidth = 240;

function App() {
  const theme = useTheme();
  const [authenticated, setAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Verificar se existe um token salvo
    const token = localStorage.getItem('token');
    const usuarioSalvo = localStorage.getItem('usuario');

    if (token && usuarioSalvo) {
      try {
        const usuarioObj = JSON.parse(usuarioSalvo);
        setUsuario(usuarioObj);
        axios.defaults.headers.common['Authorization'] = token;
        setAuthenticated(true);
      } catch (error) {
        // Se houver erro ao parsear, fazer logout
        handleLogout();
      }
    }
  }, []);

  const handleLogin = (_token: string, usuarioData: any) => {
    setUsuario(usuarioData);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    delete axios.defaults.headers.common['Authorization'];
    setUsuario(null);
    setAuthenticated(false);
  };

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

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  // Se não estiver autenticado, mostrar tela de login
  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Renderizar o conteúdo principal baseado na página atual
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard refreshTrigger={refreshTrigger} />;
      case 'enviar':
        return <UploadForm />;
      case 'usuarios':
        return <GerenciarUsuarios />;
      default:
        return <Dashboard refreshTrigger={refreshTrigger} />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* AppBar */}
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            IntimaZap
          </Typography>

          <ActionButton
            color="inherit"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Atualizar
          </ActionButton>

          <ActionButton
            color="inherit"
            variant="contained"
            startIcon={<Send />}
            onClick={handleProcessarFila}
            disabled={isProcessing}
            sx={{
              bgcolor: alpha(theme.palette.common.white, 0.2),
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.3),
              }
            }}
          >
            {isProcessing ? 'Processando...' : 'Processar Fila'}
          </ActionButton>
        </Toolbar>
      </StyledAppBar>

      {/* Menu Lateral */}
      <MenuLateral
        onPageChange={handlePageChange}
        currentPage={currentPage}
        usuario={usuario}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          mt: '64px'
        }}
      >
        {/* Conteúdo da página atual */}
        <Container maxWidth="xl">
          {renderContent()}
        </Container>

        {/* Rodapé */}
        <Box mt={5} pt={3} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} - IntimaZap - Sistema de envio de intimações via WhatsApp
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default App;