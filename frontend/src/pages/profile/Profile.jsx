import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { useAuth } from '../../context/AuthContext';

// Validation schema for profile update
const ProfileSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .required('Username is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required')
});

// Validation schema for Stremio sync
const StremioSyncSchema = Yup.object().shape({
  stremioEmail: Yup.string()
    .email('Invalid email address')
    .required('Stremio email is required'),
  stremioPassword: Yup.string()
    .required('Stremio password is required')
});

// Validation schema for Stremio registration
const StremioRegisterSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required')
});

const Profile = () => {
  const { currentUser, updateProfile, syncWithStremio, registerOnStremio } = useAuth();
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  const handleProfileUpdate = async (values, { setSubmitting }) => {
    try {
      await updateProfile({
        username: values.username,
        email: values.email
      });
      setUpdateSuccess(true);
      setUpdateError('');
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      setUpdateError(error.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStremioSync = async (values, { setSubmitting, resetForm }) => {
    try {
      await syncWithStremio({
        stremioEmail: values.stremioEmail,
        stremioPassword: values.stremioPassword
      });
      setSyncDialogOpen(false);
      resetForm();
      setUpdateSuccess(true);
      setUpdateError('');
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      setUpdateError(error.message || 'Failed to sync with Stremio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStremioRegister = async (values, { setSubmitting, resetForm }) => {
    try {
      await registerOnStremio({
        email: values.email,
        password: values.password
      });
      setRegisterDialogOpen(false);
      resetForm();
      setUpdateSuccess(true);
      setUpdateError('');
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      setUpdateError(error.message || 'Failed to register on Stremio');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      {updateSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Profile updated successfully!
        </Alert>
      )}

      {updateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {updateError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <Formik
              initialValues={{
                username: currentUser?.username || '',
                email: currentUser?.email || ''
              }}
              validationSchema={ProfileSchema}
              onSubmit={handleProfileUpdate}
              enableReinitialize
            >
              {({ isSubmitting, errors, touched }) => (
                <Form>
                  <Field
                    as={TextField}
                    fullWidth
                    margin="normal"
                    name="username"
                    label="Username"
                    error={touched.username && Boolean(errors.username)}
                    helperText={touched.username && errors.username}
                  />
                  <Field
                    as={TextField}
                    fullWidth
                    margin="normal"
                    name="email"
                    label="Email"
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{ mt: 2 }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : 'Update Profile'}
                  </Button>
                </Form>
              )}
            </Formik>
          </Paper>
        </Grid>

        {/* Stremio Integration */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Stremio Integration
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                Status: {currentUser?.stremioSynced ? (
                  <span style={{ color: '#4caf50' }}>Synced</span>
                ) : (
                  <span style={{ color: '#f44336' }}>Not Synced</span>
                )}
              </Typography>
              {currentUser?.stremioSynced && (
                <Typography variant="body2" color="text.secondary">
                  Your account is synced with Stremio. Any addons assigned to you will automatically appear in your Stremio app.
                </Typography>
              )}
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SyncIcon />}
                onClick={() => setSyncDialogOpen(true)}
              >
                {currentUser?.stremioSynced ? 'Re-sync with Stremio' : 'Sync with Stremio'}
              </Button>
              
              {!currentUser?.stremioSynced && (
                <Button
                  variant="outlined"
                  onClick={() => setRegisterDialogOpen(true)}
                >
                  Register on Stremio
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Stremio Sync Dialog */}
      <Dialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)}>
        <DialogTitle>Sync with Stremio</DialogTitle>
        <Formik
          initialValues={{ stremioEmail: '', stremioPassword: '' }}
          validationSchema={StremioSyncSchema}
          onSubmit={handleStremioSync}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form>
              <DialogContent>
                <Typography variant="body2" paragraph>
                  Enter your Stremio credentials to sync your account. This will allow you to use addons assigned to you in the Stremio app.
                </Typography>
                <Field
                  as={TextField}
                  fullWidth
                  margin="normal"
                  name="stremioEmail"
                  label="Stremio Email"
                  error={touched.stremioEmail && Boolean(errors.stremioEmail)}
                  helperText={touched.stremioEmail && errors.stremioEmail}
                />
                <Field
                  as={TextField}
                  fullWidth
                  margin="normal"
                  name="stremioPassword"
                  label="Stremio Password"
                  type="password"
                  error={touched.stremioPassword && Boolean(errors.stremioPassword)}
                  helperText={touched.stremioPassword && errors.stremioPassword}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Sync'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Stremio Register Dialog */}
      <Dialog open={registerDialogOpen} onClose={() => setRegisterDialogOpen(false)}>
        <DialogTitle>Register on Stremio</DialogTitle>
        <Formik
          initialValues={{ email: '', password: '', confirmPassword: '' }}
          validationSchema={StremioRegisterSchema}
          onSubmit={handleStremioRegister}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form>
              <DialogContent>
                <Typography variant="body2" paragraph>
                  Create a new Stremio account that will be linked to your panel account.
                </Typography>
                <Field
                  as={TextField}
                  fullWidth
                  margin="normal"
                  name="email"
                  label="Email"
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                />
                <Field
                  as={TextField}
                  fullWidth
                  margin="normal"
                  name="password"
                  label="Password"
                  type="password"
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                />
                <Field
                  as={TextField}
                  fullWidth
                  margin="normal"
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                  helperText={touched.confirmPassword && errors.confirmPassword}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setRegisterDialogOpen(false)}>Cancel</Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Register'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </Box>
  );
};

export default Profile;