import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  MenuItem, 
  Select, 
  InputLabel, 
  FormControl,
  Container,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  Fade,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Chip,
  Card,
  CardContent
} from "@mui/material";
import { 
  School as SchoolIcon,
  Category as CategoryIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Grade as GradeIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const CreateGrades = () => {
  const [grade, setGrade] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [existingGrades, setExistingGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDepartments, setFetchingDepartments] = useState(false);
  const [fetchingGrades, setFetchingGrades] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  
  const navigate = useNavigate();

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      setFetchingDepartments(true);
      try {
        const deptSnapshot = await getDocs(collection(db, "categories"));
        const deptList = deptSnapshot.docs
          .map((doc) => ({ id: doc.id, name: doc.data().name }))
          .filter(dept => dept.name && dept.name.trim()); // Filter out empty department names
        setDepartments(deptList);
      } catch (error) {
        console.error("Error fetching departments:", error);
        setNotification({
          open: true,
          message: "Error loading departments: " + error.message,
          severity: "error"
        });
      } finally {
        setFetchingDepartments(false);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch existing grades when department changes
  useEffect(() => {
    const fetchGrades = async () => {
      if (department) {
        setFetchingGrades(true);
        try {
          const q = query(
            collection(db, "grades"), 
            where("department", "==", department)
          );
          const gradesSnapshot = await getDocs(q);
          const gradesList = gradesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
          }));
          setExistingGrades(gradesList);
        } catch (error) {
          console.error("Error fetching grades:", error);
          setNotification({
            open: true,
            message: "Error loading grades: " + error.message,
            severity: "error"
          });
        } finally {
          setFetchingGrades(false);
        }
      } else {
        setExistingGrades([]);
      }
    };

    fetchGrades();
  }, [department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!grade.trim() || !department) {
      setNotification({
        open: true,
        message: "Please fill in all required fields",
        severity: "warning"
      });
      return;
    }
    
    // Check if grade already exists in this department
    if (existingGrades.some(g => g.name.toLowerCase() === grade.toLowerCase())) {
      setNotification({
        open: true,
        message: "This grade already exists in the selected department",
        severity: "error"
      });
      return;
    }
    
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "grades"), { 
        name: grade, 
        department,
        createdAt: new Date()
      });
      
      // Add to local state to update the UI
      setExistingGrades([
        ...existingGrades,
        { id: docRef.id, name: grade }
      ]);
      
      setNotification({
        open: true,
        message: "Grade created successfully!",
        severity: "success"
      });
      
      setGrade("");
    } catch (error) {
      console.error("Error creating grade:", error);
      setNotification({
        open: true,
        message: "Error creating grade: " + error.message,
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
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
          {/* Decorative top border */}
          <Box
            sx={{
              height: "8px",
              width: "100%",
              background: "linear-gradient(90deg, #011E41 0%, #1e3a68 100%)",
            }}
          />
          
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <IconButton 
                onClick={() => navigate("/admin")}
                sx={{ mr: 2, bgcolor: "#f0f3f8" }}
              >
                <ArrowBackIcon />
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
                <GradeIcon sx={{ mr: 1.5 }} fontSize="large" />
                Create Grades
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box
                  component="form"
                  onSubmit={handleSubmit}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    height: "100%",
                  }}
                >
                  <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ mb: 3, color: "#011E41", fontWeight: 500 }}>
                        Add New Grade
                      </Typography>
                      
                      <FormControl fullWidth required sx={{ mb: 2 }} disabled={fetchingDepartments || loading}>
                        <InputLabel>Department</InputLabel>
                        <Select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          startAdornment={
                            <InputAdornment position="start">
                              {fetchingDepartments ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                <CategoryIcon sx={{ color: "#011E41", opacity: 0.7 }} />
                              )}
                            </InputAdornment>
                          }
                        >
                          {departments.map((dept) => (
                            <MenuItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <TextField
                        label="Grade Name"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        required
                        fullWidth
                        disabled={!department || loading}
                        placeholder="e.g. Class 1, Grade 10"
                        sx={{ mb: 3 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SchoolIcon sx={{ color: "#011E41", opacity: 0.7 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                      
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={!department || !grade || loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                        sx={{
                          py: 1.2,
                          bgcolor: "#011E41",
                          color: "#FFFFFF",
                          fontWeight: 500,
                          "&:hover": {
                            bgcolor: "#0a2d50",
                            transform: "translateY(-2px)",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
                          },
                          transition: "all 0.3s ease"
                        }}
                      >
                        {loading ? "Creating..." : "Create Grade"}
                      </Button>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: "#011E41", fontWeight: 500, display: "flex", alignItems: "center" }}>
                      <SchoolIcon sx={{ mr: 1, fontSize: "1.2rem" }} />
                      {department ? `Grades in ${department}` : "Select a Department"}
                    </Typography>
                    
                    {department ? (
                      fetchingGrades ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                          <CircularProgress size={30} sx={{ color: "#011E41" }} />
                        </Box>
                      ) : existingGrades.length > 0 ? (
                        <List dense sx={{ bgcolor: "#fafbfc", borderRadius: 2, maxHeight: "250px", overflow: "auto" }}>
                          {existingGrades.map((g, index) => (
                            <React.Fragment key={g.id}>
                              <ListItem>
                                <ListItemText 
                                  primary={
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                      {g.name}
                                    </Typography>
                                  } 
                                />
                                <Chip 
                                  label="Grade" 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: "#e8f5e9",
                                    color: "#2e7d32",
                                    fontWeight: 500
                                  }} 
                                />
                              </ListItem>
                              {index < existingGrades.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                          ))}
                        </List>
                      ) : (
                        <Alert severity="info" variant="outlined">
                          No grades found for this department
                        </Alert>
                      )
                    ) : (
                      <Box sx={{ p: 3, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                          Please select a department to view its grades
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
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

export default CreateGrades;
