import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  Grid,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Divider,
  Chip,
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
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isReseller } = useAuth();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    active: true,
    expiresAt: null
  });
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddon, setSelectedAddon] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [removeAddonDialogOpen, setRemoveAddonDialogOpen] = useState(false);
  const [addonToRemove, setAddonToRemove] = useState(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [stremioStatus, setStremioStatus] = useState(null);

  const isNewUser = id === 'create';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch addons
        const addonsResponse = await axios.get('/addons');
        setAvailableAddons(addonsResponse.data);
        
        // If editing existing user, fetch user data
        if (!isNewUser) {
          const userResponse = await axios.get(`/users/${id}`);
          setUser(userResponse.data);
          setFormData({
            username: userResponse.data.username,
            email: userResponse.data.email,
            role: userResponse.data.role,
            active: userResponse.data.active,
            expiresAt: userResponse.data.expiresAt ? new Date(userResponse.data.expiresAt) : null
          });
          
          // Fetch Stremio status if user is synced
          if (userResponse.data.stremioSynced) {
            try {
              const stremioResponse = await axios.get(`/users/${id}/stremio-status`);
              setStremioStatus(stremioResponse.data);
            } catch (err) {
              console.error('Error fetching Stremio status:', err);
            }
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isNewUser]);

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'active' ? checked : value
    });
  };

  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      expiresAt: date
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const userData = {
        ...formData
      };
      
      let response;
      if (isNewUser) {
        // For new users, we need to include a password
        if (!userData.password) {
          setError('Password is required for new users');
          setSaving(false);
          return;
        }
        response = await axios.post('/users', userData);
        setSuccessMessage('User created successfully');
        // Navigate to the new user's details page
        navigate(`/users/${response.data.user.id}`, { replace: true });
      } else {
        // For existing users, we don't send the password unless it's being changed
        if (!userData.password) {
          delete userData.password;
        }
        response = await axios.put(`/users/${id}`, userData);
        setUser({
          ...user,
          ...response.data.user
        });
        setSuccessMessage('User updated successfully');
      }
      
      setSaving(false);
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.message || 'Failed to save user. Please try again.');
      setSaving(false);
    }
  };

  const handleAddonSelect = (e) => {
    setSelectedAddon(e.target.value);
  };

  const handleAddAddon = async () => {
    if (!selectedAddon) return;
    
    try {
      await axios.post('/users/assign-addon', {
        userId: id,
        addonId: selectedAddon
      });
      
      // Refresh user data to get updated addons
      const userResponse = await axios.get(`/users/${id}`);
      setUser(userResponse.data);
      
      setSelectedAddon('');
      setSuccessMessage('Addon assigned successfully');
    } catch (err) {
      console.error('Error assigning addon:', err);
      setError(err.response?.data?.message || 'Failed to assign addon. Please try again.');
    }
  };

  const handleRemoveAddonClick = (addon) => {
    setAddonToRemove(addon);
    setRemoveAddonDialogOpen(true);
  };

  const handleRemoveAddonConfirm = async () => {
    if (!addonToRemove) return;
    
    try {
      await axios.delete(`/users/${id}/addons/${addonToRemove._id}`);
      
      // Refresh user data to get updated addons
      const userResponse = await axios.get(`/users/${id}`);
      setUser(userResponse.data);
      
      setRemoveAddonDialogOpen(false);
      setAddonToRemove(null);
      setSuccessMessage('Addon removed successfully');
    } catch (err) {
      console.error('Error removing addon:', err);
      setError('Failed to remove addon. Please try again later.');
    }
  };

  const handleSyncAddons = async () => {
    try {
      const response = await axios.post(`/users/${id}/sync-addons`);
      setSyncDialogOpen(false);
      setSuccessMessage(response.data.message);
    } catch (err) {
      console.error('Error syncing addons:', err);
      setError(err.response?.data?.message || 'Failed to sync addons. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={RouterLink}
          to="/users"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back to Users
        </Button>
        <Typography variant="h4">
          {isNewUser ? 'Create User' : `Edit User: ${user?.username}`}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Information
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
                    label={isNewUser ? "Password" : "New Password (leave blank to keep current)"}
                    type="password"
                    fullWidth
                    value={formData.password || ''}
                    onChange={handleInputChange}
                    required={isNewUser}
                  />
                </Grid>
                {isAdmin && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Role</InputLabel>
                      <Select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        label="Role"
                      >
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="reseller">Reseller</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
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
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Expiration Date"
                      value={formData.expiresAt}
                      onChange={handleDateChange}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save User'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        {!isNewUser && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Stremio Status
              </Typography>
              {user?.stremioSynced ? (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Status:</Typography>
                      <Chip 
                        label="Synced" 
                        color="success" 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Connection:</Typography>
                      <Chip 
                        label={stremioStatus?.valid ? "Valid" : "Invalid"} 
                        color={stremioStatus?.valid ? "success" : "error"} 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                    </Grid>
                    {stremioStatus?.stremioUserId && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Stremio User ID:</Typography>
                        <Typography variant="body2">{stremioStatus.stremioUserId}</Typography>
                      </Grid>
                    )}
                    {stremioStatus?.stremioEmail && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Stremio Email:</Typography>
                        <Typography variant="body2">{stremioStatus.stremioEmail}</Typography>
                      </Grid>
                    )}
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<SyncIcon />}
                      onClick={() => setSyncDialogOpen(true)}
                    >
                      Sync Addons
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Alert severity="info">
                    This user is not synced with Stremio. The user needs to sync their account in their profile.
                  </Alert>
                </Box>
              )}
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Assigned Addons
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    <FormControl fullWidth sx={{ mr: 1 }}>
                      <InputLabel>Add Addon</InputLabel>
                      <Select
                        value={selectedAddon}
                        onChange={handleAddonSelect}
                        label="Add Addon"
                      >
                        <MenuItem value="">
                          <em>Select an addon</em>
                        </MenuItem>
                        {availableAddons
                          .filter(addon => !user?.addons?.some(a => a._id === addon._id))
                          .map(addon => (
                            <MenuItem key={addon._id} value={addon._id}>
                              {addon.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={handleAddAddon}
                      disabled={!selectedAddon}
                    >
                      Add
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <List>
                    {user?.addons?.length > 0 ? (
                      user.addons.map(addon => (
                        <ListItem key={addon._id} divider>
                          <ListItemText
                            primary={addon.name}
                            secondary={addon.description}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              color="error"
                              onClick={() => handleRemoveAddonClick(addon)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText primary="No addons assigned" />
                      </ListItem>
                    )}
                  </List>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Remove Addon Dialog */}
      <Dialog
        open={removeAddonDialogOpen}
        onClose={() => setRemoveAddonDialogOpen(false)}
      >
        <DialogTitle>Remove Addon</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove the addon "{addonToRemove?.name}" from this user?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveAddonDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRemoveAddonConfirm} color="error" autoFocus>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sync Addons Dialog */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
      >
        <DialogTitle>Sync Addons with Stremio</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will sync all assigned addons with the user's Stremio account. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSyncAddons} color="primary" autoFocus>
            Sync
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserDetails;