import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../frontend/src/context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const PinLogin = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pinData, setPinData] = useState(null);
  const [error, setError] = useState('');
  const [stremioEmail, setStremioEmail] = useState('');
  const [stremioPassword, setStremioPassword] = useState('');
  const [pinStatus, setPinStatus] = useState('pending');
  const [countdown, setCountdown] = useState(0);
  
  const socketRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Generate a new PIN
  const generatePin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/plugins/pin-auth/pin/generate');
      setPinData(response.data.data);
      
      // Set up countdown
      const expiryTime = new Date(response.data.data.expiresAt).getTime();
      const now = new Date().getTime();
      setCountdown(Math.floor((expiryTime - now) / 1000));
      
      // Connect to socket.io for real-time updates
      connectToSocket(response.data.data.sessionId);
      
      // Start polling for PIN status
      startPolling(response.data.data.sessionId);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Login with Stremio credentials
  const loginWithStremio = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/plugins/pin-auth/pin/login-stremio', {
        email: stremioEmail,
        password: stremioPassword
      });
      
      // Verify PIN with Stremio auth key
      await axios.post('/api/plugins/pin-auth/pin/verify', {
        pin: response.data.data.pin.pin,
        stremioAuthKey: response.data.data.stremio.authKey
      });
      
      // Check PIN status to get token
      const statusResponse = await axios.get(`/api/plugins/pin-auth/pin/status/${response.data.data.pin.sessionId}`);
      
      if (statusResponse.data.data.status === 'verified') {
        // Login with the token
        login(statusResponse.data.data.token, statusResponse.data.data.user);
        navigate('/dashboard');
      } else {
        setError('Failed to verify PIN. Please try again.');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Connect to socket.io for real-time updates
  const connectToSocket = (sessionId) => {
    // Clean up existing socket connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Connect to socket.io
    const socket = io('/pin-auth', {
      path: '/api/plugins/pin-auth/socket.io'
    });
    
    socket.on('connect', () => {
      console.log('Connected to PIN authentication socket');
      socket.emit('join-session', sessionId);
    });
    
    socket.on('pin-verified', (data) => {
      console.log('PIN verified:', data);
      setPinStatus('verified');
      checkPinStatus(sessionId);
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from PIN authentication socket');
    });
    
    socketRef.current = socket;
  };

  // Start polling for PIN status
  const startPolling = (sessionId) => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Poll every 2 seconds
    intervalRef.current = setInterval(() => {
      checkPinStatus(sessionId);
      
      // Update countdown
      setCountdown(prevCountdown => {
        if (prevCountdown <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 2000);
  };

  // Check PIN status
  const checkPinStatus = async (sessionId) => {
    try {
      const response = await axios.get(`/api/plugins/pin-auth/pin/status/${sessionId}`);
      const status = response.data.data.status;
      
      setPinStatus(status);
      
      if (status === 'verified' || status === 'used') {
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Login with the token
        if (response.data.data.token) {
          login(response.data.data.token, response.data.data.user);
          navigate('/dashboard');
        }
      } else if (status === 'expired') {
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        setError('PIN has expired. Please generate a new one.');
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
    }
  };

  // Format countdown time
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label="Login with PIN" />
            <Tab label="Login with Stremio" />
          </Tabs>
        </Box>
        
        {/* PIN Login Tab */}
        <Box role="tabpanel" hidden={activeTab !== 0} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom align="center">
            Login with Stremio PIN
          </Typography>
          
          <Typography variant="body1" paragraph align="center">
            Generate a PIN and enter it in your Stremio app to login
          </Typography>
          
          {!pinData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={generatePin}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate PIN'}
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary" gutterBottom>
                      {pinData.pin}
                    </Typography>
                    
                    <Typography variant="body2" color="textSecondary">
                      Enter this PIN in your Stremio app
                    </Typography>
                    
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        Status: <strong>{pinStatus.toUpperCase()}</strong>
                      </Typography>
                      
                      <Typography variant="body2" color="textSecondary">
                        Expires in: <strong>{formatCountdown(countdown)}</strong>
                      </Typography>
                    </Box>
                    
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={generatePin}
                      sx={{ mt: 2 }}
                    >
                      Generate New PIN
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Scan QR Code with Stremio App
                    </Typography>
                    
                    <Box
                      component="img"
                      src={pinData.qrCode}
                      alt="QR Code"
                      sx={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Instructions:
                </Typography>
                <ol>
                  <li>Open your Stremio app</li>
                  <li>Go to Settings &gt; Authentication</li>
                  <li>Select "Login with PIN"</li>
                  <li>Enter the PIN shown above or scan the QR code</li>
                  <li>Wait for authentication to complete</li>
                </ol>
              </Grid>
            </Grid>
          )}
          
          {error && (
            <Typography color="error" align="center" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
        
        {/* Stremio Login Tab */}
        <Box role="tabpanel" hidden={activeTab !== 1} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom align="center">
            Login with Stremio Credentials
          </Typography>
          
          <Typography variant="body1" paragraph align="center">
            Enter your Stremio email and password to login
          </Typography>
          
          <Box component="form" onSubmit={loginWithStremio} sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Stremio Email"
                  type="email"
                  value={stremioEmail}
                  onChange={(e) => setStremioEmail(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Stremio Password"
                  type="password"
                  value={stremioPassword}
                  onChange={(e) => setStremioPassword(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Login'}
                </Button>
              </Grid>
            </Grid>
            
            {error && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default PinLogin;