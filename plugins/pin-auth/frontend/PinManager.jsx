import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Cleaning as CleaningIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const PinManager = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    used: 0,
    expired: 0,
    recentPins: []
  });
  const [loading, setLoading] = useState(false);
  
  const { enqueueSnackbar } = useSnackbar();

  // Load PIN stats on component mount
  useEffect(() => {
    fetchPinStats();
  }, []);

  // Fetch PIN statistics
  const fetchPinStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/plugins/pin-auth/pin/stats');
      setStats(response.data.data);
    } catch (error) {
      enqueueSnackbar('Failed to load PIN statistics: ' + (error.response?.data?.message || error.message), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Clean up expired PINs
  const cleanupExpiredPins = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/plugins/pin-auth/pin/cleanup');
      enqueueSnackbar(response.data.message, { variant: 'success' });
      fetchPinStats();
    } catch (error) {
      enqueueSnackbar('Failed to clean up expired PINs: ' + (error.response?.data?.message || error.message), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'verified':
        return 'success';
      case 'used':
        return 'primary';
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">PIN Authentication Manager</Typography>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchPinStats}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CleaningIcon />}
            onClick={cleanupExpiredPins}
            disabled={loading}
          >
            Clean Up Expired PINs
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total PINs</Typography>
              <Typography variant="h3">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Pending</Typography>
              <Typography variant="h3" color="warning.main">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Verified</Typography>
              <Typography variant="h3" color="success.main">{stats.verified}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Used</Typography>
              <Typography variant="h3" color="primary.main">{stats.used}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Expired</Typography>
              <Typography variant="h3" color="error.main">{stats.expired}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent PINs Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Recent PINs</Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>PIN</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Expires At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.recentPins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No recent PINs
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentPins.map((pin) => (
                  <TableRow key={pin._id}>
                    <TableCell>{pin.pin}</TableCell>
                    <TableCell>
                      <Chip
                        label={pin.status.toUpperCase()}
                        color={getStatusColor(pin.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(pin.createdAt)}</TableCell>
                    <TableCell>{formatDate(pin.expiresAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>About PIN Authentication</Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1" paragraph>
          PIN authentication allows users to login using the official Stremio app. This provides a seamless
          authentication experience without requiring users to enter their Stremio credentials on this website.
        </Typography>
        <Typography variant="body1" paragraph>
          When a user generates a PIN, they can enter it in the Stremio app to authenticate. The PIN is valid for
          10 minutes by default and can only be used once.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Note: Expired PINs are automatically cleaned up every 15 minutes, but you can also manually clean them up
          using the "Clean Up Expired PINs" button above.
        </Typography>
      </Box>
    </Box>
  );
};

export default PinManager;