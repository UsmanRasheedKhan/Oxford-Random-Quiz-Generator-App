import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  TextField,
  Button,
  Typography,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  OutlinedInput,
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
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Avatar,
  Chip,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Work as RoleIcon,
  Category as DepartmentIcon,
  School as GradeIcon,
  MenuBook as SubjectIcon,
  ArrowBack as BackIcon,
  PersonAdd as PersonAddIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../../firebase"; // Make sure this path is correct

const CreateUser = () => {
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  const secondaryAuth = getAuth(secondaryApp);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Teacher",
    subjects: [],
    grades: [],
    department: [],
  });

  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [groupedGrades, setGroupedGrades] = useState([]);
  const [groupedSubjects, setGroupedSubjects] = useState([]);
  
  // Added states for better UX
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  
  const navigate = useNavigate();

  // Define steps for stepper
  const steps = ['Basic Information', 'Assign Permissions'];

  // Fetch data from Firestore
  useEffect(() => {
    const fetchCollections = async () => {
      setFetchingData(true);
      try {
        const subjectsSnapshot = await getDocs(collection(db, "subjects"));
        const gradesSnapshot = await getDocs(collection(db, "grades"));
        const departmentsSnapshot = await getDocs(collection(db, "categories"));

        setDepartments(
          departmentsSnapshot.docs
            .map((doc) => doc.data().name)
            .filter(Boolean)
            .sort()
        );
        
        setGrades(gradesSnapshot.docs.map((doc) => doc.data()));
        setSubjects(subjectsSnapshot.docs.map((doc) => doc.data()));
        
      } catch (error) {
        console.error("Error fetching data: ", error);
        setNotification({
          open: true,
          message: "Error loading data: " + error.message,
          severity: "error",
        });
      } finally {
        setFetchingData(false);
      }
    };

    fetchCollections();
  }, []);

  // Update grouped grades when departments are selected
  useEffect(() => {
    if (formData.department.length > 0) {
      const grouped = formData.department.map((dept) => ({
        department: dept,
        grades: grades
          .filter((grade) => grade.department === dept)
          .map((g) => g.name)
          .sort(),
      }));
      setGroupedGrades(grouped);
    } else {
      setGroupedGrades([]);
    }
    
    // Clear selected grades when departments change
    setFormData(prev => ({
      ...prev,
      grades: [],
      subjects: [] // Also clear subjects as they depend on grades
    }));
  }, [formData.department, grades]);

  // Update grouped subjects when grades are selected
  useEffect(() => {
    if (formData.grades.length > 0) {
      const grouped = formData.grades
        .map((compositeGrade) => {
          const [department, gradeName] = compositeGrade.split('|');
          const subjectsForGrade = subjects
            .filter((subject) => 
              subject.grade === gradeName && subject.department === department
            )
            .map((s) => s.name)
            .sort();
          
          return {
            grade: gradeName,
            department: department,
            subjects: subjectsForGrade,
          };
        })
        .filter(group => group.subjects.length > 0);
      
      setGroupedSubjects(grouped);
    } else {
      setGroupedSubjects([]);
      
      // Clear selected subjects when grades change
      setFormData(prev => ({
        ...prev,
        subjects: []
      }));
    }
  }, [formData.grades, subjects]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle multi-select dropdown changes
  const handleMultipleSelectChange = (name) => (event) => {
    const { value } = event.target;
    setFormData({
      ...formData,
      [name]: typeof value === "string" ? value.split(",") : value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Validate form data
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setNotification({
        open: true,
        message: "Please fill in all required fields",
        severity: "error"
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setNotification({
        open: true,
        message: "Please enter a valid email address",
        severity: "error"
      });
      return;
    }
    
    // Validate password length
    if (formData.password.length < 6) {
      setNotification({
        open: true,
        message: "Password must be at least 6 characters long",
        severity: "error"
      });
      return;
    }
    
    // Validate teacher-specific fields
    if (formData.role === "Teacher" && 
        (formData.department.length === 0 || 
         formData.grades.length === 0 || 
         formData.subjects.length === 0)) {
      setNotification({
        open: true,
        message: "Teachers must have assigned departments, grades, and subjects",
        severity: "error"
      });
      return;
    }
    
    setLoading(true);
    try {
      // Use secondaryAuth instead of auth for creating users
      const authUser = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );

      // Sign out from secondary app immediately to prevent any session issues
      await secondaryAuth.signOut();

      const collectionName = formData.role === "Admin" ? "admins" : "teachers";

      const userData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        uid: authUser.user.uid,
        createdAt: new Date()
      };
      
      if (formData.role === "Teacher") {
        userData.department = formData.department;
        userData.grades = formData.grades;
        userData.subjects = formData.subjects;
      }

      // Add user to the role-specific collection
      await addDoc(collection(db, `users/usersData/${collectionName}`), userData);
      
      // ADD THIS CODE: Create login entry with role information
      await addDoc(collection(db, "users", "usersData", "login"), {
        email: formData.email,
        role: formData.role.toLowerCase(), // Store as lowercase for consistency
        name: formData.name,
        uid: authUser.user.uid,
        createdAt: new Date()
      });

      setNotification({
        open: true,
        message: `${formData.role} account created successfully!`,
        severity: "success"
      });
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "Teacher",
        subjects: [],
        grades: [],
        department: [],
      });
      
      setActiveStep(0);
    } catch (error) {
      console.error("Error creating user:", error);
      setNotification({
        open: true,
        message: "Error creating user: " + error.message,
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle stepper navigation
  const handleNext = () => {
    // Validate first step
    if (activeStep === 0) {
      if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
        setNotification({
          open: true,
          message: "Please fill in all required fields",
          severity: "error"
        });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setNotification({
          open: true,
          message: "Please enter a valid email address",
          severity: "error"
        });
        return;
      }
      
      // Validate password length
      if (formData.password.length < 6) {
        setNotification({
          open: true,
          message: "Password must be at least 6 characters long",
          severity: "error"
        });
        return;
      }
    }
    
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  // Get initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  // Render different form steps
  const renderFormStep = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
                fullWidth
                variant="outlined"
                disabled={loading}
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
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                fullWidth
                variant="outlined"
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: "#011E41" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                fullWidth
                variant="outlined"
                disabled={loading}
                helperText="Password must be at least 6 characters"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#011E41" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={loading}
                  startAdornment={
                    <InputAdornment position="start">
                      <RoleIcon sx={{ color: "#011E41" }} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="Admin">Admin</MenuItem>
                  <MenuItem value="Teacher">Teacher</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );
        
      case 1:
        if (formData.role === "Admin") {
          return (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>
                Admin User
              </Typography>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: "#011E41", 
                  fontSize: 32,
                  mx: "auto",
                  mb: 2
                }}
              >
                {getInitials(formData.name)}
              </Avatar>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {formData.name}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                {formData.email}
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Admin users have full access to the system
              </Alert>
            </Box>
          );
        }
        
        return (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth disabled={loading || fetchingData}>
                  <InputLabel>Departments</InputLabel>
                  <Select
                    name="department"
                    multiple
                    value={formData.department}
                    onChange={handleMultipleSelectChange("department")}
                    input={<OutlinedInput label="Departments" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            sx={{ bgcolor: "#e3f2fd", color: "#0277bd" }}
                          />
                        ))}
                      </Box>
                    )}
                    startAdornment={
                      <InputAdornment position="start">
                        <DepartmentIcon sx={{ color: "#011E41" }} />
                      </InputAdornment>
                    }
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300
                        }
                      }
                    }}
                  >
                    {departments.map((dept, index) => (
                      <MenuItem key={index} value={dept}>
                        <Checkbox checked={formData.department.includes(dept)} />
                        <ListItemText primary={dept} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl 
                  fullWidth 
                  disabled={loading || fetchingData || formData.department.length === 0}
                >
                  <InputLabel>Grades</InputLabel>
                  <Select
                    name="grades"
                    multiple
                    value={formData.grades}
                    onChange={handleMultipleSelectChange("grades")}
                    input={<OutlinedInput label="Grades" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const gradeName = value.split('|')[1];
                          return (
                            <Chip 
                              key={value} 
                              label={gradeName}
                              size="small"
                              sx={{ bgcolor: "#e8f5e9", color: "#2e7d32" }}
                            />
                          );
                        })}
                      </Box>
                    )}
                    startAdornment={
                      <InputAdornment position="start">
                        <GradeIcon sx={{ color: "#011E41" }} />
                      </InputAdornment>
                    }
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300
                        }
                      }
                    }}
                  >
                    {groupedGrades.map((group, groupIndex) => [
                      <MenuItem 
                        key={`header-${group.department}`} 
                        disabled 
                        sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}
                      >
                        {group.department}
                      </MenuItem>,
                      ...group.grades.map((grade, gradeIndex) => {
                        const compositeValue = `${group.department}|${grade}`;
                        return (
                          <MenuItem 
                            key={`grade-${compositeValue}-${gradeIndex}`} 
                            value={compositeValue}
                            sx={{ pl: 4 }}
                          >
                            <Checkbox checked={formData.grades.indexOf(compositeValue) > -1} />
                            <ListItemText primary={grade} />
                          </MenuItem>
                        );
                      })
                    ]).flat()}
                  </Select>
                </FormControl>
                
                {formData.department.length > 0 && groupedGrades.length === 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No grades available for selected departments
                  </Alert>
                )}
              </Grid>
              
              <Grid item xs={12}>
                <FormControl 
                  fullWidth 
                  disabled={loading || fetchingData || formData.grades.length === 0}
                >
                  <InputLabel>Subjects</InputLabel>
                  <Select
                    name="subjects"
                    multiple
                    value={formData.subjects}
                    onChange={handleMultipleSelectChange("subjects")}
                    input={<OutlinedInput label="Subjects" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value}
                            size="small"
                            sx={{ bgcolor: "#fff3e0", color: "#e65100" }}
                          />
                        ))}
                      </Box>
                    )}
                    startAdornment={
                      <InputAdornment position="start">
                        <SubjectIcon sx={{ color: "#011E41" }} />
                      </InputAdornment>
                    }
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300
                        }
                      }
                    }}
                  >
                    {groupedSubjects.map((group, groupIndex) => [
                      <MenuItem 
                        key={`header-${group.grade}-${groupIndex}`} 
                        disabled 
                        sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}
                      >
                        {`${group.grade} (${group.department})`}
                      </MenuItem>,
                      ...group.subjects.map((subject, subjectIndex) => (
                        <MenuItem 
                          key={`subject-${group.grade}-${subjectIndex}`} 
                          value={subject}
                          sx={{ pl: 4 }}
                        >
                          <Checkbox checked={formData.subjects.indexOf(subject) > -1} />
                          <ListItemText primary={subject} />
                        </MenuItem>
                      ))
                    ]).flat()}
                  </Select>
                </FormControl>
                
                {formData.grades.length > 0 && groupedSubjects.length === 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No subjects available for selected grades
                  </Alert>
                )}
              </Grid>
            </Grid>
            
            {/* Preview Teacher Card */}
            {formData.department.length > 0 && formData.grades.length > 0 && (
              <Card variant="outlined" sx={{ mt: 3, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Avatar sx={{ bgcolor: "#011E41", mr: 2 }}>
                      {getInitials(formData.name)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{formData.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formData.email}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <DepartmentIcon 
                      fontSize="small" 
                      sx={{ verticalAlign: "middle", mr: 1, color: "#0277bd" }} 
                    />
                    <strong>Departments:</strong> {formData.department.join(", ")}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <GradeIcon 
                      fontSize="small" 
                      sx={{ verticalAlign: "middle", mr: 1, color: "#2e7d32" }} 
                    />
                    <strong>Grades:</strong> {formData.grades.map(g => g.split('|')[1]).join(", ")}
                  </Typography>
                  
                  <Typography variant="body2">
                    <SubjectIcon 
                      fontSize="small" 
                      sx={{ verticalAlign: "middle", mr: 1, color: "#e65100" }} 
                    />
                    <strong>Subjects:</strong> {formData.subjects.join(", ")}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </>
        );
        
      default:
        return null;
    }
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
                <PersonAddIcon sx={{ mr: 1.5 }} fontSize="large" />
                Create New User
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4 }} />
            
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            <Box component="form" onSubmit={(e) => e.preventDefault()}>
              {renderFormStep(activeStep)}
              
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  disabled={activeStep === 0 || loading}
                >
                  Back
                </Button>
                
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    sx={{
                      bgcolor: "#011E41",
                      "&:hover": {
                        bgcolor: "#0a2d50",
                      },
                    }}
                  >
                    {loading ? "Creating..." : "Create User"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={loading}
                    sx={{
                      bgcolor: "#011E41",
                      "&:hover": {
                        bgcolor: "#0a2d50",
                      },
                    }}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
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
      
      {fetchingData && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255,255,255,0.7)",
            zIndex: 1300,
          }}
        >
          <CircularProgress sx={{ color: "#011E41" }} />
        </Box>
      )}
    </Container>
  );
};

export default CreateUser;