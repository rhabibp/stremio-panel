import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const ResellerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [reseller, setReseller] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    credits: 0,
    active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [addCreditsDialogOpen, setAddCreditsDialogOpen] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState(0);

  const isNewReseller = id === 'create';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // If editing existing reseller, fetch reseller data
        if (!isNewReseller) {
          const resellerResponse = await axios.get(`/resellers/${id}`);
          setReseller(resellerResponse.data);
          setFormData({
            username: resellerResponse.data.username,
            email: resellerResponse.data.email,
            password: '',
            credits: resellerResponse.data.credits,
            active: resellerResponse.data.active
          });
          
          // Fetch reseller stats
          try {
            const statsResponse = await axios.get(`/resellers/${id}/stats`);
            setStats(statsResponse.data.stats);
          } catch (err) {
            console.error('Error fetching reseller stats:', err);
          }
          
          // Fetch reseller users
          try {
            const usersResponse = await axios.get(`/resellers/${id}/users`);
            setUsers(usersResponse.data);
          } catch (err) {
            console.error('Error fetching reseller users:', err);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reseller data:', err);
        setError('Failed to load reseller data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isNewReseller]);

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'active' ? checked : name === 'credits' ? parseInt(value) || 0 : value
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      let response;
      if (isNewReseller) {
        // For new resellers, we need to include a password
        if (!formData.password) {
          setError('Password is required for new resellers');
          setSaving(false);
          return;
        }
        response = await axios.post('/resellers', formData);
        setSuccessMessage('Reseller created successfully');
        // Navigate to the new reseller's details page
        navigate(`/resellers/${response.data.reseller.id}`, { replace: true });
      } else {
        // For existing resellers, we don't send the password unless it's being changed
        const dataToSend = { ...formData };
        if (!dataToSend.password) {
          delete dataToSend.password;
        }
        response = await axios.put(`/resellers/${id}`, dataToSend);
        setReseller({
          ...reseller,
          ...response.data.reseller
        });
        setSuccessMessage('Reseller updated successfully');
      }
      
      setSaving(false);
    } catch (err) {
      console.error('Error saving reseller:', err);
      setError(err.response?.data?.message || 'Failed to save reseller. Please try again.');
      setSaving(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAddCreditsClick = () => {
    setCreditsToAdd(0);
    setAddCreditsDialogOpen(true);
  };

  const handleCreditsChange = (event) => {
    setCreditsToAdd(parseInt(event.target.value) || 0);
  };

  const handleAddCreditsConfirm = async () => {
    if (creditsToAdd <= 0) return;
    
    try {
      const response = await axios.post(`/resellers/${id}/credits`, {
        credits: creditsToAdd
      });
      
      setReseller({
        ...reseller,
        credits: response.data.reseller.credits
      });
      
      setFormData({
        ...formData,
        credits: response.data.reseller.credits
      });
      
      setAddCreditsDialogOpen(false);
      setCreditsToAdd(0);
      setSuccessMessage(`Added ${creditsToAdd} credits successfully`);
    } catch (err) {
      console.error('Error adding credits:', err);
      setError('Failed to add credits. Please try again later.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin && !isNewReseller) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        You don't have permission to access this page.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={RouterLink}
          to="/resellers"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back to Resellers
        </Button>
        <Typography variant="h4">
          {isNewReseller ? 'Create Reseller' : `Edit Reseller: ${reseller?.username}`}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {!isNewReseller && (
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Reseller Details" />
          <Tab label="Users" />
          <Tab label="Statistics" />
        </Tabs>
      )}

      {(tabValue === 0 || isNewReseller) && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Reseller Information
              </Typography>
              <form onSubmit={handleSave}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      name="username"
                      label="Username"
                      fullWidth
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="email"
                      label="Email"
                      type="email"
                      fullWidth
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="password"
                      label={isNewReseller ? "Password" : "New Password (leave blank to keep current)"}
                      type="password"
                      fullWidth
                      value={formData.password}
                      onChange={handleInputChange}
                      required={isNewReseller}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <TextField
                        name="credits"
                        label="Credits"
                        type="number"
                        fullWidth
                        value={formData.credits}
                        onChange={handleInputChange}
                        sx={{ mr: 1 }}
                        inputProps={{ min: 0 }}
                      />
                      {!isNewReseller && (
                        <Button
                          variant="outlined"
                          startIcon={<CreditCardIcon />}
                          onClick={handleAddCreditsClick}
                        >
                          Add Credits
                        </Button>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="active"
                          checked={formData.active}
                          onChange={handleInputChange}
                          color="primary"
                        />
                      }
                      label="Active"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Reseller'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Grid>

          {!isNewReseller && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Reseller Overview
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Status:</Typography>
                    <Typography variant="body1">
                      {reseller?.active ? 'Active' : 'Inactive'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Credits:</Typography>
                    <Typography variant="body1">{reseller?.credits}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Total Users:</Typography>
                    <Typography variant="body1">{stats?.totalUsers || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Active Users:</Typography>
                    <Typography variant="body1">{stats?.activeUsers || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Synced Users:</Typography>
                    <Typography variant="body1">{stats?.syncedUsers || 0}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">New Users (30 days):</Typography>
                    <Typography variant="body1">{stats?.newUsers || 0}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        component={RouterLink}
                        to={`/resellers/${id}/users`}
                        variant="outlined"
                        startIcon={<PeopleIcon />}
                      >
                        View All Users
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {tabValue === 1 && !isNewReseller && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Reseller Users
            </Typography>
            <Button
              component={RouterLink}
              to="/users/create"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Add User
            </Button>
          </Box>
          <List>
            {users.length > 0 ? (
              users.map(user => (
                <ListItem key={user._id} divider>
                  <ListItemText
                    primary={user.username}
                    secondary={`${user.email} • ${user.stremioSynced ? 'Synced with Stremio' : 'Not synced'}`}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      component={RouterLink}
                      to={`/users/${user._id}`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No users assigned to this reseller" />
              </ListItem>
            )}
          </List>
        </Paper>
      )}

      {tabValue === 2 && !isNewReseller && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                User Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" component="div">
                        {stats?.totalUsers || 0}
                      </Typography>
                      <Typography color="text.secondary">
                        Total Users
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" component="div">
                        {stats?.activeUsers || 0}
                      </Typography>
                      <Typography color="text.secondary">
                        Active Users
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" component="div">
                        {stats?.syncedUsers || 0}
                      </Typography>
                      <Typography color="text.secondary">
                        Synced with Stremio
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" component="div">
                        {stats?.newUsers || 0}
                      </Typography>
                      <Typography color="text.secondary">
                        New Users (30 days)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Credit Usage
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" component="div">
                        {reseller?.credits || 0}
                      </Typography>
                      <Typography color="text.secondary">
                        Available Credits
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" component="div">
                        {stats?.totalUsers || 0}
                      </Typography>
                      <Typography color="text.secondary">
                        Used Credits
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<CreditCardIcon />}
                      onClick={handleAddCreditsClick}
                    >
                      Add Credits
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Add Credits Dialog */}
      <Dialog
        open={addCreditsDialogOpen}
        onClose={() => setAddCreditsDialogOpen(false)}
      >
        <DialogTitle>Add Credits</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Add credits to reseller "{reseller?.username}". Current credits: {reseller?.credits}
          </DialogContentText>
          <TextField
            autoFocus
            label="Credits to Add"
            type="number"
            fullWidth
            value={creditsToAdd}
            onChange={handleCreditsChange}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCreditsDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddCreditsConfirm} 
            color="primary" 
            disabled={creditsToAdd <= 0}
            autoFocus
          >
            Add Credits
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResellerDetails;