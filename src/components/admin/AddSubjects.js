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
} from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import SchoolIcon from "@mui/icons-material/School";
import SubjectIcon from "@mui/icons-material/Subject";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

const AddSubjects = () => {
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [grades, setGrades] = useState([]);
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  
  // Add these states for better UX
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
        const departmentsSnapshot = await getDocs(collection(db, "categories"));
        const departmentList = departmentsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }))
          .filter(dept => dept.name && dept.name.trim()); // Filter out empty department names
        
        setDepartments(departmentList);
      } catch (error) {
        console.error("Error fetching departments: ", error);
        setNotification({
          open: true,
          message: "Failed to load departments: " + error.message,
          severity: "error"
        });
      } finally {
        setFetchingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch grades dynamically based on selected department
  useEffect(() => {
    const fetchGrades = async () => {
      if (department) {
        setFetchingGrades(true);
        setGrade(""); // Reset grade when department changes
        
        try {
          const gradeQuery = query(
            collection(db, "grades"),
            where("department", "==", department)
          );
          const gradeSnapshot = await getDocs(gradeQuery);
          const gradeList = gradeSnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }));
          setGrades(gradeList);
        } catch (error) {
          console.error("Error fetching grades: ", error);
          setNotification({
            open: true,
            message: "Failed to load grades: " + error.message,
            severity: "error"
          });
        } finally {
          setFetchingGrades(false);
        }
      } else {
        setGrades([]);
      }
    };

    if (department) {
      fetchGrades();
    }
  }, [department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Add the subject to Firestore
      await addDoc(collection(db, "subjects"), {
        name: subject,
        grade,
        department,
        createdAt: new Date()
      });
      
      setNotification({
        open: true,
        message: "Subject added successfully!",
        severity: "success"
      });
      
      // Reset form after successful submission
      setSubject("");
      setGrade("");
      setDepartment("");
    } catch (error) {
      console.error("Error adding subject: ", error);
      setNotification({
        open: true,
        message: "Error adding subject: " + error.message,
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
          elevation={3}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              bgcolor: "#011E41",
              py: 2,
              px: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <Typography variant="h5" sx={{ color: "white", fontWeight: "500" }}>
              Add Subjects
            </Typography>
            <IconButton 
              onClick={() => navigate("/admin")}
              sx={{ color: "white" }}
              aria-label="back to dashboard"
            >
              <ArrowBackIcon />
            </IconButton>
          </Box>

          <Box sx={{ p: 3 }}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={fetchingDepartments || loading}
                      startAdornment={
                        <InputAdornment position="start">
                          {fetchingDepartments ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <CategoryIcon />
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
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Grade</InputLabel>
                    <Select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      disabled={!department || fetchingGrades || loading}
                      startAdornment={
                        <InputAdornment position="start">
                          {fetchingGrades ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <SchoolIcon />
                          )}
                        </InputAdornment>
                      }
                    >
                      {grades.map((g) => (
                        <MenuItem key={g.id} value={g.name}>
                          {g.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {department && grades.length === 0 && !fetchingGrades && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      No grades found for this department
                    </Alert>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Subject Name"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    fullWidth
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SubjectIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!department || !grade || !subject || loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                  sx={{
                    bgcolor: "#011E41",
                    color: "#FFFFFF",
                    py: 1.2,
                    px: 4,
                    fontWeight: 500,
                    "&:hover": {
                      bgcolor: "#032c5a",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  {loading ? "Adding..." : "Add Subject"}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Fade>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AddSubjects;
