import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDocs, updateDoc, query, collection, where } from "firebase/firestore";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Container,
  Paper,
  Divider,
  IconButton,
  InputAdornment,
  Grid,
  Fade,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminIcon,
  School as TeacherIcon,
  Badge as RoleIcon,
  Home as HomeIcon
} from "@mui/icons-material";

const ProfileScreen = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [editable, setEditable] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: ""
  });

  const currentUser = auth.currentUser;
  const navigate = useNavigate();

  // Get initial letters for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  // Fetch user details from Firestore
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        if (!currentUser) {
          console.error("No user is currently logged in.");
          setLoading(false);
          return;
        }

        const email = currentUser.email;
        const role = localStorage.getItem("role");

        const userQuery = query(
          collection(db, `users/usersData/${role === "Admin" ? "admins" : "teachers"}`),
          where("email", "==", email)
        );
        const querySnapshot = await getDocs(userQuery);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          setUserInfo(userData);
          setFormData({
            name: userData.name,
            email: userData.email,
            role: userData.role
          });
        } else {
          console.error("User document does not exist.");
          setNotification({
            open: true,
            message: "Could not find user profile",
            severity: "error"
          });
        }
      } catch (error) {
        console.error("Error fetching user details:", error.message);
        setNotification({
          open: true,
          message: "Error loading profile: " + error.message,
          severity: "error"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [currentUser]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditToggle = () => {
    if (editable) {
      // If we're canceling, reset form data to original user info
      setFormData({
        name: userInfo.name,
        email: userInfo.email,
        role: userInfo.role
      });
    }
    setEditable(!editable);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleUpdateProfile = async () => {
    if (!formData.name.trim()) {
      setNotification({
        open: true,
        message: "Name cannot be empty",
        severity: "error"
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const role = localStorage.getItem("role");
      const email = currentUser.email;

      const userQuery = query(
        collection(db, `users/usersData/${role === "Admin" ? "admins" : "teachers"}`),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(userQuery);

      if (!querySnapshot.empty) {
        const userDocRef = querySnapshot.docs[0].ref;
        await updateDoc(userDocRef, { name: formData.name });
        
        // Update local state
        setUserInfo({
          ...userInfo,
          name: formData.name
        });
        
        setNotification({
          open: true,
          message: "Profile updated successfully!",
          severity: "success"
        });
        
        setEditable(false);
      } else {
        setNotification({
          open: true,
          message: "Error: User document not found",
          severity: "error"
        });
      }
    } catch (error) {
      setNotification({
        open: true,
        message: "Error updating profile: " + error.message,
        severity: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    // Password validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setNotification({
        open: true,
        message: "Please fill out all password fields",
        severity: "warning"
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setNotification({
        open: true,
        message: "New password and confirm password do not match",
        severity: "error"
      });
      return;
    }
    
    if (newPassword.length < 6) {
      setNotification({
        open: true,
        message: "Password must be at least 6 characters long",
        severity: "error"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Re-authenticate the user
      const email = currentUser.email;
      await signInWithEmailAndPassword(auth, email, currentPassword);

      // Update the password
      await updatePassword(currentUser, newPassword);
      
      setNotification({
        open: true,
        message: "Password updated successfully!",
        severity: "success"
      });
      
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setActiveTab(0);
    } catch (error) {
      setNotification({
        open: true,
        message: "Error: " + (error.code === "auth/wrong-password" 
          ? "Current password is incorrect" 
          : error.message),
        severity: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({...notification, open: false});
  };

  const navigateToDashboard = () => {
    const role = localStorage.getItem("role");
    if (role === "Admin") {
      navigate('/admin');
    } else {
      navigate('/teacher');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress sx={{ color: "#011E41" }} />
      </Box>
    );
  }

  if (!userInfo) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Unable to load profile information. Please try logging in again.
        </Alert>
        <Button 
          variant="contained"
          href="/login"
          sx={{
            bgcolor: "#011E41",
            '&:hover': { bgcolor: "#032c5a" }
          }}
        >
          Return to Login
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Fade in={true} timeout={800}>
        <Paper
          elevation={3}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          {/* Profile header */}
          <Box
            sx={{
              bgcolor: "#011E41",
              color: "white",
              p: 4,
              position: "relative",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              gap: 3,
            }}
          >
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: "#f1f8ff",
                color: "#011E41",
                border: "3px solid white",
                fontSize: "2rem",
                fontWeight: "bold",
              }}
            >
              {getInitials(userInfo.name)}
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                  {userInfo.name}
                </Typography>
                
                {/* Add Home Icon Button */}
                <IconButton 
                  onClick={navigateToDashboard}
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    color: 'white', 
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 0.3)' 
                    }
                  }}
                >
                  <HomeIcon />
                </IconButton>
              </Box>
              
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <EmailIcon sx={{ mr: 1, fontSize: "1rem" }} />
                <Typography variant="body1">{userInfo.email}</Typography>
              </Box>
              
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <RoleIcon sx={{ mr: 1, fontSize: "1rem" }} />
                <Chip
                  icon={userInfo.role === "Admin" ? <AdminIcon /> : <TeacherIcon />}
                  label={userInfo.role}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    fontWeight: 500,
                  }}
                  size="small"
                />
              </Box>
            </Box>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label="Profile Details" />
              <Tab label="Security" />
            </Tabs>
          </Box>

          {/* Tab content */}
          <Box sx={{ p: 3 }}>
            {/* Profile Details Tab */}
            {activeTab === 0 && (
              <Fade in={activeTab === 0}>
                <Box>
                  <Grid container spacing={3}>
                    {editable ? (
                      <>
                        <Grid item xs={12}>
                          <TextField
                            label="Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            fullWidth
                            variant="outlined"
                            disabled={submitting}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <PersonIcon sx={{ color: "#011E41" }} />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Email Address"
                            name="email"
                            value={formData.email}
                            fullWidth
                            variant="outlined"
                            disabled={true}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <EmailIcon sx={{ color: "#011E41" }} />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                            Email cannot be changed
                          </Typography>
                        </Grid>

                        <Grid item xs={12}>
                          <Box sx={{ display: "flex", gap: 2 }}>
                            <Button
                              variant="contained"
                              startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                              onClick={handleUpdateProfile}
                              disabled={submitting}
                              sx={{
                                bgcolor: "#4caf50",
                                flex: 1,
                                py: 1.2,
                                "&:hover": { bgcolor: "#388e3c" },
                              }}
                            >
                              {submitting ? "Saving..." : "Save Changes"}
                            </Button>
                            
                            <Button
                              variant="outlined"
                              startIcon={<CancelIcon />}
                              onClick={handleEditToggle}
                              disabled={submitting}
                              sx={{ flex: 1, py: 1.2 }}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Grid>
                      </>
                    ) : (
                      <>
                        <Grid item xs={12}>
                          <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                            <CardContent>
                              <Typography variant="subtitle2" color="text.secondary">
                                Full Name
                              </Typography>
                              <Typography variant="h6" sx={{ mb: 2 }}>
                                {userInfo.name}
                              </Typography>
                              
                              <Typography variant="subtitle2" color="text.secondary">
                                Email Address
                              </Typography>
                              <Typography variant="h6" sx={{ mb: 2 }}>
                                {userInfo.email}
                              </Typography>
                              
                              <Typography variant="subtitle2" color="text.secondary">
                                Role
                              </Typography>
                              <Typography variant="h6">
                                {userInfo.role}
                              </Typography>
                            </CardContent>
                          </Card>
                          
                          <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={handleEditToggle}
                            fullWidth
                            sx={{
                              bgcolor: "#011E41",
                              py: 1.2,
                              "&:hover": {
                                bgcolor: "#032c5a",
                              },
                            }}
                          >
                            Edit Profile
                          </Button>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Box>
              </Fade>
            )}

            {/* Security Tab */}
            {activeTab === 1 && (
              <Fade in={activeTab === 1}>
                <Box>
                  <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 3 }}>
                        Change Password
                      </Typography>
                      
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            label="Current Password"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            fullWidth
                            variant="outlined"
                            disabled={submitting}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LockIcon sx={{ color: "#011E41" }} />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    edge="end"
                                  >
                                    {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            label="New Password"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            fullWidth
                            variant="outlined"
                            disabled={submitting}
                            helperText="Password must be at least 6 characters"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LockIcon sx={{ color: "#011E41" }} />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    edge="end"
                                  >
                                    {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            label="Confirm New Password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            fullWidth
                            variant="outlined"
                            disabled={submitting}
                            error={confirmPassword && newPassword !== confirmPassword}
                            helperText={
                              confirmPassword && newPassword !== confirmPassword
                                ? "Passwords do not match"
                                : ""
                            }
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <LockIcon sx={{ color: "#011E41" }} />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    edge="end"
                                  >
                                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Button
                            variant="contained"
                            onClick={handleChangePassword}
                            disabled={submitting || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            startIcon={submitting ? <CircularProgress size={20} /> : <LockIcon />}
                            fullWidth
                            sx={{
                              bgcolor: "#011E41",
                              py: 1.2,
                              "&:hover": {
                                bgcolor: "#032c5a",
                              },
                            }}
                          >
                            {submitting ? "Updating..." : "Update Password"}
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                  
                  <Alert severity="info" variant="outlined">
                    After changing your password, you'll need to use the new password for future logins.
                  </Alert>
                </Box>
              </Fade>
            )}
          </Box>
        </Paper>
      </Fade>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfileScreen;
