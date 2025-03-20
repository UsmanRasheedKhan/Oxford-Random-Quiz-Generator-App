import React, { useState } from "react";
import { db, auth } from "../../firebase";
import { doc, updateDoc, deleteDoc, query, where, getDocs, collection } from "firebase/firestore";
import {
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Paper,
  Grid,
  IconButton,
  InputAdornment,
  CircularProgress,
  Divider,
  Fade,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Card,
  CardContent,
  Avatar,
  Tooltip,
  RadioGroup,
  Radio,
  FormControlLabel
} from "@mui/material";
import {
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  School as TeacherIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  LockReset as ResetIcon,
  Category as DepartmentIcon,
  MenuBook as SubjectIcon,
  ArrowBack as BackIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const EditUser = () => {
  const [searchType, setSearchType] = useState("email"); // "email" or "name"
  const [searchQuery, setSearchQuery] = useState("");
  const [role, setRole] = useState("Admin");
  const [userData, setUserData] = useState(null);
  const [isChanged, setIsChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // Store multiple search results
  const [showSearchResults, setShowSearchResults] = useState(false); // Control search results display
  
  const loggedInUserEmail = auth.currentUser?.email;
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  // Add email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const fetchUser = async () => {
    // Clear any previous search results
    setSearchResults([]);
    setShowSearchResults(false);
    
    if (!searchQuery || !role) {
      setNotification({
        open: true,
        message: `Please enter a valid ${searchType === "email" ? "email" : "name"} and select a role`,
        severity: "error"
      });
      return;
    }

    // Email validation when searching by email
    if (searchType === "email") {
      if (!isValidEmail(searchQuery)) {
        setNotification({
          open: true,
          message: "Please enter a valid email address",
          severity: "error"
        });
        return;
      }

      if (searchQuery === loggedInUserEmail) {
        setNotification({
          open: true,
          message: "To edit your own details, please go to your profile",
          severity: "warning"
        });
        return;
      }
    }

    setSearchLoading(true);
    try {
      const collectionName = role === "Admin" ? "admins" : "teachers";
      
      // Use different approaches based on search type
      if (searchType === "email") {
        // For email, use exact match (case-sensitive)
        const userQuery = query(
          collection(db, `users/usersData/${collectionName}`),
          where("email", "==", searchQuery)
        );
        
        const querySnapshot = await getDocs(userQuery);
        
        if (!querySnapshot.empty) {
          handleQueryResults(querySnapshot);
        } else {
          handleNoResults();
        }
      } else {
        // For name search, first try exact match
        const exactQuery = query(
          collection(db, `users/usersData/${collectionName}`),
          where("name", "==", searchQuery)
        );
        
        let exactResults = await getDocs(exactQuery);
        
        if (!exactResults.empty) {
          handleQueryResults(exactResults);
        } else {
          // If no exact match, fetch all users and filter on client side
          console.log(`No exact name match found. Performing client-side search in ${collectionName} collection...`);
          
          const allUsersQuery = query(collection(db, `users/usersData/${collectionName}`));
          const allUsersSnapshot = await getDocs(allUsersQuery);
          
          // Filter users whose name contains the search query (case-insensitive)
          const filteredDocs = allUsersSnapshot.docs.filter(doc => {
            const userData = doc.data();
            return userData.name && 
                   userData.name.toLowerCase().includes(searchQuery.toLowerCase());
          });
          
          if (filteredDocs.length > 0) {
            console.log(`Found ${filteredDocs.length} users with name containing "${searchQuery}"`);
            // Create a custom QuerySnapshot-like object
            const customSnapshot = {
              docs: filteredDocs,
              empty: filteredDocs.length === 0
            };
            handleQueryResults(customSnapshot);
          } else {
            handleNoResults();
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setNotification({
        open: true,
        message: "Error fetching user: " + error.message,
        severity: "error"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // Helper function to handle query results
  const handleQueryResults = (querySnapshot) => {
    // For search by email, continue with existing behavior
    if (searchType === "email") {
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      
      // Check if this is the current user
      if (data.email === loggedInUserEmail) {
        setNotification({
          open: true,
          message: "To edit your own details, please go to your profile",
          severity: "warning"
        });
        setUserData(null);
        return;
      }
      
      // Set user data for editing
      setUserData(prepareUserDataForEditing(userDoc));
      setIsChanged(false);
      setShowSearchResults(false); // Hide search results if they were shown
    } 
    // For search by name with multiple results, show the selection list
    else if (querySnapshot.docs.length > 1) {
      console.log(`Found ${querySnapshot.docs.length} users matching "${searchQuery}"`);
      
      // Map documents to a simpler format for the results list
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSearchResults(results);
      setShowSearchResults(true);
      setUserData(null); // Clear any previously selected user
      
      setNotification({
        open: true,
        message: `Found ${querySnapshot.docs.length} users matching "${searchQuery}". Please select a user to edit.`,
        severity: "info"
      });
    }
    // For single result, just show it directly
    else {
      const userDoc = querySnapshot.docs[0];
      setUserData(prepareUserDataForEditing(userDoc));
      setIsChanged(false);
      setShowSearchResults(false);
    }
  };

  // Helper function to prepare user data for editing
  const prepareUserDataForEditing = (userDoc) => {
    const data = userDoc.data();
    return {
      ...data, 
      id: userDoc.id,
      departmentString: Array.isArray(data.department) ? data.department.join(", ") : (data.department || ""),
      gradesString: Array.isArray(data.grades) ? data.grades.join(", ") : "",
      subjectsString: Array.isArray(data.subjects) ? data.subjects.join(", ") : ""
    };
  };

  // Add function to select a user from search results
  const handleSelectUser = (selectedUser) => {
    // Format the user data for editing
    const formattedUserData = {
      ...selectedUser,
      departmentString: Array.isArray(selectedUser.department) ? 
        selectedUser.department.join(", ") : (selectedUser.department || ""),
      gradesString: Array.isArray(selectedUser.grades) ? 
        selectedUser.grades.join(", ") : "",
      subjectsString: Array.isArray(selectedUser.subjects) ? 
        selectedUser.subjects.join(", ") : ""
    };
    
    setUserData(formattedUserData);
    setShowSearchResults(false);
    setIsChanged(false);
  };

  // Helper function to handle no results
  const handleNoResults = () => {
    setNotification({
      open: true,
      message: `No user found with ${searchType === "email" ? 
        "email address" : 
        `name containing "${searchQuery}"`} in the ${role.toLowerCase()} database`,
      severity: "error"
    });
    setUserData(null);
  };

  const handleUpdate = async () => {
    if (!isChanged) {
      setNotification({
        open: true,
        message: "No changes to update",
        severity: "info"
      });
      return;
    }

    setLoading(true);
    try {
      const collectionName = role === "Admin" ? "admins" : "teachers";
      const docRef = doc(db, `users/usersData/${collectionName}/${userData.id}`);
      
      // Prepare update data
      const updateData = {
        name: userData.name
      };
      
      // For teacher role, add the specialized fields
      if (role === "Teacher") {
        // Convert comma-separated strings back to arrays for Firestore
        updateData.department = userData.departmentString ? 
          userData.departmentString.split(",").map(item => item.trim()) : [];
          
        updateData.grades = userData.gradesString ? 
          userData.gradesString.split(",").map(item => item.trim()) : [];
          
        updateData.subjects = userData.subjectsString ? 
          userData.subjectsString.split(",").map(item => item.trim()) : [];
      }
      
      // 1. Update in role-specific collection
      await updateDoc(docRef, updateData);
      
      // 2. Find and update in login database
      const loginQuery = query(
        collection(db, "users", "usersData", "login"),
        where("email", "==", userData.email)
      );
      
      const loginSnapshot = await getDocs(loginQuery);
      if (!loginSnapshot.empty) {
        const loginDocRef = doc(db, "users", "usersData", "login", loginSnapshot.docs[0].id);
        await updateDoc(loginDocRef, {
          name: userData.name
          // Not updating role - that would change user access
        });
      }
      
      setNotification({
        open: true,
        message: "User updated successfully in all databases!",
        severity: "success"
      });
      setIsChanged(false);
    } catch (error) {
      console.error("Error updating user:", error);
      setNotification({
        open: true,
        message: "Error updating user: " + error.message,
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async () => {
    setDeleteDialog(false);
    setLoading(true);
    try {
      // 1. Delete from role-specific collection
      const collectionName = role === "Admin" ? "admins" : "teachers";
      const docRef = doc(db, `users/usersData/${collectionName}/${userData.id}`);
      await deleteDoc(docRef);
      
      // 2. Find and delete from login database
      const loginQuery = query(
        collection(db, "users", "usersData", "login"),
        where("email", "==", userData.email)
      );
      
      const loginSnapshot = await getDocs(loginQuery);
      if (!loginSnapshot.empty) {
        const loginDocRef = doc(db, "users", "usersData", "login", loginSnapshot.docs[0].id);
        await deleteDoc(loginDocRef);
      }
      
      setNotification({
        open: true,
        message: "User deleted from all databases. Note: The authentication account still exists and must be deleted from Firebase Console.",
        severity: "warning"
      });
      
      // Reset form
      setUserData(null);
      setSearchQuery("");
      setRole("Admin");
    } catch (error) {
      console.error("Error deleting user:", error);
      setNotification({
        open: true,
        message: "Error deleting user: " + error.message,
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData({ ...userData, [name]: value });
    setIsChanged(true);
  };

  const handleCloseNotification = () => {
    setNotification({...notification, open: false});
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Fade in={true} timeout={800}>
        <Paper
          elevation={4}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            background: "linear-gradient(to right, #ffffff 0%, #f9fafb 100%)",
          }}
        >
          {/* Paper content */}
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            {/* Header and back button */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <IconButton 
                onClick={() => navigate("/admin")}
                sx={{ mr: 2, bgcolor: "#f0f3f8" }}
              >
                <BackIcon />
              </IconButton>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 600,
                  color: "#011E41",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <EditIcon sx={{ mr: 1.5 }} fontSize="large" />
                Edit User
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4 }} />
            
            {/* Search User Form */}
            <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: "#011E41" }}>
                  Find User
                </Typography>
                
                {/* Add search type radio buttons */}
                <Box sx={{ mb: 2 }}>
                  <FormControl component="fieldset">
                    <RadioGroup
                      row
                      name="searchType"
                      value={searchType}
                      onChange={(e) => {
                        setSearchType(e.target.value);
                        setUserData(null);
                      }}
                    >
                      <FormControlLabel value="email" control={<Radio />} label="Search by Email" />
                      <FormControlLabel value="name" control={<Radio />} label="Search by Name" />
                    </RadioGroup>
                  </FormControl>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={searchType === "email" ? "User Email" : "User Name"}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      required
                      fullWidth
                      error={searchType === "email" && searchQuery && !isValidEmail(searchQuery)}
                      helperText={searchType === "email" && searchQuery && !isValidEmail(searchQuery) ? 
                        "Please enter a valid email address" : ""}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {searchType === "email" ? 
                              <EmailIcon sx={{ color: "#011E41" }} /> : 
                              <PersonIcon sx={{ color: "#011E41" }} />
                            }
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start">
                            {role === "Admin" ? 
                              <AdminIcon sx={{ color: "#011E41" }} /> : 
                              <TeacherIcon sx={{ color: "#011E41" }} />
                            }
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="Admin">Admin</MenuItem>
                        <MenuItem value="Teacher">Teacher</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                  <Button
                    onClick={fetchUser}
                    variant="contained"
                    disabled={!searchQuery || !role || searchLoading}
                    startIcon={searchLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                    sx={{
                      bgcolor: "#011E41",
                      color: "#FFFFFF",
                      px: 4,
                      py: 1.2,
                      "&:hover": {
                        bgcolor: "#032c5a",
                      },
                    }}
                  >
                    {searchLoading ? "Searching..." : "Find User"}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Search Results List */}
            {showSearchResults && searchResults.length > 0 && (
              <Fade in={showSearchResults} timeout={500}>
                <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, color: "#011E41" }}>
                      Search Results ({searchResults.length})
                    </Typography>
                    
                    <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                      {searchResults.map((user) => (
                        <Card 
                          key={user.id} 
                          variant="outlined" 
                          sx={{ 
                            mb: 2, 
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: '#f5f5f5',
                              transform: 'translateY(-2px)',
                              boxShadow: 1
                            }
                          }}
                          onClick={() => handleSelectUser(user)}
                        >
                          <CardContent sx={{ 
                            py: 2,
                            '&:last-child': { pb: 2 } // Override MUI default padding
                          }}>
                            <Grid container alignItems="center" spacing={2}>
                              <Grid item>
                                <Avatar 
                                  sx={{ 
                                    bgcolor: role === "Admin" ? "#1976d2" : "#2e7d32",
                                    width: 45,
                                    height: 45
                                  }}
                                >
                                  {getInitials(user.name)}
                                </Avatar>
                              </Grid>
                              <Grid item xs>
                                <Typography variant="subtitle1" component="div" fontWeight="500">
                                  {user.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {user.email}
                                </Typography>
                                {user.department && (
                                  <Box sx={{ mt: 0.5 }}>
                                    <Chip 
                                      label={Array.isArray(user.department) ? 
                                        user.department.join(', ') : user.department}
                                      size="small"
                                      sx={{ 
                                        bgcolor: '#f1f8e9',
                                        fontWeight: 400,
                                        fontSize: '0.75rem'
                                      }}
                                    />
                                  </Box>
                                )}
                              </Grid>
                              <Grid item>
                                <Button 
                                  variant="outlined" 
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectUser(user);
                                  }}
                                >
                                  Select
                                </Button>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            )}
            
            {/* Rest of the component remains the same */}
            
            {/* User Details Form */}
            {userData && (
              <Fade in={userData !== null} timeout={500}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: role === "Admin" ? "#1976d2" : "#2e7d32",
                          width: 60,
                          height: 60,
                          fontSize: "1.5rem",
                          mr: 2
                        }}
                      >
                        {getInitials(userData.name)}
                      </Avatar>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 500 }}>
                          {userData.name}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                          <Chip 
                            icon={role === "Admin" ? <AdminIcon /> : <TeacherIcon />}
                            label={role}
                            size="small"
                            sx={{ 
                              bgcolor: role === "Admin" ? "#e3f2fd" : "#e8f5e9",
                              color: role === "Admin" ? "#1976d2" : "#2e7d32",
                              mr: 1 
                            }} 
                          />
                          <Typography variant="body2" color="text.secondary">
                            {userData.email}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ mb: 3 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          name="name"
                          label="Full Name"
                          value={userData.name || ""}
                          onChange={handleChange}
                          required
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonIcon sx={{ color: "#011E41" }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      
                      {role === "Teacher" && (
                        <>
                          <Grid item xs={12} md={4}>
                            <TextField
                              name="departmentString"
                              label="Departments"
                              value={userData.departmentString || ""}
                              onChange={handleChange}
                              fullWidth
                              helperText="Separate multiple departments with commas"
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <DepartmentIcon sx={{ color: "#011E41" }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <TextField
                              name="gradesString"
                              label="Grades"
                              value={userData.gradesString || ""}
                              onChange={handleChange}
                              fullWidth
                              helperText="Separate multiple grades with commas"
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <TeacherIcon sx={{ color: "#011E41" }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={4}>
                            <TextField
                              name="subjectsString"
                              label="Subjects"
                              value={userData.subjectsString || ""}
                              onChange={handleChange}
                              fullWidth
                              helperText="Separate multiple subjects with commas"
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SubjectIcon sx={{ color: "#011E41" }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                        </>
                      )}
                    </Grid>
                    
                    <Box 
                      sx={{ 
                        mt: 4, 
                        display: "flex", 
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 2,
                        justifyContent: "space-between" 
                      }}
                    >
                      <Button
                        variant="contained"
                        onClick={handleUpdate}
                        disabled={!isChanged || loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        sx={{
                          bgcolor: "#4caf50",
                          "&:hover": { bgcolor: "#388e3c" },
                          flex: { xs: "1", sm: "initial" },
                          order: { xs: 1, sm: 1 },
                        }}
                      >
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                      
                      <Box 
                        sx={{ 
                          display: "flex", 
                          gap: 2,
                          flexDirection: { xs: "column", sm: "row" },
                          flex: { xs: "1", sm: "initial" },
                          order: { xs: 3, sm: 2 },
                        }}
                      >
                        <Tooltip title="Reset password to 'abc.123'">
                          <Button
                            variant="outlined"
                            onClick={() => setResetDialog(true)}
                            disabled={loading}
                            startIcon={<ResetIcon />}
                            color="primary"
                            sx={{ flex: { xs: "1", sm: "initial" } }}
                          >
                            Reset Password
                          </Button>
                        </Tooltip>
                        
                        <Button
                          variant="contained"
                          onClick={() => setDeleteDialog(true)}
                          disabled={loading}
                          startIcon={<DeleteIcon />}
                          sx={{
                            bgcolor: "#f44336",
                            "&:hover": { bgcolor: "#d32f2f" },
                            flex: { xs: "1", sm: "initial" },
                          }}
                        >
                          Delete User
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            )}
          </Box>
        </Paper>
      </Fade>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <WarningIcon sx={{ color: "#f44336", mr: 1 }} />
          Confirm User Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user? This action will:
            <ul>
              <li>Remove the user data from the database</li>
              <li>This action cannot be undone</li>
            </ul>
            <Alert severity="warning" sx={{ mt: 2 }}>
              Note: This will only delete the user from Firestore. To fully delete the user's authentication account, you must use Firebase Console.
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={deleteUser} 
            variant="contained"
            disabled={loading}
            sx={{ bgcolor: "#f44336", "&:hover": { bgcolor: "#d32f2f" } }}
          >
            {loading ? <CircularProgress size={24} /> : "Delete User Data"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reset Password Confirmation Dialog */}
      <Dialog
        open={resetDialog}
        onClose={() => setResetDialog(false)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <ResetIcon sx={{ color: "#1976d2", mr: 1 }} />
          Password Reset Limitation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Alert severity="info" sx={{ mb: 2 }}>
              Client-side password resets for other users are not supported in Firebase without a backend service.
            </Alert>
            
            To reset user passwords, you have these options:
            <ul>
              <li>Use the Firebase Console (Authentication section)</li>
              <li>Set up Firebase Admin SDK in a server-side application</li>
              <li>Implement Firebase Cloud Functions (recommended)</li>
              <li>Create a custom server endpoint that uses the Admin SDK</li>
            </ul>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetDialog(false)}>
            Understand
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
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

export default EditUser;
