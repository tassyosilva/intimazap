import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import axios from 'axios'

// Configuração para usar URLs relativas (isso funciona com o Nginx configurado corretamente)
axios.defaults.baseURL = '';

// Configurar o Axios para adicionar o token em todas as requisições
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = token;
}

// Tema modificado com cores pretas ao invés de azul
const theme = createTheme({
  palette: {
    primary: {
      main: '#212121', // Cor preta para a barra superior e menu lateral
      light: '#484848',
      dark: '#000000',
      contrastText: '#fff'
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)