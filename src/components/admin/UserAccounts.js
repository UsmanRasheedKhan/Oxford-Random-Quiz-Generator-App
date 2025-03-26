import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { db } from '../../firebase';
import { collection, query, getDocs, doc, deleteDoc, where } from 'firebase/firestore';

const UserAccounts = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get all users from the users/usersData/login collection
      const loginRef = collection(db, 'users', 'usersData', 'login');
      const loginSnapshot = await getDocs(loginRef);
      
      // Get teachers and admins separately to include their additional details
      const teachersRef = collection(db, 'users', 'usersData', 'teachers');
      const teachersSnapshot = await getDocs(teachersRef);
      const teachersData = teachersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        role: 'teacher'
      }));
      
      const adminsRef = collection(db, 'users', 'usersData', 'admins');
      const adminsSnapshot = await getDocs(adminsRef);
      const adminsData = adminsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        role: 'admin'
      }));
      
      // Combine login data with role-specific data
      const loginData = loginSnapshot.docs.map(doc => {
        const userData = doc.data();
        const email = userData.email;
        
        // Look for matching teacher or admin data
        const teacherMatch = teachersData.find(t => t.email === email);
        const adminMatch = adminsData.find(a => a.email === email);
        
        // Determine role and get additional data
        let role = 'unknown';
        let additionalData = {};
        
        if (teacherMatch) {
          role = 'teacher';
          additionalData = teacherMatch;
        } else if (adminMatch) {
          role = 'admin';
          additionalData = adminMatch;
        }
        
        return {
          id: doc.id,
          ...userData,
          role,
          ...additionalData
        };
      });
      
      setUsers(loginData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users: ' + err.message);
      setLoading(false);
    }
  };
  
  // Filter users based on selected filter and search term
  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter;
    const matchesSearch = searchTerm === '' || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });
  
  // Handle delete user
  const handleDeleteUser = async (userId, userEmail) => {
    try {
      setLoading(true);
      
      // Delete from login collection
      await deleteDoc(doc(db, 'users', 'usersData', 'login', userId));
      
      // Determine if user is teacher or admin and delete from respective collection
      const userToDelete = users.find(user => user.id === userId);
      if (userToDelete.role === 'teacher') {
        // Find the teacher document by email
        const teachersRef = collection(db, 'users', 'usersData', 'teachers');
        const teacherQuery = query(teachersRef, where('email', '==', userEmail));
        const teacherSnapshot = await getDocs(teacherQuery);
        
        if (!teacherSnapshot.empty) {
          await deleteDoc(doc(db, 'users', 'usersData', 'teachers', teacherSnapshot.docs[0].id));
        }
      } else if (userToDelete.role === 'admin') {
        // Find the admin document by email
        const adminsRef = collection(db, 'users', 'usersData', 'admins');
        const adminQuery = query(adminsRef, where('email', '==', userEmail));
        const adminSnapshot = await getDocs(adminQuery);
        
        if (!adminSnapshot.empty) {
          await deleteDoc(doc(db, 'users', 'usersData', 'admins', adminSnapshot.docs[0].id));
        }
      }
      
      // Refresh the user list
      await fetchUsers();
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user: ' + err.message);
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/admin')} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: '#011E41' }}>
            User Accounts
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Filter and Search Controls */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterIcon sx={{ color: 'text.secondary', mr: 1 }} />
            <Typography variant="subtitle2" sx={{ mr: 2 }}>Filter by Role:</Typography>
            <RadioGroup
              row
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <FormControlLabel value="all" control={<Radio color="primary" />} label="All" />
              <FormControlLabel value="admin" control={<Radio color="primary" />} label="Admins" />
              <FormControlLabel value="teacher" control={<Radio color="primary" />} label="Teachers" />
            </RadioGroup>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <TextField
            placeholder="Search by name or email"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 250 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
          >
            Refresh
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {filteredUsers.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>{user.name || 'Not specified'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            {user.email}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role === 'admin' ? 'Admin' : 'Teacher'} 
                            color={user.role === 'admin' ? 'primary' : 'success'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit User">
                            <IconButton 
                              size="small"
                              color="primary"
                              onClick={() => navigate('/edit-user', { state: { user } })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton 
                              size="small"
                              color="error"
                              onClick={() => setConfirmDelete({ id: user.id, email: user.email, name: user.name || user.email })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No users found matching the selected criteria.</Alert>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredUsers.length} of {users.length} users
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/create-user')}
              >
                Add New User
              </Button>
            </Box>
          </>
        )}
      </Paper>
      
      {/* Confirmation Dialog for Delete */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the user <strong>{confirmDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone. The user will lose all access to the system.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button 
            color="error" 
            variant="contained" 
            onClick={() => handleDeleteUser(confirmDelete?.id, confirmDelete?.email)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserAccounts;