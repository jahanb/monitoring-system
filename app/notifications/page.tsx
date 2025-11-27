'use client';

import { Box, Container, Typography, Card, CardContent, Alert } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';

export default function NotificationsPage() {
    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <NotificationsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                    <Typography variant="h4" component="h1">
                        Notifications
                    </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                    Configure notification channels and preferences for alerts.
                </Alert>

                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Coming Soon
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Notification management will allow you to:
                        </Typography>
                        <Box component="ul" sx={{ mt: 2 }}>
                            <Typography component="li" variant="body2">
                                Configure email, SMS, and Slack notifications
                            </Typography>
                            <Typography component="li" variant="body2">
                                Set notification schedules and quiet hours
                            </Typography>
                            <Typography component="li" variant="body2">
                                Define escalation policies
                            </Typography>
                            <Typography component="li" variant="body2">
                                View notification history and delivery status
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
}
