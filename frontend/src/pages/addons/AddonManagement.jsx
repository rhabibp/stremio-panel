import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const AddonManagement = () => {
  const { currentUser, isAdmin, isReseller } = useAuth();
  const [addons, setAddons] = useState([]);
  const [filteredAddons, setFilteredAddons] = useState([]);
  const [officialAddons, setOfficialAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addonToImport, setAddonToImport] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setLoading(true);
        
        // Fetch user addons
        const addonsResponse = await axios.get('/addons');
        setAddons(addonsResponse.data);
        setFilteredAddons(addonsResponse.data);
        
        // Fetch official addons
        const officialResponse = await axios.get('/addons/official');
        setOfficialAddons(officialResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching addons:', err);
        setError('Failed to load addons. Please try again later.');
        setLoading(false);
      }
    };

    fetchAddons();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = addons.filter(addon => 
        addon.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        addon.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAddons(filtered);
      setPage(0);
    } else {
      setFilteredAddons(addons);
    }
  }, [searchTerm, addons]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDeleteClick = (addon) => {
    setAddonToDelete(addon);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addonToDelete) return;
    
    try {
      await axios.delete(`/addons/${addonToDelete._id}`);
      setAddons(addons.filter(addon => addon._id !== addonToDelete._id));
      setDeleteDialogOpen(false);
      setAddonToDelete(null);
      setSuccessMessage('Addon deleted successfully');
    } catch (err) {
      console.error('Error deleting addon:', err);
      setError('Failed to delete addon. Please try again later.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAddonToDelete(null);
  };

  const handleImportClick = (addon) => {
    setAddonToImport(addon);
    setImportDialogOpen(true);
  };

  const handleImportConfirm = async () => {
    if (!addonToImport) return;
    
    try {
      const response = await axios.post('/addons/import', {
        transportUrl: addonToImport.transportUrl
      });
      
      // Add the imported addon to the list
      setAddons([...addons, response.data.addon]);
      
      setImportDialogOpen(false);
      setAddonToImport(null);
      setSuccessMessage('Addon imported successfully');
    } catch (err) {
      console.error('Error importing addon:', err);
      setError(err.response?.data?.message || 'Failed to import addon. Please try again.');
    }
  };

  const handleImportCancel = () => {
    setImportDialogOpen(false);
    setAddonToImport(null);
  };

  const handleSyncAddon = async (addonId) => {
    try {
      const response = await axios.post(`/addons/${addonId}/sync`);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Addon Management</Typography>
        <Button
          component={RouterLink}
          to="/addons/create"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Add Addon
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="My Addons" />
        <Tab label="Official Addons" />
      </Tabs>

      {tabValue === 0 && (
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search addons..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Users</TableCell>
                  <TableCell>Creator</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAddons
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((addon) => (
                    <TableRow key={addon._id}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell>{addon.description?.substring(0, 50)}...</TableCell>
                      <TableCell>
                        {addon.types?.map(type => (
                          <Chip 
                            key={type} 
                            label={type} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={addon.active ? 'Active' : 'Inactive'} 
                          color={addon.active ? 'success' : 'default'}
                          size="small"
                        />
                        {' '}
                        <Chip 
                          label={addon.public ? 'Public' : 'Private'} 
                          color={addon.public ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{addon.users?.length || 0}</TableCell>
                      <TableCell>
                        {addon.creator?.username || 'System'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          component={RouterLink} 
                          to={`/addons/${addon._id}`}
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="secondary"
                          size="small"
                          onClick={() => handleSyncAddon(addon._id)}
                        >
                          <SyncIcon />
                        </IconButton>
                        {(isAdmin || addon.creator?._id === currentUser?.id) && (
                          <IconButton 
                            color="error"
                            size="small"
                            onClick={() => handleDeleteClick(addon)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                {filteredAddons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No addons found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredAddons.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      {tabValue === 1 && (
        <Paper sx={{ width: '100%', mb: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Resources</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {officialAddons.map((addon) => {
                  // Check if this official addon is already imported
                  const isImported = addons.some(a => a.transportUrl === addon.transportUrl);
                  
                  return (
                    <TableRow key={addon.addonId}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell>{addon.description}</TableCell>
                      <TableCell>
                        {addon.types?.map(type => (
                          <Chip 
                            key={type} 
                            label={type} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        {addon.resources?.map(resource => (
                          <Chip 
                            key={resource} 
                            label={resource} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell align="right">
                        {isImported ? (
                          <Chip 
                            label="Imported" 
                            color="success"
                            size="small"
                          />
                        ) : (
                          <IconButton 
                            color="primary"
                            size="small"
                            onClick={() => handleImportClick(addon)}
                          >
                            <CloudDownloadIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {officialAddons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No official addons found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Addon</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the addon "{addonToDelete?.name}"? This will remove it from all users who have it assigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={handleImportCancel}
      >
        <DialogTitle>Import Official Addon</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Import the official addon "{addonToImport?.name}" to your collection?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleImportCancel}>Cancel</Button>
          <Button onClick={handleImportConfirm} color="primary" autoFocus>
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddonManagement;