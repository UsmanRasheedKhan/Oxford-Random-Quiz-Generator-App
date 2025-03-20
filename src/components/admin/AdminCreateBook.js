import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Stepper, 
  Step, 
  StepLabel,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Snackbar,
  CircularProgress
} from "@mui/material";
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  ExpandMore as ExpandMoreIcon,
  MenuBook as BookIcon,
  LibraryBooks as ChapterIcon,
  Topic as TopicIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { collection, doc, setDoc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../../firebase"; // Adjust path as needed

const AdminCreateBook = () => {  // Changed component name
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  
  // Admin data
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Department and grade data
  const [departments, setDepartments] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [filteredGrades, setFilteredGrades] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    grade: "",
    department: "",
    bookName: "",
    chapters: []
  });
  
  // Active entities
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  
  // New entity inputs
  const [newChapterName, setNewChapterName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  
  // Steps for the stepper - removed "Create Questions" step
  const steps = ['Select Department & Grade', 'Add Chapters', 'Add Topics', 'Review & Publish'];
  
  // Get current user and fetch data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("Current admin user:", user);
        setCurrentUser(user);
        fetchDepartmentsAndGrades(); // Fetch all departments and grades
      } else {
        navigate("/login");
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);
  
  // Update the fetchDepartmentsAndGrades function to filter out departments with empty names
const fetchDepartmentsAndGrades = async () => {
  try {
    setLoading(true);
    
    // Fetch departments from categories collection with their display names
    const departmentsSnapshot = await getDocs(collection(db, "categories"));
    const departmentsList = [];
    departmentsSnapshot.forEach(doc => {
      // Only add departments with non-empty names
      const name = doc.data().name;
      if (name && name.trim()) {
        departmentsList.push({
          id: doc.id,
          name: name
        });
      }
    });
    setDepartments(departmentsList);
    console.log("Fetched departments from categories:", departmentsList);
    
    // Fetch all grades with verbose logging
    const gradesSnapshot = await getDocs(collection(db, "grades"));
    const gradesData = [];
    gradesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Grade document ${doc.id}:`, data);
      
      gradesData.push({
        id: doc.id,
        name: data.name || "Unnamed Grade",
        department: data.department
      });
    });
    setAllGrades(gradesData);
    console.log("All grades fetched:", gradesData);
    
    setLoading(false);
  } catch (error) {
    console.error("Error fetching departments and grades:", error);
    setToast({
      open: true,
      message: "Failed to load departments and grades: " + error.message,
      severity: "error"
    });
    setLoading(false);
  }
};
  
  // Enhanced debug logging in the grade filtering effect
useEffect(() => {
  if (formData.department) {
    // Get selected department name from the department ID
    const selectedDepartment = departments.find(d => d.id === formData.department);
    
    if (selectedDepartment) {
      console.log("Filtering grades for department:", selectedDepartment.name);
      
      // Filter grades by department NAME instead of ID
      const filtered = allGrades.filter(grade => {
        const matches = grade.department === selectedDepartment.name;
        console.log(`Grade ${grade.name} with department "${grade.department}" matches "${selectedDepartment.name}": ${matches}`);
        return matches;
      }).map(grade => ({
        id: grade.id,
        name: grade.name
      }));
      
      console.log(`Found ${filtered.length} matching grades:`, filtered);
      setFilteredGrades(filtered);
      
      // Reset grade selection
      setFormData({
        ...formData,
        grade: ""
      });
    }
  } else {
    setFilteredGrades([]);
  }
}, [formData.department, allGrades, departments]);
  
  // Generic handler for form inputs
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Add new chapter
  const addChapter = () => {
    if (!newChapterName.trim()) {
      setToast({
        open: true,
        message: "Chapter name cannot be empty",
        severity: "error"
      });
      return;
    }
    
    // Check for duplicates
    if (formData.chapters.some(chapter => chapter.name === newChapterName)) {
      setToast({
        open: true,
        message: "Chapter already exists",
        severity: "error"
      });
      return;
    }
    
    setFormData({
      ...formData,
      chapters: [
        ...formData.chapters,
        {
          name: newChapterName,
          topics: []
        }
      ]
    });
    
    setNewChapterName("");
    setToast({
      open: true,
      message: "Chapter added successfully",
      severity: "success"
    });
  };
  
  // Delete chapter
  const deleteChapter = (index) => {
    const updatedChapters = [...formData.chapters];
    updatedChapters.splice(index, 1);
    
    setFormData({
      ...formData,
      chapters: updatedChapters
    });
    
    if (activeChapter === index) {
      setActiveChapter(null);
      setActiveTopic(null);
    } else if (activeChapter > index) {
      setActiveChapter(activeChapter - 1);
    }
    
    setToast({
      open: true,
      message: "Chapter deleted successfully",
      severity: "success"
    });
  };
  
  // Add new topic to a chapter
  const addTopic = () => {
    if (!newTopicName.trim()) {
      setToast({
        open: true,
        message: "Topic name cannot be empty",
        severity: "error"
      });
      return;
    }
    
    if (!activeChapter && formData.chapters.length > 0) {
      setActiveChapter(0);
    }
    
    if (activeChapter === null) {
      setToast({
        open: true,
        message: "Please select a chapter first",
        severity: "error"
      });
      return;
    }
    
    // Check for duplicates
    if (formData.chapters[activeChapter].topics.some(topic => topic.name === newTopicName)) {
      setToast({
        open: true,
        message: "Topic already exists in this chapter",
        severity: "error"
      });
      return;
    }
    
    const updatedChapters = [...formData.chapters];
    updatedChapters[activeChapter].topics.push({
      name: newTopicName
    });
    
    setFormData({
      ...formData,
      chapters: updatedChapters
    });
    
    setNewTopicName("");
    setToast({
      open: true,
      message: "Topic added successfully",
      severity: "success"
    });
  };
  
  // Delete topic
  const deleteTopic = (index) => {
    const updatedChapters = [...formData.chapters];
    updatedChapters[activeChapter].topics.splice(index, 1);
    
    setFormData({
      ...formData,
      chapters: updatedChapters
    });
    
    if (activeTopic === index) {
      setActiveTopic(null);
    } else if (activeTopic > index) {
      setActiveTopic(activeTopic - 1);
    }
    
    setToast({
      open: true,
      message: "Topic deleted successfully",
      severity: "success"
    });
  };
  
  // Navigate stepper
  const handleNext = () => {
    // Validate current step
    if (activeStep === 0) {
      if (!formData.grade || !formData.department || !formData.bookName.trim()) {
        setToast({
          open: true,
          message: "Please fill all the fields",
          severity: "error"
        });
        return;
      }
    } else if (activeStep === 1) {
      if (formData.chapters.length === 0) {
        setToast({
          open: true,
          message: "Please add at least one chapter",
          severity: "error"
        });
        return;
      }
    } else if (activeStep === 2) {
      if (!activeChapter && formData.chapters.length > 0) {
        setActiveChapter(0);
      }
      
      // Check if all chapters have at least one topic
      const chaptersWithoutTopics = formData.chapters.filter(chapter => 
        chapter.topics.length === 0
      );
      
      if (chaptersWithoutTopics.length > 0) {
        setToast({
          open: true,
          message: `Please add at least one topic to each chapter. ${chaptersWithoutTopics.length} chapter(s) without topics.`,
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
  
  // Save everything to Firebase with the new structure
  // Update saveToFirebase to use department name instead of ID where needed
const saveToFirebase = async () => {
  try {
    setLoading(true);
    
    // Get the department name for the selected ID
    const selectedDepartment = departments.find(d => d.id === formData.department);
    if (!selectedDepartment) {
      throw new Error("Selected department not found");
    }
    
    // Get the grade name for the selected ID
    const selectedGrade = filteredGrades.find(g => g.id === formData.grade);
    if (!selectedGrade) {
      throw new Error("Selected grade not found");
    }
    
    // Format names for use in paths (use sanitized values)
    const bookId = formData.bookName.replace(/\s+/g, '_');
    const departmentId = selectedDepartment.name.replace(/\s+/g, '_');  // Use name instead of ID
    const gradeId = selectedGrade.name.replace(/\s+/g, '_');  // Use name instead of ID
    
    console.log("Creating book with details:", {
      department: departmentId,
      departmentName: selectedDepartment.name,
      grade: gradeId,
      gradeName: selectedGrade.name,
      bookName: bookId
    });
    
    // Continue with the rest of the function using departmentId and gradeId
    // (which are now based on names, not IDs)
    
    // 1. Create department document if it doesn't exist
    const departmentRef = doc(db, "books", departmentId);
    
    // Check if department exists, if not create it
    const departmentDoc = await getDoc(departmentRef);
    if (!departmentDoc.exists()) {
      await setDoc(departmentRef, {
        name: selectedDepartment.name,
        createdAt: new Date()
      });
      console.log(`Created department: ${departmentId}`);
    }
    
    // 2. Create grade document in department's grades subcollection
    const gradeRef = doc(db, "books", departmentId, "grades", gradeId);
    
    // Check if grade exists, if not create it
    const gradeDoc = await getDoc(gradeRef);
    if (!gradeDoc.exists()) {
      await setDoc(gradeRef, {
        name: selectedGrade.name,
        createdAt: new Date()
      });
      console.log(`Created grade: ${gradeId} in department: ${departmentId}`);
    }
    
    // 3. Create book document in grade's books subcollection
    const bookRef = doc(db, "books", departmentId, "grades", gradeId, "books", bookId);
    
    await setDoc(bookRef, {
      name: formData.bookName,
      createdBy: currentUser.uid,
      createdByEmail: currentUser.email,
      createdAt: new Date(),
      chaptersCount: formData.chapters.length
    });
    
    console.log(`Created book: ${bookId} in grade: ${gradeId}, department: ${departmentId}`);
    
    // 4. Create chapters and topics
    for (const chapter of formData.chapters) {
      const chapterID = chapter.name.replace(/\s+/g, '_');
      const chapterRef = doc(db, "books", departmentId, "grades", gradeId, "books", bookId, "chapters", chapterID);
      
      await setDoc(chapterRef, {
        name: chapter.name,
        order: formData.chapters.indexOf(chapter),
        topicsCount: chapter.topics.length
      });
      
      console.log(`Created chapter: ${chapterID} in book: ${bookId}`);
      
      // Add topics to this chapter
      for (const topic of chapter.topics) {
        const topicID = topic.name.replace(/\s+/g, '_');
        const topicRef = doc(db, "books", departmentId, "grades", gradeId, "books", bookId, "chapters", chapterID, "topics", topicID);
        
        await setDoc(topicRef, {
          name: topic.name,
          order: chapter.topics.indexOf(topic)
        });
        
        console.log(`Created topic: ${topicID} in chapter: ${chapterID}`);
      }
    }
    
    setLoading(false);
    console.log("Book published successfully!");
    
    setToast({
      open: true,
      message: "Book published successfully!",
      severity: "success"
    });
    
    // Reset form and redirect to admin dashboard
    setTimeout(() => {
      navigate("/admin");  // Changed to redirect to admin dashboard
    }, 2000);
    
  } catch (error) {
    setLoading(false);
    console.error("Error publishing book:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    setToast({
      open: true,
      message: "Error publishing book: " + error.message,
      severity: "error"
    });
  }
};
  
  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };
  
  // Render different steps
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="department-label">Department</InputLabel>
                  <Select
                    labelId="department-label"
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                  >
                    {departments.map((department) => (
                      <MenuItem key={department.id} value={department.id}>
                        {department.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth required disabled={!formData.department}>
                  <InputLabel id="grade-label">Grade</InputLabel>
                  <Select
                    labelId="grade-label"
                    name="grade"
                    value={formData.grade}
                    onChange={handleFormChange}
                  >
                    {filteredGrades.length > 0 ? (
                      filteredGrades.map((grade) => (
                        <MenuItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled value="">
                        No grades available for this department
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>

              {formData.department && filteredGrades.length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    No grades found for this department. Please add grades in the Create Grades section first.
                  </Alert>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="bookName"
                  label="Book Name"
                  value={formData.bookName}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
            </Grid>
          </Paper>
        );
        
      case 1:
        return (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Add New Chapter</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    label="Chapter Name"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={addChapter}
                    sx={{ bgcolor: '#011E41' }}
                  >
                    Add Chapter
                  </Button>
                </Grid>
              </Grid>
            </Paper>
            
            <Typography variant="h6" sx={{ mb: 2 }}>
              Chapters ({formData.chapters.length})
            </Typography>
            
            {formData.chapters.length > 0 ? (
              <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                {formData.chapters.map((chapter, index) => (
                  <ListItem
                    key={index}
                    button
                    selected={activeChapter === index}
                    onClick={() => setActiveChapter(index)}
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChapter(index);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                    sx={{ 
                      mb: 1, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1,
                      bgcolor: activeChapter === index ? '#e3f2fd' : 'white'
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="h6">
                          <ChapterIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#011E41' }} />
                          {chapter.name}
                        </Typography>
                      }
                      secondary={`${chapter.topics.length} topic(s)`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">No chapters added yet</Alert>
            )}
          </>
        );
        
      case 2:
        return (
          <>
            {activeChapter !== null && (
              <>
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Add Topics to "{formData.chapters[activeChapter].name}"
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={8}>
                      <TextField
                        fullWidth
                        label="Topic Name"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        startIcon={<AddIcon />}
                        onClick={addTopic}
                        sx={{ bgcolor: '#011E41' }}
                      >
                        Add Topic
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
                
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">
                    Topics ({formData.chapters[activeChapter].topics.length})
                  </Typography>
                  
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Select Chapter</InputLabel>
                    <Select
                      value={activeChapter}
                      onChange={(e) => setActiveChapter(e.target.value)}
                      label="Select Chapter"
                    >
                      {formData.chapters.map((chapter, index) => (
                        <MenuItem key={index} value={index}>
                          {chapter.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                {formData.chapters[activeChapter].topics.length > 0 ? (
                  <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                    {formData.chapters[activeChapter].topics.map((topic, index) => (
                      <ListItem
                        key={index}
                        selected={activeTopic === index}
                        onClick={() => setActiveTopic(index)}
                        secondaryAction={
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTopic(index);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                        sx={{ 
                          mb: 1, 
                          border: '1px solid #e0e0e0', 
                          borderRadius: 1,
                          bgcolor: activeTopic === index ? '#e3f2fd' : 'white'
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1">
                              <TopicIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#011E41' }} />
                              {topic.name}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">No topics added yet</Alert>
                )}
              </>
            )}
          </>
        );
      
      case 3:
        return (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" sx={{ mb: 2, color: '#011E41' }}>Book Summary</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" fontWeight="bold">Department:</Typography>
                  <Typography variant="body1">
                    {departments.find(d => d.id === formData.department)?.name || formData.department}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" fontWeight="bold">Grade:</Typography>
                  <Typography variant="body1">
                    {filteredGrades.find(g => g.id === formData.grade)?.name || formData.grade}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" fontWeight="bold">Book Name:</Typography>
                  <Typography variant="body1">{formData.bookName}</Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <Typography variant="h6" sx={{ mb: 2 }}>Book Structure</Typography>
            
            {formData.chapters.map((chapter, chIdx) => (
              <Accordion key={chIdx} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    <ChapterIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#011E41' }} />
                    {chapter.name} ({chapter.topics.length} topics)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {chapter.topics.length > 0 ? (
                    <List dense>
                      {chapter.topics.map((topic, tIdx) => (
                        <ListItem key={tIdx}>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <TopicIcon sx={{ mr: 1, fontSize: '0.9rem', color: '#011E41' }} />
                                {topic.name}
                              </Box>
                            } 
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No topics in this chapter</Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
            
            <Alert severity="info" sx={{ mt: 3 }}>
              Please review your book structure carefully before publishing. The book will be available in the "books" collection organized by department and grade.
            </Alert>
          </>
        );
        
      default:
        return <div>Unknown step</div>;
    }
  };
  
  return (
    <Container maxWidth="lg">
      {loading && (
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          zIndex: 9999
        }}>
          <CircularProgress />
        </Box>
      )}
      
      <Box sx={{ mt: 4, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ color: "#011E41" }}>
            <BookIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Create Book
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => navigate("/admin")}  // Changed to navigate to admin dashboard
          >
            Back to Dashboard
          </Button>
        </Box>
        
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box sx={{ mt: 2 }}>
          {renderStepContent(activeStep)}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={saveToFirebase}
              sx={{ bgcolor: '#011E41' }}
            >
              Publish Book
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{ bgcolor: '#011E41' }}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
      
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminCreateBook;