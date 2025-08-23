import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  PlayArrow as TestIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const ProxyManager = () => {
  const [proxies, setProxies] = useState([]);
  const [stats, setStats] = useState({
    summary: { totalProxies: 0, activeProxies: 0, totalRequests: 0 },
    topProxies: []
  });
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTestDialog, setOpenTestDialog] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentProxy, setCurrentProxy] = useState({
    name: '',
    description: '',
    target: '',
    path: '',
    active: true,
    headers: {},
    auth: { username: '', password: '' },
    rateLimit: { enabled: false, maxRequests: 100, timeWindow: 60000 },
    caching: { enabled: false, ttl: 300 }
  });
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  
  const { enqueueSnackbar } = useSnackbar();

  // Load proxies on component mount
  useEffect(() => {
    fetchProxies();
    fetchStats();
  }, []);

  // Fetch all proxies
  const fetchProxies = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/plugins/proxy/proxy');
      setProxies(response.data.data);
    } catch (error) {
      enqueueSnackbar('Failed to load proxies: ' + (error.response?.data?.message || error.message), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch proxy statistics
  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/plugins/proxy/proxy/stats/summary');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load proxy stats:', error);
    }
  };

  // Handle dialog open for creating/editing proxy
  const handleOpenDialog = (proxy = null) => {
    if (proxy) {
      setCurrentProxy(proxy);
      setEditMode(true);
    } else {
      setCurrentProxy({
        name: '',
        description: '',
        target: '',
        path: '',
        active: true,
        headers: {},
        auth: { username: '', password: '' },
        rateLimit: { enabled: false, maxRequests: 100, timeWindow: 60000 },
        caching: { enabled: false, ttl: 300 }
      });
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setHeaderKey('');
    setHeaderValue('');
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentProxy({ ...currentProxy, [name]: value });
  };

  // Handle switch change
  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setCurrentProxy({ ...currentProxy, [name]: checked });
  };

  // Handle nested object change
  const handleNestedChange = (parent, field, value) => {
    setCurrentProxy({
      ...currentProxy,
      [parent]: {
        ...currentProxy[parent],
        [field]: value
      }
    });
  };

  // Add header
  const handleAddHeader = () => {
    if (!headerKey.trim()) return;
    
    setCurrentProxy({
      ...currentProxy,
      headers: {
        ...currentProxy.headers,
        [headerKey]: headerValue
      }
    });
    
    setHeaderKey('');
    setHeaderValue('');
  };

  // Remove header
  const handleRemoveHeader = (key) => {
    const newHeaders = { ...currentProxy.headers };
    delete newHeaders[key];
    
    setCurrentProxy({
      ...currentProxy,
      headers: newHeaders
    });
  };

  // Save proxy
  const handleSaveProxy = async () => {
    try {
      if (editMode) {
        await axios.put(`/api/plugins/proxy/proxy/${currentProxy._id}`, currentProxy);
        enqueueSnackbar('Proxy updated successfully', { variant: 'success' });
      } else {
        await axios.post('/api/plugins/proxy/proxy', currentProxy);
        enqueueSnackbar('Proxy created successfully', { variant: 'success' });
      }
      
      handleCloseDialog();
      fetchProxies();
      fetchStats();
    } catch (error) {
      enqueueSnackbar('Failed to save proxy: ' + (error.response?.data?.message || error.message), { variant: 'error' });
    }
  };

  // Delete proxy
  const handleDeleteProxy = async (id) => {
    if (!window.confirm('Are you sure you want to delete this proxy?')) return;
    
    try {
      await axios.delete(`/api/plugins/proxy/proxy/${id}`);
      enqueueSnackbar('Proxy deleted successfully', { variant: 'success' });
      fetchProxies();
      fetchStats();
    } catch (error) {
      enqueueSnackbar('Failed to delete proxy: ' + (error.response?.data?.message || error.message), { variant: 'error' });
    }
  };

  // Test proxy
  const handleTestProxy = async (proxy) => {
    setTestResults(null);
    setOpenTestDialog(true);
    
    try {
      const response = await axios.post('/api/plugins/proxy/proxy/test', proxy);
      setTestResults(response.data.data);
    } catch (error) {
      setTestResults({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Proxy Manager</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Proxy
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Proxies</Typography>
              <Typography variant="h3">{stats.summary.totalProxies}</Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.summary.activeProxies} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Requests</Typography>
              <Typography variant="h3">{stats.summary.totalRequests.toLocaleString()}</Typography>
              <Typography variant="body2" color="textSecondary">
                Through all proxies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Top Proxy</Typography>
              {stats.topProxies.length > 0 ? (
                <>
                  <Typography variant="h5">{stats.topProxies[0]?.name || 'N/A'}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {stats.topProxies[0]?.usageStats?.totalRequests.toLocaleString() || 0} requests
                  </Typography>
                </>
              ) : (
                <Typography variant="body1">No data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Proxies Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6">Configured Proxies</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchProxies();
              fetchStats();
            }}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Path</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requests</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {proxies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No proxies configured
                  </TableCell>
                </TableRow>
              ) : (
                proxies.map((proxy) => (
                  <TableRow key={proxy._id}>
                    <TableCell>{proxy.name}</TableCell>
                    <TableCell>{proxy.path}</TableCell>
                    <TableCell>{proxy.target}</TableCell>
                    <TableCell>
                      <Chip
                        label={proxy.active ? 'Active' : 'Inactive'}
                        color={proxy.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{proxy.usageStats?.totalRequests || 0}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleTestProxy(proxy)}
                        title="Test Proxy"
                      >
                        <TestIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(proxy)}
                        title="Edit Proxy"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteProxy(proxy._id)}
                        title="Delete Proxy"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Proxy' : 'Create Proxy'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Name"
                value={currentProxy.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="path"
                label="Path"
                value={currentProxy.path}
                onChange={handleInputChange}
                fullWidth
                required
                helperText="Path used in proxy URL (e.g., 'stremio' for /api/proxy/stremio)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="target"
                label="Target URL"
                value={currentProxy.target}
                onChange={handleInputChange}
                fullWidth
                required
                helperText="Target URL to proxy requests to (e.g., https://api.strem.io)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={currentProxy.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="active"
                    checked={currentProxy.active}
                    onChange={handleSwitchChange}
                  />
                }
                label="Active"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1">Headers</Typography>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <TextField
                  label="Header Name"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  sx={{ mr: 1, flexGrow: 1 }}
                />
                <TextField
                  label="Value"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  sx={{ mr: 1, flexGrow: 1 }}
                />
                <Button variant="contained" onClick={handleAddHeader}>
                  Add
                </Button>
              </Box>

              {Object.entries(currentProxy.headers || {}).length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Header</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell width="10%">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(currentProxy.headers || {}).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell>{key}</TableCell>
                          <TableCell>{value}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveHeader(key)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No custom headers defined
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1">Authentication</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Username"
                value={currentProxy.auth?.username || ''}
                onChange={(e) => handleNestedChange('auth', 'username', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Password"
                type="password"
                value={currentProxy.auth?.password || ''}
                onChange={(e) => handleNestedChange('auth', 'password', e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1">Rate Limiting</Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentProxy.rateLimit?.enabled || false}
                    onChange={(e) => handleNestedChange('rateLimit', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Rate Limiting"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Max Requests"
                type="number"
                value={currentProxy.rateLimit?.maxRequests || 100}
                onChange={(e) => handleNestedChange('rateLimit', 'maxRequests', parseInt(e.target.value))}
                fullWidth
                disabled={!currentProxy.rateLimit?.enabled}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Time Window (ms)"
                type="number"
                value={currentProxy.rateLimit?.timeWindow || 60000}
                onChange={(e) => handleNestedChange('rateLimit', 'timeWindow', parseInt(e.target.value))}
                fullWidth
                disabled={!currentProxy.rateLimit?.enabled}
                helperText="Time window in milliseconds (e.g., 60000 = 1 minute)"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1">Caching</Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentProxy.caching?.enabled || false}
                    onChange={(e) => handleNestedChange('caching', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Caching"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="TTL (seconds)"
                type="number"
                value={currentProxy.caching?.ttl || 300}
                onChange={(e) => handleNestedChange('caching', 'ttl', parseInt(e.target.value))}
                fullWidth
                disabled={!currentProxy.caching?.enabled}
                helperText="Time to live in seconds (e.g., 300 = 5 minutes)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveProxy} variant="contained" color="primary">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Results Dialog */}
      <Dialog open={openTestDialog} onClose={() => setOpenTestDialog(false)}>
        <DialogTitle>Proxy Test Results</DialogTitle>
        <DialogContent>
          {testResults === null ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>Testing proxy...</Typography>
            </Box>
          ) : (
            <Box sx={{ minWidth: 300 }}>
              <Typography variant="h6" color={testResults.success ? 'success.main' : 'error.main'}>
                {testResults.success ? 'Success' : 'Failed'}
              </Typography>
              
              {testResults.success ? (
                <>
                  <Typography variant="body1">Status Code: {testResults.statusCode}</Typography>
                  <Typography variant="body1">Content Type: {testResults.contentType}</Typography>
                  <Typography variant="body1">Response Time: {testResults.responseTime}</Typography>
                </>
              ) : (
                <Typography variant="body1" color="error">
                  Error: {testResults.error}
                  {testResults.statusCode !== 'unknown' && ` (Status: ${testResults.statusCode})`}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTestDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProxyManager;