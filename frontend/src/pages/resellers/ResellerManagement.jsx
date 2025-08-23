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
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const ResellerManagement = () => {
  const { isAdmin } = useAuth();
  const [resellers, setResellers] = useState([]);
  const [filteredResellers, setFilteredResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resellerToDelete, setResellerToDelete] = useState(null);
  const [addCreditsDialogOpen, setAddCreditsDialogOpen] = useState(false);
  const [resellerToAddCredits, setResellerToAddCredits] = useState(null);
  const [creditsToAdd, setCreditsToAdd] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchResellers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/resellers');
        setResellers(response.data);
        setFilteredResellers(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching resellers:', err);
        setError('Failed to load resellers. Please try again later.');
        setLoading(false);
      }
    };

    fetchResellers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = resellers.filter(reseller => 
        reseller.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        reseller.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredResellers(filtered);
      setPage(0);
    } else {
      setFilteredResellers(resellers);
    }
  }, [searchTerm, resellers]);

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

  const handleDeleteClick = (reseller) => {
    setResellerToDelete(reseller);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!resellerToDelete) return;
    
    try {
      await axios.delete(`/resellers/${resellerToDelete._id}`);
      setResellers(resellers.filter(reseller => reseller._id !== resellerToDelete._id));
      setDeleteDialogOpen(false);
      setResellerToDelete(null);
      setSuccessMessage('Reseller deleted successfully');
    } catch (err) {
      console.error('Error deleting reseller:', err);
      setError('Failed to delete reseller. Please try again later.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setResellerToDelete(null);
  };

  const handleAddCreditsClick = (reseller) => {
    setResellerToAddCredits(reseller);
    setCreditsToAdd(0);
    setAddCreditsDialogOpen(true);
  };

  const handleCreditsChange = (event) => {
    setCreditsToAdd(parseInt(event.target.value) || 0);
  };

  const handleAddCreditsConfirm = async () => {
    if (!resellerToAddCredits || creditsToAdd <= 0) return;
    
    try {
      const response = await axios.post(`/resellers/${resellerToAddCredits._id}/credits`, {
        credits: creditsToAdd
      });
      
      // Update reseller in the list
      const updatedResellers = resellers.map(reseller => 
        reseller._id === resellerToAddCredits._id 
          ? { ...reseller, credits: response.data.reseller.credits }
          : reseller
      );
      
      setResellers(updatedResellers);
      setAddCreditsDialogOpen(false);
      setResellerToAddCredits(null);
      setCreditsToAdd(0);
      setSuccessMessage(`Added ${creditsToAdd} credits to ${response.data.reseller.username}`);
    } catch (err) {
      console.error('Error adding credits:', err);
      setError('Failed to add credits. Please try again later.');
    }
  };

  const handleAddCreditsCancel = () => {
    setAddCreditsDialogOpen(false);
    setResellerToAddCredits(null);
    setCreditsToAdd(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        You don't have permission to access this page.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Reseller Management</Typography>
        <Button
          component={RouterLink}
          to="/resellers/create"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Add Reseller
        </Button>
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

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search resellers..."
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
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Credits</TableCell>
                <TableCell>Users</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredResellers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((reseller) => (
                  <TableRow key={reseller._id}>
                    <TableCell>{reseller.username}</TableCell>
                    <TableCell>{reseller.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={reseller.active ? 'Active' : 'Inactive'} 
                        color={reseller.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{reseller.credits}</TableCell>
                    <TableCell>
                      <Button
                        component={RouterLink}
                        to={`/resellers/${reseller._id}/users`}
                        size="small"
                        startIcon={<PeopleIcon />}
                      >
                        View Users
                      </Button>
                    </TableCell>
                    <TableCell>
                      {new Date(reseller.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        component={RouterLink} 
                        to={`/resellers/${reseller._id}`}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="secondary"
                        size="small"
                        onClick={() => handleAddCreditsClick(reseller)}
                      >
                        <CreditCardIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        size="small"
                        onClick={() => handleDeleteClick(reseller)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredResellers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No resellers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredResellers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Reseller</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the reseller "{resellerToDelete?.username}"? This will not delete their users, but will remove the reseller association.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Credits Dialog */}
      <Dialog
        open={addCreditsDialogOpen}
        onClose={handleAddCreditsCancel}
      >
        <DialogTitle>Add Credits</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Add credits to reseller "{resellerToAddCredits?.username}". Current credits: {resellerToAddCredits?.credits}
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
          <Button onClick={handleAddCreditsCancel}>Cancel</Button>
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

export default ResellerManagement;