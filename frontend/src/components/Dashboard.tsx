import React from 'react';
import { Box, Grid } from '@mui/material';
import Estatisticas from './Estatisticas';
import ListaIntimacoes from './ListaIntimacoes';
import EstatisticasComunicados from './EstatisticasComunicados';
import ListaComunicados from './ListaComunicados';

interface DashboardProps {
    refreshTrigger: number;
}

const Dashboard: React.FC<DashboardProps> = ({ refreshTrigger }) => {
    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Estatisticas refreshTrigger={refreshTrigger} />
                </Grid>

                <Grid item xs={12} md={6}>
                    <EstatisticasComunicados refreshTrigger={refreshTrigger} />
                </Grid>

                <Grid item xs={12} md={6}>
                    <ListaIntimacoes refreshTrigger={refreshTrigger} />
                </Grid>

                <Grid item xs={12} md={6}>
                    <ListaComunicados refreshTrigger={refreshTrigger} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;