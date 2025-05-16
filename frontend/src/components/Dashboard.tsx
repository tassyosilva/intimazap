import React from 'react';
import { Box, Grid } from '@mui/material';
import StatusWhatsApp from './StatusWhatsApp';
import Estatisticas from './Estatisticas';
import ListaIntimacoes from './ListaIntimacoes';

interface DashboardProps {
    refreshTrigger: number;
}

const Dashboard: React.FC<DashboardProps> = ({ refreshTrigger }) => {
    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <StatusWhatsApp />
                </Grid>

                <Grid item xs={12} md={4}>
                    <Estatisticas refreshTrigger={refreshTrigger} />
                </Grid>

                <Grid item xs={12} md={8}>
                    <ListaIntimacoes refreshTrigger={refreshTrigger} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;