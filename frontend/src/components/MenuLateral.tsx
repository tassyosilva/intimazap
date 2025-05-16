import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton, // Adicione isto
    ListItemIcon,
    ListItemText,
    Divider,
    Box,
    Toolbar,
    Typography,
    useTheme,
    alpha,
    styled,
    Button
} from '@mui/material';
import {
    Dashboard,
    PeopleAlt,
    Send,
    ExitToApp,
    AccountCircle} from '@mui/icons-material';

interface MenuLateralProps {
    onPageChange: (page: string) => void;
    currentPage: string;
    usuario: { nome: string; tipo: string };
    onLogout: () => void;
}

const drawerWidth = 240;

// Drawer estilizado
const StyledDrawer = styled(Drawer)(({ theme }) => ({
    '& .MuiDrawer-paper': {
        backgroundColor: theme.palette.primary.main,
        color: '#fff',
        width: drawerWidth,
        boxSizing: 'border-box',
        borderRight: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        boxShadow: `4px 0 10px ${alpha('#000', 0.2)}`,
    },
}));

// Estilização para o ListItemButton ativo
const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
    margin: '4px 8px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.1),
        transform: 'translateX(4px)',
    },
    '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.common.white, 0.15),
        '&:hover': {
            backgroundColor: alpha(theme.palette.common.white, 0.2),
        },
        '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '60%',
            backgroundColor: theme.palette.common.white,
            borderRadius: '0 2px 2px 0',
        }
    }
}));

const MenuLateral: React.FC<MenuLateralProps> = ({
    onPageChange,
    currentPage,
    usuario,
    onLogout
}) => {
    const theme = useTheme();

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, page: 'dashboard' },
        { text: 'Enviar Intimações', icon: <Send />, page: 'enviar' }
    ];

    // Adicionar opção de usuários apenas para administradores
    if (usuario.tipo === 'admin') {
        menuItems.push({ text: 'Gerenciar Usuários', icon: <PeopleAlt />, page: 'usuarios' });
    }

    return (
        <StyledDrawer
            variant="permanent"
            open
        >
            <Toolbar
                sx={{
                    minHeight: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: alpha('#000', 0.2)
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }}
                >
                    IntimaZap
                </Typography>
            </Toolbar>

            <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.1) }} />

            <Box sx={{ py: 2, flexGrow: 1, overflow: 'auto' }}>
                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <StyledListItemButton
                                selected={currentPage === item.page}
                                onClick={() => onPageChange(item.page)}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: '40px',
                                        color: currentPage === item.page ? '#fff' : alpha('#fff', 0.8)
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: currentPage === item.page ? 'bold' : 'normal',
                                    }}
                                />
                            </StyledListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.1) }} />

            <Box
                sx={{
                    p: 2,
                    backgroundColor: alpha('#000', 0.2)
                }}
            >
                <Typography
                    variant="body2"
                    align="center"
                    sx={{ opacity: 0.7, mb: 1 }}
                >
                    Logado como
                </Typography>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2
                    }}
                >
                    <AccountCircle sx={{ mr: 1 }} />
                    <Typography variant="body1" fontWeight="bold">
                        {usuario.nome}
                    </Typography>
                </Box>
                <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<ExitToApp />}
                    onClick={onLogout}
                    sx={{
                        mt: 1,
                        backgroundColor: alpha('#f44336', 0.8),
                        '&:hover': {
                            backgroundColor: '#f44336',
                        }
                    }}
                >
                    Sair
                </Button>
            </Box>
        </StyledDrawer>
    );
};

export default MenuLateral;