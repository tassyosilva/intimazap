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
  useTheme
} from '@mui/material';
import { ExitToApp, AccountCircle } from '@mui/icons-material';
import axios from 'axios';

// Componentes
import Login from './components/Login';
import MenuLateral from './components/MenuLateral';
import Dashboard from './components/Dashboard';
import UploadForm from './components/UploadForm';
import GerenciarUsuarios from './components/GerenciarUsuarios';
import WhatsAppConfig from './components/WhatsAppConfig';

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
  const [refreshTrigger] = useState(0);
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

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  // Se não estiver autenticado, mostrar tela de login
  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Verificar permissão para acessar certas páginas
  const checkAccess = (page: string) => {
    const adminPages = ['usuarios', 'whatsapp_config'];
    if (adminPages.includes(page) && usuario?.tipo !== 'admin') {
      return false;
    }
    return true;
  };

  // Renderizar o conteúdo principal baseado na página atual
  const renderContent = () => {
    // Verificar acesso
    if (!checkAccess(currentPage)) {
      return (
        <Box py={4} textAlign="center">
          <Typography variant="h5" color="error" gutterBottom>
            Acesso Negado
          </Typography>
          <Typography variant="body1">
            Você não tem permissão para acessar esta página.
          </Typography>
        </Box>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard refreshTrigger={refreshTrigger} />;
      case 'enviar':
        return <UploadForm />;
      case 'usuarios':
        return <GerenciarUsuarios />;
      case 'whatsapp_config':
        return <WhatsAppConfig />;
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

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <AccountCircle sx={{ mr: 1 }} />
              <Typography variant="body2" color="inherit">
                {usuario?.nome || 'Usuário'}
              </Typography>
            </Box>

            <ActionButton
              color="inherit"
              variant="contained"
              startIcon={<ExitToApp />}
              onClick={handleLogout}
              sx={{
                bgcolor: alpha(theme.palette.common.white, 0.2),
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.3),
                }
              }}
            >
              Sair
            </ActionButton>
          </Box>
        </Toolbar>
      </StyledAppBar>

      {/* Menu Lateral */}
      <MenuLateral
        onPageChange={handlePageChange}
        currentPage={currentPage}
        usuario={usuario}
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