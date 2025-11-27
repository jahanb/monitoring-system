'use client';

import { Box, Container, Typography, Card, CardContent, Alert, Grid } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

export default function SettingsPage() {
    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <SettingsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                    <Typography variant="h4" component="h1">
                        Settings
                    </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                    System configuration and preferences.
                </Alert>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    General Settings
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    System-wide configuration options
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Email Configuration
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    SMTP server and email settings
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    User Management
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Manage users and permissions
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Integration Settings
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Configure external integrations
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
}