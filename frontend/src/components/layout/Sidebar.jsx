import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Drawer as MuiDrawer,
  Toolbar,
  List,
  Divider,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ExtensionIcon from '@mui/icons-material/Extension';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';

import { useAuth } from '../../context/AuthContext';

const drawerWidth = 240;

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      position: 'relative',
      whiteSpace: 'nowrap',
      width: drawerWidth,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      boxSizing: 'border-box',
      ...(!open && {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up('sm')]: {
          width: theme.spacing(9),
        },
      }),
    },
  }),
);

const Sidebar = ({ open, toggleDrawer }) => {
  const { currentUser, isAdmin, isReseller } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer variant="permanent" open={open}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: [1],
        }}
      >
        <IconButton onClick={toggleDrawer}>
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List component="nav">
        {/* Dashboard - visible to all */}
        <ListItemButton 
          component={RouterLink} 
          to="/dashboard" 
          selected={isActive('/dashboard')}
        >
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>

        {/* Users - visible to admins and resellers */}
        {(isAdmin || isReseller) && (
          <ListItemButton 
            component={RouterLink} 
            to="/users" 
            selected={isActive('/users')}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Users" />
          </ListItemButton>
        )}

        {/* Addons - visible to all */}
        <ListItemButton 
          component={RouterLink} 
          to="/addons" 
          selected={isActive('/addons')}
        >
          <ListItemIcon>
            <ExtensionIcon />
          </ListItemIcon>
          <ListItemText primary="Addons" />
        </ListItemButton>

        {/* Resellers - visible only to admins */}
        {isAdmin && (
          <ListItemButton 
            component={RouterLink} 
            to="/resellers" 
            selected={isActive('/resellers')}
          >
            <ListItemIcon>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText primary="Resellers" />
          </ListItemButton>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Profile - visible to all */}
        <ListItemButton 
          component={RouterLink} 
          to="/profile" 
          selected={isActive('/profile')}
        >
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItemButton>

        {/* Settings - visible only to admins */}
        {isAdmin && (
          <ListItemButton 
            component={RouterLink} 
            to="/settings" 
            selected={isActive('/settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        )}
      </List>
    </Drawer>
  );
};

export default Sidebar;