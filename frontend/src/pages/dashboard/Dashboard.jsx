import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ExtensionIcon from '@mui/icons-material/Extension';
import BusinessIcon from '@mui/icons-material/Business';
import SyncIcon from '@mui/icons-material/Sync';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { currentUser, isAdmin, isReseller } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentAddons, setRecentAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch stats based on user role
        let statsData = {};
        
        if (isAdmin) {
          // Admin stats
          const usersRes = await axios.get('/users');
          const addonsRes = await axios.get('/addons');
          const resellersRes = await axios.get('/resellers');
          
          statsData = {
            totalUsers: usersRes.data.length,
            totalAddons: addonsRes.data.length,
            totalResellers: resellersRes.data.length,
            activeUsers: usersRes.data.filter(user => user.active).length,
            syncedUsers: usersRes.data.filter(user => user.stremioSynced).length
          };
          
          // Get recent users
          setRecentUsers(usersRes.data.slice(0, 5));
          
          // Get recent addons
          setRecentAddons(addonsRes.data.slice(0, 5));
          
        } else if (isReseller) {
          // Reseller stats
          const statsRes = await axios.get('/resellers/stats/me');
          const usersRes = await axios.get('/users');
          const addonsRes = await axios.get('/addons');
          
          statsData = {
            ...statsRes.data.stats,
            totalAddons: addonsRes.data.filter(addon => addon.creator === currentUser.id).length
          };
          
          // Get recent users (only those belonging to this reseller)
          setRecentUsers(usersRes.data.filter(user => user.reseller === currentUser.id).slice(0, 5));
          
          // Get recent addons (only those created by this reseller)
          setRecentAddons(addonsRes.data.filter(addon => addon.creator === currentUser.id).slice(0, 5));
          
        } else {
          // Regular user stats
          const userRes = await axios.get(`/auth/profile`);
          const addonsRes = await axios.get('/addons');
          
          statsData = {
            stremioSynced: userRes.data.stremioSynced,
            totalAddons: userRes.data.addons?.length || 0
          };
          
          // Get user's addons
          setRecentAddons(addonsRes.data.filter(addon => 
            userRes.data.addons?.includes(addon._id)
          ).slice(0, 5));
        }
        
        setStats(statsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser, isAdmin, isReseller]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Admin and Reseller Stats */}
        {(isAdmin || isReseller) && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Users</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                  {stats?.totalUsers || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats?.activeUsers || 0} active
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ExtensionIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Addons</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                  {stats?.totalAddons || 0}
                </Typography>
              </Paper>
            </Grid>
            
            {isAdmin && (
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BusinessIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Resellers</Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                    {stats?.totalResellers || 0}
                  </Typography>
                </Paper>
              </Grid>
            )}
            
            {isReseller && (
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SyncIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Synced Users</Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                    {stats?.syncedUsers || 0}
                  </Typography>
                </Paper>
              </Grid>
            )}
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">New Users</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                  {stats?.newUsers || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last 30 days
                </Typography>
              </Paper>
            </Grid>
          </>
        )}
        
        {/* Regular User Stats */}
        {!isAdmin && !isReseller && (
          <>
            <Grid item xs={12} sm={6}>
              <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SyncIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Stremio Sync</Typography>
                </Box>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  {stats?.stremioSynced ? 'Synced' : 'Not Synced'}
                </Typography>
                {!stats?.stremioSynced && (
                  <Button 
                    component={RouterLink} 
                    to="/profile" 
                    variant="contained" 
                    size="small"
                  >
                    Sync Now
                  </Button>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ExtensionIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">My Addons</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
                  {stats?.totalAddons || 0}
                </Typography>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>
      
      {/* Recent Activity */}
      <Grid container spacing={3}>
        {/* Recent Users - Admin and Reseller only */}
        {(isAdmin || isReseller) && recentUsers.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Users
              </Typography>
              <List>
                {recentUsers.map(user => (
                  <React.Fragment key={user._id}>
                    <ListItem
                      button
                      component={RouterLink}
                      to={`/users/${user._id}`}
                    >
                      <ListItemText
                        primary={user.username}
                        secondary={`${user.email} • ${user.stremioSynced ? 'Synced' : 'Not Synced'}`}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  component={RouterLink} 
                  to="/users" 
                  size="small"
                >
                  View All
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
        
        {/* Recent Addons */}
        {recentAddons.length > 0 && (
          <Grid item xs={12} md={(isAdmin || isReseller) ? 6 : 12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {isAdmin || isReseller ? 'Recent Addons' : 'My Addons'}
              </Typography>
              <List>
                {recentAddons.map(addon => (
                  <React.Fragment key={addon._id}>
                    <ListItem
                      button
                      component={RouterLink}
                      to={`/addons/${addon._id}`}
                    >
                      <ListItemText
                        primary={addon.name}
                        secondary={addon.description?.substring(0, 60) + '...'}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  component={RouterLink} 
                  to="/addons" 
                  size="small"
                >
                  View All
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;