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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const AddonDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [addon, setAddon] = useState(null);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    transportUrl: '',
    addonId: '',
    resources: [],
    types: [],
    public: false,
    active: true,
    config: {}
  });
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const isNewAddon = id === 'create';

  // Resource and type options
  const resourceOptions = ['catalog', 'meta', 'stream', 'subtitles', 'addon_catalog'];
  const typeOptions = ['movie', 'series', 'channel', 'tv', 'music', 'other'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // If editing existing addon, fetch addon data
        if (!isNewAddon) {
          const addonResponse = await axios.get(`/addons/${id}`);
          setAddon(addonResponse.data);
          setFormData({
            name: addonResponse.data.name,
            description: addonResponse.data.description,
            version: addonResponse.data.version,
            transportUrl: addonResponse.data.transportUrl,
            addonId: addonResponse.data.addonId,
            resources: addonResponse.data.resources || [],
            types: addonResponse.data.types || [],
            public: addonResponse.data.public,
            active: addonResponse.data.active,
            config: addonResponse.data.config || {}
          });
          
          // Fetch users who have this addon
          try {
            const usersResponse = await axios.get(`/addons/${id}/users`);
            setUsers(usersResponse.data);
          } catch (err) {
            console.error('Error fetching addon users:', err);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching addon data:', err);
        setError('Failed to load addon data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isNewAddon]);

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'public' || name === 'active' ? checked : value
    });
  };

  const handleMultiSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleValidateUrl = async () => {
    if (!formData.transportUrl) {
      setError('Transport URL is required for validation');
      return;
    }
    
    try {
      setValidating(true);
      const response = await axios.post('/addons/validate', {
        transportUrl: formData.transportUrl
      });
      
      setValidationResult(response.data);
      
      // Auto-fill some fields from the manifest
      if (response.data.valid && response.data.manifest) {
        const manifest = response.data.manifest;
        setFormData({
          ...formData,
          name: formData.name || manifest.name,
          description: formData.description || manifest.description || '',
          version: formData.version || manifest.version || '1.0.0',
          addonId: formData.addonId || manifest.id,
          resources: formData.resources.length ? formData.resources : (manifest.resources || []),
          types: formData.types.length ? formData.types : (manifest.types || [])
        });
      }
      
      setValidating(false);
      setSuccessMessage('Addon validated successfully');
    } catch (err) {
      console.error('Error validating addon:', err);
      setError(err.response?.data?.message || 'Failed to validate addon. Please check the URL and try again.');
      setValidating(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.description || !formData.transportUrl || !formData.addonId) {
      setError('Name, description, transport URL, and addon ID are required');
      return;
    }
    
    try {
      setSaving(true);
      
      let response;
      if (isNewAddon) {
        response = await axios.post('/addons', formData);
        setSuccessMessage('Addon created successfully');
        // Navigate to the new addon's details page
        navigate(`/addons/${response.data.addon._id}`, { replace: true });
      } else {
        response = await axios.put(`/addons/${id}`, formData);
        setAddon({
          ...addon,
          ...response.data.addon
        });
        setSuccessMessage('Addon updated successfully');
      }
      
      setSaving(false);
    } catch (err) {
      console.error('Error saving addon:', err);
      setError(err.response?.data?.message || 'Failed to save addon. Please try again.');
      setSaving(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSyncUsers = async () => {
    try {
      const response = await axios.post(`/addons/${id}/sync`);
      setSyncDialogOpen(false);
      setSuccessMessage(response.data.message);
    } catch (err) {
      console.error('Error syncing addon:', err);
      setError(err.response?.data?.message || 'Failed to sync addon. Please try again.');
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
          to="/addons"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back to Addons
        </Button>
        <Typography variant="h4">
          {isNewAddon ? 'Create Addon' : `Edit Addon: ${addon?.name}`}
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

      {!isNewAddon && (
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Addon Details" />
          <Tab label="Users" />
          <Tab label="Manifest" />
        </Tabs>
      )}

      {(tabValue === 0 || isNewAddon) && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <form onSubmit={handleSave}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      name="name"
                      label="Name"
                      fullWidth
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="description"
                      label="Description"
                      fullWidth
                      multiline
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="version"
                      label="Version"
                      fullWidth
                      value={formData.version}
                      onChange={handleInputChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <TextField
                        name="transportUrl"
                        label="Transport URL"
                        fullWidth
                        value={formData.transportUrl}
                        onChange={handleInputChange}
                        required
                        sx={{ mr: 1 }}
                        helperText="URL to the addon manifest (e.g., https://example.com/manifest.json)"
                      />
                      <Button
                        variant="outlined"
                        onClick={handleValidateUrl}
                        disabled={validating || !formData.transportUrl}
                      >
                        {validating ? 'Validating...' : 'Validate'}
                      </Button>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="addonId"
                      label="Addon ID"
                      fullWidth
                      value={formData.addonId}
                      onChange={handleInputChange}
                      required
                      helperText="Unique identifier for the addon (e.g., com.example.addon)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Resources</InputLabel>
                      <Select
                        name="resources"
                        multiple
                        value={formData.resources}
                        onChange={handleMultiSelectChange}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} />
                            ))}
                          </Box>
                        )}
                      >
                        {resourceOptions.map((resource) => (
                          <MenuItem key={resource} value={resource}>
                            {resource}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Types</InputLabel>
                      <Select
                        name="types"
                        multiple
                        value={formData.types}
                        onChange={handleMultiSelectChange}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} />
                            ))}
                          </Box>
                        )}
                      >
                        {typeOptions.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="public"
                          checked={formData.public}
                          onChange={handleInputChange}
                          color="primary"
                        />
                      }
                      label="Public (available to all users)"
                    />
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
                        {saving ? 'Saving...' : 'Save Addon'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            {validationResult && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Validation Result
                </Typography>
                {validationResult.valid ? (
                  <Alert severity="success">
                    Addon is valid. Manifest was successfully retrieved.
                  </Alert>
                ) : (
                  <Alert severity="error">
                    {validationResult.message || 'Addon validation failed'}
                    {validationResult.error && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Error: {validationResult.error}
                      </Typography>
                    )}
                  </Alert>
                )}
              </Paper>
            )}

            {!isNewAddon && (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Addon Status
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<SyncIcon />}
                    onClick={() => setSyncDialogOpen(true)}
                  >
                    Sync with Users
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Status:</Typography>
                    <Chip 
                      label={addon?.active ? "Active" : "Inactive"} 
                      color={addon?.active ? "success" : "default"} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Visibility:</Typography>
                    <Chip 
                      label={addon?.public ? "Public" : "Private"} 
                      color={addon?.public ? "primary" : "default"} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Validation:</Typography>
                    <Chip 
                      label={addon?.validated ? "Validated" : "Not Validated"} 
                      color={addon?.validated ? "success" : "warning"} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Users:</Typography>
                    <Typography variant="body1">{users.length}</Typography>
                  </Grid>
                  {addon?.lastValidated && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Last Validated:</Typography>
                      <Typography variant="body2">
                        {new Date(addon.lastValidated).toLocaleString()}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && !isNewAddon && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Users with this Addon
          </Typography>
          <List>
            {users.length > 0 ? (
              users.map(user => (
                <ListItem key={user._id} divider>
                  <ListItemText
                    primary={user.username}
                    secondary={`${user.email} • ${user.stremioSynced ? 'Synced with Stremio' : 'Not synced'}`}
                  />
                  <Button
                    component={RouterLink}
                    to={`/users/${user._id}`}
                    size="small"
                    variant="outlined"
                  >
                    View User
                  </Button>
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No users have this addon assigned" />
              </ListItem>
            )}
          </List>
        </Paper>
      )}

      {tabValue === 2 && !isNewAddon && addon?.manifest && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Addon Manifest
          </Typography>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Manifest Data</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto' }}>
                {JSON.stringify(addon.manifest, null, 2)}
              </pre>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* Sync Dialog */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
      >
        <DialogTitle>Sync Addon with Users</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will sync this addon with all users who have it assigned. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSyncUsers} color="primary" autoFocus>
            Sync
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddonDetails;