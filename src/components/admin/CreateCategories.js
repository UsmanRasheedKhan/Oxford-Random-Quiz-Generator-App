// CreateCategories.js
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Paper,
  Container,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Fade,
  Grow,
  Snackbar,
  Alert,
  Chip
} from "@mui/material";
import { 
  Category as CategoryIcon, 
  Add as AddIcon,
  ArrowBack as BackIcon,
  School as SchoolIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const CreateCategories = () => {
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingCategories, setExistingCategories] = useState([]);
  const [fetchingCategories, setFetchingCategories] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  
  const navigate = useNavigate();

  // Fetch existing categories for display
  useEffect(() => {
    const fetchCategories = async () => {
      setFetchingCategories(true);
      try {
        const categoriesSnapshot = await getDocs(collection(db, "categories"));
        const categoriesList = [];
        categoriesSnapshot.forEach(doc => {
          if (doc.data().name && doc.data().name.trim()) {
            categoriesList.push({
              id: doc.id,
              name: doc.data().name
            });
          }
        });
        setExistingCategories(categoriesList);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setNotification({
          open: true,
          message: "Error loading existing categories: " + error.message,
          severity: "error"
        });
      } finally {
        setFetchingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category.trim()) {
      setNotification({
        open: true,
        message: "Please enter a category name",
        severity: "warning"
      });
      return;
    }
    
    // Check if category already exists
    if (existingCategories.some(cat => cat.name.toLowerCase() === category.toLowerCase())) {
      setNotification({
        open: true,
        message: "This category already exists",
        severity: "error"
      });
      return;
    }
    
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "categories"), { 
        name: category,
        createdAt: new Date() 
      });
      
      // Add the new category to the list
      setExistingCategories([
        ...existingCategories, 
        { id: docRef.id, name: category }
      ]);
      
      setNotification({
        open: true,
        message: "Category created successfully!",
        severity: "success"
      });
      setCategory("");
    } catch (error) {
      console.error("Error creating category:", error);
      setNotification({
        open: true,
        message: "Error creating category: " + error.message,
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
                <CategoryIcon sx={{ mr: 1.5 }} fontSize="large" />
                Create Department
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4 }} />

            <Box 
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 2,
                alignItems: { xs: "stretch", md: "flex-start" },
                mb: 4
              }}
            >
              <TextField
                label="Department Name"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                fullWidth
                variant="outlined"
                placeholder="e.g. Science, Arts, Commerce"
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SchoolIcon sx={{ color: "#011E41", opacity: 0.7 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1 }}
              />
              
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                sx={{
                  bgcolor: "#011E41",
                  color: "#FFFFFF",
                  py: { xs: 1.5, md: 1.9 },
                  px: 3,
                  fontWeight: 500,
                  alignSelf: { xs: "stretch", md: "center" },
                  minWidth: { xs: "100%", md: "140px" },
                  "&:hover": {
                    bgcolor: "#0a2d50",
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                {loading ? "Creating..." : "Create"}
              </Button>
            </Box>
            
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2, 
                color: "#011E41",
                display: "flex",
                alignItems: "center"
              }}
            >
              <CategoryIcon sx={{ mr: 1, fontSize: "1.2rem" }} />
              Existing Departments
            </Typography>
            
            <Paper 
              variant="outlined" 
              sx={{ 
                borderRadius: 2, 
                maxHeight: "250px", 
                overflow: "auto",
                bgcolor: "#fafbfc"
              }}
            >
              {fetchingCategories ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={30} sx={{ color: "#011E41" }} />
                </Box>
              ) : existingCategories.length > 0 ? (
                <List dense>
                  {existingCategories.map((cat, index) => (
                    <React.Fragment key={cat.id}>
                      <ListItem>
                        <ListItemText 
                          primary={
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {cat.name}
                            </Typography>
                          } 
                        />
                        <Chip 
                          label="Department" 
                          size="small" 
                          sx={{ 
                            bgcolor: "#e3f2fd",
                            color: "#0277bd",
                            fontWeight: 500
                          }} 
                        />
                      </ListItem>
                      {index < existingCategories.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    No departments found
                  </Typography>
                </Box>
              )}
            </Paper>
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

export default CreateCategories;
