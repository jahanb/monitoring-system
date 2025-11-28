// app/alerts/page.tsx - Fixed with MainLayout

'use client';
import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    InputAdornment,
    Stack,
    Alert as MuiAlert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Divider,
    List,
    ListItem,
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItem >
                                                ))
                                            )}

{/* Recovered Event */ }
{
    selectedAlert.recovered_at && (
        <ListItem sx={{ alignItems: 'flex-start', bgcolor: '#e8f5e9', mb: 1, borderRadius: 1 }}>
            <ListItemIcon sx={{ mt: 1 }}>
                <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
                primary={
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                        Alert Recovered ✓
                    </Typography>
                }
                secondary={
                    <Box>
                        <Typography variant="caption" display="block" color="text.secondary">
                            {new Date(selectedAlert.recovered_at).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            Total duration: {formatDuration(selectedAlert.triggered_at, selectedAlert.recovered_at)}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'success.main' }}>
                            Monitor returned to normal operation
                        </Typography>
                    </Box>
                }
            />
        </ListItem>
    )
}
                                        </List >
                                    </Grid >

    {/* Metadata Section */ }
{
    selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
        <>
            <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    ADDITIONAL DETAILS
                </Typography>
                <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12}>
                <Card variant="outlined">
                    <CardContent>
                        <pre style={{
                            fontSize: '11px',
                            overflow: 'auto',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>
                            {JSON.stringify(selectedAlert.metadata, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </Grid>
        </>
    )
}

{/* Recovery Summary - if recovered */ }
{
    selectedAlert.status === 'recovered' && (
        <>
            <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    RECOVERY SUMMARY
                </Typography>
                <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12}>
                <Card sx={{ bgcolor: '#e8f5e9', border: '2px solid #4caf50' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                            <Box>
                                <Typography variant="h6" color="success.main">
                                    Successfully Recovered
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Alert resolved and monitor operational
                                </Typography>
                            </Box>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Downtime</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {formatDuration(selectedAlert.triggered_at, selectedAlert.recovered_at)}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Recovery Attempts</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {selectedAlert.recovery_attempts?.length || 0}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Notifications</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {selectedAlert.notifications_sent?.length || 0}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Max Failures</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {selectedAlert.consecutive_failures}
                                </Typography>
                            </Grid>
                        </Grid>

                        {selectedAlert.recovery_attempts && selectedAlert.recovery_attempts.length > 0 && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #4caf50' }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                    Recovery Method:
                                </Typography>
                                <Typography variant="body2">
                                    {selectedAlert.recovery_attempts
                                        .filter(a => a.status === 'success')
                                        .map(a => a.action)
                                        .join(', ') || 'Automatic recovery'}
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </>
    )
}

{/* Active Alert Actions */ }
{
    selectedAlert.status === 'active' && (
        <>
            <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    RECOMMENDED ACTIONS
                </Typography>
                <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12}>
                <Card sx={{ bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                            <Box>
                                <Typography variant="h6" color="warning.main">
                                    Active Alert - Action Required
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    This alert is still active and requires attention
                                </Typography>
                            </Box>
                        </Box>

                        <List dense>
                            <ListItem>
                                <ListItemText
                                    primary="1. Investigate the root cause"
                                    secondary="Check monitor logs and system status"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary="2. Acknowledge the alert"
                                    secondary="Let the team know you're working on it"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary="3. Trigger recovery action"
                                    secondary="Attempt automated remediation if available"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary="4. Monitor for resolution"
                                    secondary="Verify that the issue is resolved"
                                />
                            </ListItem>
                        </List>
                    </CardContent>
                </Card>
            </Grid>
        </>
    )
}
                                </Grid >
                            </DialogContent >
    <DialogActions>
        <Button onClick={() => setDetailsOpen(false)}>
            Close
        </Button>
        {selectedAlert.status === 'active' && (
            <>
                <Button
                    onClick={() => {
                        setDetailsOpen(false);
                        setAcknowledgeDialog(true);
                    }}
                    color="primary"
                    variant="outlined"
                    startIcon={<AcknowledgeIcon />}
                >
                    Acknowledge
                </Button>
                <Button
                    onClick={() => handleTriggerRecovery(selectedAlert._id!)}
                    color="warning"
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    disabled={actionLoading}
                >
                    Trigger Recovery
                </Button>
            </>
        )}
    </DialogActions>
                        </>
                    )}
                </Dialog >

    {/* Acknowledge Dialog */ }
    < Dialog open = { acknowledgeDialog } onClose = {() => setAcknowledgeDialog(false)} maxWidth = "sm" fullWidth >
                    <DialogTitle>Acknowledge Alert</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Note (optional)"
                            value={acknowledgeNote}
                            onChange={(e) => setAcknowledgeNote(e.target.value)}
                            placeholder="Add a note about this acknowledgment..."
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setAcknowledgeDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleAcknowledge}
                            color="primary"
                            variant="contained"
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : 'Acknowledge'}
                        </Button>
                    </DialogActions>
                </Dialog >
            </Box >
        </MainLayout >
    );
}

function formatDuration(start: Date, end?: Date): string {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}