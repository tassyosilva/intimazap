import { useState } from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Box,
    Toolbar,
    Typography,
    useTheme,
    alpha,
    styled,
    Collapse
} from '@mui/material';
import {
    Dashboard,
    PeopleAlt,
    Send,
    Settings,
    ExpandLess,
    ExpandMore,
    WhatsApp,
    Edit
} from '@mui/icons-material';

interface MenuLateralProps {
    onPageChange: (page: string) => void;
    currentPage: string;
    usuario: { nome: string; tipo: string };
}

const drawerWidth = 240;

// Drawer estilizado
const StyledDrawer = styled(Drawer)(({ theme }) => ({
    '& .MuiDrawer-paper': {
        backgroundColor: theme.palette.primary.main, // Isso usará a cor preta definida como primary.main
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

// Estilização para submenu
const SubMenuItem = styled(ListItemButton)(({ theme }) => ({
    paddingLeft: theme.spacing(4),
    margin: '2px 8px 2px 16px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.1),
    },
    '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.common.white, 0.15),
        '&:hover': {
            backgroundColor: alpha(theme.palette.common.white, 0.2),
        },
    }
}));

const MenuLateral: React.FC<MenuLateralProps> = ({
    onPageChange,
    currentPage,
    usuario
}) => {
    const theme = useTheme();
    const [configOpen, setConfigOpen] = useState(
        currentPage === 'whatsapp_config' || currentPage === 'usuarios'
    );

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, page: 'dashboard' },
        { text: 'Enviar Intimações', icon: <Send />, page: 'enviar' },
        { text: 'Editar Mensagem', icon: <Edit />, page: 'template' }
    ];

    // Renderiza o menu de configurações apenas para administradores
    const renderConfigMenu = () => {
        if (usuario.tipo !== 'admin') return null;

        return (
            <>
                <ListItem disablePadding>
                    <StyledListItemButton onClick={() => setConfigOpen(!configOpen)}>
                        <ListItemIcon
                            sx={{
                                minWidth: '40px',
                                color: (currentPage === 'whatsapp_config' || currentPage === 'usuarios')
                                    ? '#fff'
                                    : alpha('#fff', 0.8)
                            }}
                        >
                            <Settings />
                        </ListItemIcon>
                        <ListItemText
                            primary="Configurações"
                            primaryTypographyProps={{
                                fontWeight: (currentPage === 'whatsapp_config' || currentPage === 'usuarios')
                                    ? 'bold'
                                    : 'normal',
                            }}
                        />
                        {configOpen ? <ExpandLess /> : <ExpandMore />}
                    </StyledListItemButton>
                </ListItem>

                <Collapse in={configOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItem disablePadding>
                            <SubMenuItem
                                selected={currentPage === 'whatsapp_config'}
                                onClick={() => onPageChange('whatsapp_config')}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: '40px',
                                        color: currentPage === 'whatsapp_config' ? '#fff' : alpha('#fff', 0.8)
                                    }}
                                >
                                    <WhatsApp />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Conexão WhatsApp"
                                    primaryTypographyProps={{
                                        fontWeight: currentPage === 'whatsapp_config' ? 'bold' : 'normal',
                                    }}
                                />
                            </SubMenuItem>
                        </ListItem>

                        <ListItem disablePadding>
                            <SubMenuItem
                                selected={currentPage === 'usuarios'}
                                onClick={() => onPageChange('usuarios')}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: '40px',
                                        color: currentPage === 'usuarios' ? '#fff' : alpha('#fff', 0.8)
                                    }}
                                >
                                    <PeopleAlt />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Gerenciar Usuários"
                                    primaryTypographyProps={{
                                        fontWeight: currentPage === 'usuarios' ? 'bold' : 'normal',
                                    }}
                                />
                            </SubMenuItem>
                        </ListItem>
                    </List>
                </Collapse>
            </>
        );
    };

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

                    {renderConfigMenu()}
                </List>
            </Box>

            <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.1) }} />
        </StyledDrawer>
    );
};

export default MenuLateral;