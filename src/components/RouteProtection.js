import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

const RouteProtection = ({ children, requiredRole }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const currentUser = auth.currentUser;
  const userRole = localStorage.getItem('role');
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait briefly to ensure auth state is current
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!currentUser) {
          console.log("No user logged in");
          setAuthorized(false);
          setLoading(false);
          return;
        }
        
        console.log(`User role: ${userRole}, Required role: ${requiredRole}`);
        
        if (userRole === requiredRole) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          console.log(`Unauthorized access: ${userRole} trying to access ${requiredRole} route`);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [currentUser, userRole, requiredRole]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: "#011E41" }} />
      </Box>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (!authorized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 3 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
          <LockIcon sx={{ fontSize: 60, color: '#d32f2f', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
            Access Denied
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You do not have permission to access this area. This section requires {requiredRole} privileges.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              const redirectPath = userRole === 'Admin' ? '/admin' : '/teacher';
              window.location.href = redirectPath;
            }}
            sx={{ mr: 2 }}
          >
            Go to Dashboard
          </Button>
          <Button 
            variant="outlined"
            onClick={() => window.location.href = '/login'}
          >
            Logout
          </Button>
        </Paper>
      </Box>
    );
  }
  
  return children;
};

export default RouteProtection;