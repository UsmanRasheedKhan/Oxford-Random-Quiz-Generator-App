import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Chip,
  Checkbox,
  FormHelperText,
  InputAdornment
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { 
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  MenuBook as BookIcon,
  LibraryBooks as ChapterIcon,
  Topic as TopicIcon,
  QuestionAnswer as QuestionIcon,
  School as SchoolIcon,
  Close as CloseIcon
} from "@mui/icons-material";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "../../firebase"; // Adjust path as needed

const QuestionBank = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  // Selection states
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

  // Book content states
  const [bookStructure, setBookStructure] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);

  // Question editing states
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionDialog, setQuestionDialog] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    type: "multiple",
    options: ["", "", "", ""],
    correctOption: 0,
    shortAnswer: "",
    isTrueAnswer: true,  // New field for true/false questions
    difficulty: "Medium" // Add default difficulty
  });
  const [isNewQuestion, setIsNewQuestion] = useState(false);

  // Update state to track user's assigned departments and grades
  const [userAssignedDepartments, setUserAssignedDepartments] = useState([]);
  const [userAssignedGrades, setUserAssignedGrades] = useState({});

  // Add state variables for filtering
  const [showPendingQuestions, setShowPendingQuestions] = useState(true);

  // Add state variables for bulk upload
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadQuestions, setBulkUploadQuestions] = useState([]);
  const [bulkUploadError, setBulkUploadError] = useState("");

  // 1. First, update the state to support custom instruction types
  const [shortAnswerInstructions, setShortAnswerInstructions] = useState({
    shortAnswer: "Answer the following questions briefly:",
    fillinblanks: "Fill in the blanks with the correct words:",
    scrambled: "Rewrite the following scrambled words correctly:",
    other: "Answer the following questions:",
    // Default custom types
    oneWord: "Answer in one word only:",
    describe: "Describe the following in brief:",
    jumbled: "Rewrite these jumbled sentences correctly:",
    punctuation: "Rewrite these sentences with proper punctuation and capitalization:"
  });

  // 2. Add state to manage custom instruction types
  const [customInstructionTypes, setCustomInstructionTypes] = useState([
    "oneWord", "describe", "jumbled", "punctuation"
  ]);
  const [newCustomType, setNewCustomType] = useState(""); // For adding new types

  // 3. Update the grouping function to handle custom instruction types
const groupQuestionsByType = (questions) => {
  // Create initial structure with standard types
  const grouped = {
    multiple: [],
    truefalse: [],
    fillinblanks: [],
    shortAnswer: [],
    scrambled: [],
    other: []
  };
  
  // Add custom instruction types to grouped object
  customInstructionTypes.forEach(type => {
    grouped[type] = [];
  });
  
  // Group questions by their types
  questions.forEach(question => {
    if (question.type === "multiple") {
      grouped.multiple.push(question);
    } else if (question.type === "truefalse") {
      grouped.truefalse.push(question);
    } else if (question.type === "fillinblanks") {
      grouped.fillinblanks.push(question);
    } else if (question.type === "short") {
      // Check if question has a custom instruction type
      const instructionType = question.instructionType || "shortAnswer";
      
      // If this type exists in our grouped object, add it there
      if (grouped[instructionType]) {
        grouped[instructionType].push(question);
      } else {
        // Default to "other" if we don't recognize the instruction type
        grouped.other.push(question);
      }
    }
  });
  
  return grouped;
};

  // 4. Create a component to manage custom instruction types
const renderCustomInstructionsEditor = () => (
  <Paper elevation={3} sx={{ p: 3, mb: 4, className: "no-print" }}>
    <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>
      Manage Short Answer Question Types
    </Typography>
    
    <Typography variant="body2" sx={{ mb: 2 }}>
      You can create different types of short answer questions with specific instructions.
      Each type will be grouped together in the quiz with its own instruction header.
    </Typography>
    
    <Grid container spacing={2}>
      {/* Standard types */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Standard Question Types
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Short Answer Instruction"
          value={shortAnswerInstructions.shortAnswer}
          onChange={(e) => setShortAnswerInstructions({
            ...shortAnswerInstructions,
            shortAnswer: e.target.value
          })}
          variant="outlined"
          sx={{ mb: 2 }}
        />
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Fill in the Blanks Instruction"
          value={shortAnswerInstructions.fillinblanks}
          onChange={(e) => setShortAnswerInstructions({
            ...shortAnswerInstructions,
            fillinblanks: e.target.value
          })}
          variant="outlined"
          sx={{ mb: 2 }}
        />
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Scrambled Words Instruction"
          value={shortAnswerInstructions.scrambled}
          onChange={(e) => setShortAnswerInstructions({
            ...shortAnswerInstructions,
            scrambled: e.target.value
          })}
          variant="outlined"
          sx={{ mb: 2 }}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
          Custom Short Answer Types
        </Typography>
      </Grid>
      
      {/* Custom types */}
      {customInstructionTypes.map((type, index) => (
        <Grid item xs={12} key={type}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              fullWidth
              label={`Custom Type: ${type}`}
              value={shortAnswerInstructions[type] || ""}
              onChange={(e) => setShortAnswerInstructions({
                ...shortAnswerInstructions,
                [type]: e.target.value
              })}
              variant="outlined"
            />
            <Button 
              color="error" 
              onClick={() => {
                // Remove this custom type
                setCustomInstructionTypes(prev => prev.filter(t => t !== type));
                // Also remove its instruction
                setShortAnswerInstructions(prev => {
                  const updated = {...prev};
                  delete updated[type];
                  return updated;
                });
              }}
              sx={{ ml: 1 }}
            >
              Remove
            </Button>
          </Box>
        </Grid>
      ))}
      
      {/* Add new custom type */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <TextField
            fullWidth
            label="New Custom Type Key"
            value={newCustomType}
            onChange={(e) => setNewCustomType(e.target.value)}
            placeholder="E.g. 'oneWord', 'jumbled', etc."
            variant="outlined"
            helperText="Enter a simple key name (no spaces)"
          />
          <Button 
            color="primary" 
            variant="contained"
            disabled={!newCustomType.trim() || customInstructionTypes.includes(newCustomType)}
            onClick={() => {
              // Add new custom type
              setCustomInstructionTypes(prev => [...prev, newCustomType]);
              // Initialize with default instruction
              setShortAnswerInstructions(prev => ({
                ...prev,
                [newCustomType]: `Answer the following ${newCustomType} questions:`
              }));
              setNewCustomType("");
            }}
            sx={{ ml: 1, height: 56 }}
          >
            Add
          </Button>
        </Box>
      </Grid>
    </Grid>
  </Paper>
);

// Utility function to detect if text contains Urdu
const isUrduText = (text) => {
  if (!text) return false;
  
  // Urdu Unicode range (approximate)
  const urduPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  // Count characters that match Urdu pattern
  let urduCharCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (urduPattern.test(text[i])) {
      urduCharCount++;
    }
  }
  
  // If more than 30% of characters are Urdu, consider it Urdu text
  return urduCharCount / text.length > 0.3;
};

  // Load user and their departments
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        await fetchUserDepartments(user);
      } else {
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch user's assigned departments and grades from user database
const fetchUserDepartments = async (user) => {
  try {
    const teacherQuery = query(
      collection(db, "users", "usersData", "teachers"),
      where("email", "==", user.email)
    );
    
    const teacherSnapshot = await getDocs(teacherQuery);
    
    if (!teacherSnapshot.empty) {
      const teacherData = teacherSnapshot.docs[0].data();
      console.log("Teacher data:", teacherData);
      
      // Store the assigned departments
      const assignedDepartments = teacherData.department || [];
      setUserAssignedDepartments(assignedDepartments);
      setDepartments(assignedDepartments);
      
      // Parse the grades into department groups with improved format handling
      const gradesArray = teacherData.grades || [];
      const parsedGrades = {};
      
      gradesArray.forEach(gradeString => {
        // Try different potential formats
        if (gradeString) {
          let department, grade;
          
          if (gradeString.includes('|')) {
            // Format: "Department|Grade"
            [department, grade] = gradeString.split('|');
          } else if (gradeString.includes(':')) {
            // Format: "Department:Grade" 
            [department, grade] = gradeString.split(':');
          } else if (gradeString.includes(' - ')) {
            // Format: "Department - Grade"
            [department, grade] = gradeString.split(' - ');
          } else {
            // Try to match department name from the full string
            department = assignedDepartments.find(dept => 
              gradeString.toLowerCase().includes(dept.toLowerCase())
            );
            
            if (department) {
              // Extract grade by removing department name
              grade = gradeString
                .replace(department, '')
                .replace(/^[:\-\s]+/, '')  // Remove leading separators and spaces
                .trim();
            }
          }
          
          if (department && grade) {
            // Normalize department name
            const normalizedDept = department.trim();
            
            if (!parsedGrades[normalizedDept]) {
              parsedGrades[normalizedDept] = [];
            }
            
            parsedGrades[normalizedDept].push(grade.trim());
          }
        }
      });
      
      console.log("Parsed grades structure:", parsedGrades);
      setUserAssignedGrades(parsedGrades);
    } else {
      console.error("No teacher document found for:", user.email);
      setToast({
        open: true,
        message: "Could not find your teacher profile",
        severity: "error"
      });
    }
  } catch (error) {
    console.error("Error fetching teacher data:", error);
    setToast({
      open: true,
      message: "Failed to load profile data: " + error.message,
      severity: "error"
    });
  }
};

  // Filter grades when department changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchGrades(selectedDepartment);
    } else {
      setGrades([]);
      setSelectedGrade("");
    }
  }, [selectedDepartment]);

  // Fetch grades for selected department
  const fetchGrades = async (department) => {
    try {
      console.log("Fetching grades for department:", department);
      console.log("Available userAssignedGrades:", userAssignedGrades);
      
      // Get only grades assigned to this user for the selected department
      const assignedGradesForDept = userAssignedGrades[department] || [];
      console.log("Assigned grades for this department:", assignedGradesForDept);
      
      if (assignedGradesForDept.length > 0) {
        setGrades(assignedGradesForDept);
        console.log(`Loaded ${assignedGradesForDept.length} assigned grades for department ${department}`);
      } else {
        console.log("No grades found for department:", department);
        setGrades([]);
        setToast({
          open: true,
          message: `You don't have any grades assigned in the ${department} department`,
          severity: "warning"
        });
      }
    } catch (error) {
      console.error("Error fetching grades:", error);
      setToast({
        open: true,
        message: "Failed to load grades",
        severity: "error"
      });
    }
  };

  // Fetch books when grade changes
  useEffect(() => {
    if (selectedDepartment && selectedGrade) {
      fetchBooks(selectedDepartment, selectedGrade);
    } else {
      setBooks([]);
    }
  }, [selectedDepartment, selectedGrade]);

  // Fetch books from the books database for the selected department-grade combination
const fetchBooks = async (department, grade) => {
  if (!currentUser) return;
  
  try {
    setLoading(true);
    
    // INTEGRITY CHECKS remain the same
    if (!userAssignedDepartments.includes(department)) {
      console.error("Security violation: Attempted to access unauthorized department");
      setToast({
        open: true,
        message: "You are not authorized to access this department",
        severity: "error"
      });
      setLoading(false);
      return;
    }
    
    const assignedGradesForDept = userAssignedGrades[department] || [];
    if (!assignedGradesForDept.includes(grade)) {
      console.error("Security violation: Attempted to access unauthorized grade");
      setToast({
        open: true,
        message: "You are not authorized to access this grade",
        severity: "error"
      });
      setLoading(false);
      return;
    }
    
    console.log("Authorized book fetch for:", { department, grade });
    
    // Updated path to match the described structure:
    // books -> department name -> grades -> grade name -> books
    const formattedGrade = grade.replace(" ", "_");
    const booksRef = collection(db, "books", department, "grades", formattedGrade, "books");
    const booksSnapshot = await getDocs(booksRef);
    
    console.log(`Found ${booksSnapshot.docs.length} books for ${department} - ${grade}`);
    
    const booksData = booksSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.id.replace(/_/g, " "),  // Format display name
      ...doc.data()
    }));
    
    setBooks(booksData);
    setLoading(false);
  } catch (error) {
    console.error("Error fetching books:", error);
    setToast({
      open: true,
      message: "Failed to load books: " + error.message,
      severity: "error"
    });
    setLoading(false);
  }
};

// Update the loadBookStructure function to properly filter questions based on status

const loadBookStructure = async (bookId) => {
  try {
    setLoading(true);
    setBookStructure(null);
    
    // Updated path to match the described structure
    const formattedGrade = selectedGrade.replace(" ", "_");
    const bookRef = doc(db, "books", selectedDepartment, "grades", formattedGrade, "books", bookId);
    const bookDoc = await getDoc(bookRef);
    
    if (!bookDoc.exists()) {
      throw new Error("Book not found");
    }
    
    const bookData = {
      id: bookId,
      name: bookId.replace(/_/g, " "),
      department: selectedDepartment,
      grade: selectedGrade,
      ...bookDoc.data()
    };
    
    console.log("Book document found:", bookData);
    
    // Get chapters - FIXED: Use correct reference
    const chaptersRef = collection(db, "books", selectedDepartment, "grades", formattedGrade, "books", bookId, "chapters");
    const chaptersSnapshot = await getDocs(chaptersRef);
    console.log(`Found ${chaptersSnapshot.docs.length} chapters`);
    
    const chaptersData = await Promise.all(
      chaptersSnapshot.docs.map(async (chapterDoc) => {
        const chapterId = chapterDoc.id;
        const chapterData = {
          name: chapterId.replace(/_/g, " "),
          ...chapterDoc.data()
        };
        
        // Get topics for this chapter - FIXED: Create proper collection reference
        const topicsRef = collection(db, "books", selectedDepartment, "grades", formattedGrade, "books", bookId, "chapters", chapterId, "topics");
        const topicsSnapshot = await getDocs(topicsRef);
        
        const topicsData = await Promise.all(
          topicsSnapshot.docs.map(async (topicDoc) => {
            const topicId = topicDoc.id;
            const topicData = {
              name: topicId.replace(/_/g, " "),
              ...topicDoc.data()
            };
            
            // Get questions for this topic
            const questionsRef = collection(db, "books", selectedDepartment, "grades", formattedGrade, "books", bookId, "chapters", chapterId, "topics", topicId, "questions");
            const questionsSnapshot = await getDocs(questionsRef);
            
            // Process questions and separate by status
            const allQuestionsData = questionsSnapshot.docs.map(questionDoc => ({
              id: questionDoc.id,
              ...questionDoc.data()
            }));
            
            // Sort questions by status and creation date
            const sortedQuestions = allQuestionsData.sort((a, b) => {
              // Sort by status (approved first, then pending)
              if ((a.status === 'approved' && b.status !== 'approved') || 
                  (!a.status && b.status === 'pending')) {
                return -1;
              }
              if ((b.status === 'approved' && a.status !== 'approved') || 
                  (!b.status && a.status === 'pending')) {
                return 1;
              }
              
              // Then sort by creation date (newest first)
              const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
              const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
              return dateB - dateA;
            });
            
            return {
              id: topicId,
              name: topicData.name,
              order: topicData.order || 0,
              questions: sortedQuestions,
              // Also store a filtered version with only approved questions
              approvedQuestions: sortedQuestions.filter(q => q.status === 'approved')
            };
          })
        );
        
        return {
          id: chapterId,
          name: chapterData.name,
          order: chapterData.order || 0,
          topics: topicsData.sort((a, b) => (a.order || 0) - (b.order || 0))
        };
      })
    );
    
    // Set the complete book structure
    setBookStructure({
      ...bookData,
      chapters: chaptersData.sort((a, b) => (a.order || 0) - (b.order || 0))
    });
    
    setLoading(false);
  } catch (error) {
    console.error("Error loading book structure:", error);
    setToast({
      open: true,
      message: "Failed to load book: " + error.message,
      severity: "error"
    });
    setLoading(false);
  }
};

  // Handle book selection
  const handleViewBook = () => {
    if (selectedBook) {
      loadBookStructure(selectedBook);
      setSelectedChapter(null);
      setSelectedTopic(null);
      setExpandedChapter(null);
    }
  };

  // Open question editor dialog
  const handleEditQuestion = (question, chapterId, topicId) => {
    setEditingQuestion({
      question,
      chapterId,
      topicId
    });
    setNewQuestion({
      text: question.text,
      type: question.type,
      options: question.options || ["", "", "", ""],
      correctOption: question.correctOption || 0,
      shortAnswer: question.shortAnswer || "",
      blankAnswer: question.blankAnswer || "",
      instructionType: question.instructionType || "shortAnswer", // Add instruction type
      isTrueAnswer: question.isTrueAnswer || true,
      difficulty: question.difficulty || "Medium" // Include difficulty from existing question or default
    });
    setIsNewQuestion(false);
    setQuestionDialog(true);
  };

  // Open dialog to add a new question
  const handleAddQuestion = (chapterId, topicId) => {
    setEditingQuestion({
      chapterId,
      topicId
    });
    setNewQuestion({
      text: "",
      type: "multiple",
      options: ["", "", "", ""],
      correctOption: 0,
      shortAnswer: "",
      blankAnswer: "",
      instructionType: "shortAnswer", // Add default instruction type
      isTrueAnswer: true,
      difficulty: "Medium" // Add default difficulty
    });
    setIsNewQuestion(true);
    setQuestionDialog(true);
  };

  // Handle question option changes
  const handleOptionChange = (index, value) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({
      ...newQuestion,
      options: newOptions
    });
  };

  // Save question to the appropriate topic in the book structure
const saveQuestion = async () => {
  try {
    // Validate question text
    if (!newQuestion.text.trim()) {
      setToast({
        open: true,
        message: "Question text cannot be empty",
        severity: "error"
      });
      return;
    }
    
    // Type-specific validation
    if (newQuestion.type === "multiple") {
      // Check if any option is empty
      if (newQuestion.options.some(opt => !opt.trim())) {
        setToast({
          open: true,
          message: "All options must be filled",
          severity: "error"
        });
        return;
      }
      
      // Ensure options are unique
      const uniqueOptions = new Set(newQuestion.options.map(opt => opt.trim()));
      if (uniqueOptions.size !== newQuestion.options.length) {
        setToast({
          open: true,
          message: "All options must be unique",
          severity: "error"
        });
        return;
      }
      
    } else if (newQuestion.type === "short") {
      // Check if short answer is provided
      if (!newQuestion.shortAnswer.trim()) {
        setToast({
          open: true,
          message: "Answer cannot be empty",
          severity: "error"
        });
        return;
      }
    }
    // No need to validate true/false as it always has a value
    
    const { chapterId, topicId } = editingQuestion;
    const formattedGrade = selectedGrade.replace(" ", "_");
    
    // Prepare question data with author name, pending status, and difficulty
    const questionData = {
      text: newQuestion.text.trim(),
      type: newQuestion.type,
      difficulty: newQuestion.difficulty, // Include difficulty in saved data
      ...(newQuestion.type === "multiple" ? {
        options: newQuestion.options.map(opt => opt.trim()),
        correctOption: newQuestion.correctOption
      } : newQuestion.type === "short" ? {
        shortAnswer: newQuestion.shortAnswer.trim(),
        instructionType: newQuestion.instructionType || "shortAnswer" // Include instruction type
      } : newQuestion.type === "fillinblanks" ? {
        blankAnswer: newQuestion.blankAnswer.trim()
      } : {
        isTrueAnswer: newQuestion.isTrueAnswer
      }),
      author: currentUser.email,
      createdAt: new Date(),
      status: "pending" // Add pending status for new questions
    };
    
    if (isNewQuestion) {
      // Add new question
      await addDoc(
        collection(
          db, 
          "books", 
          selectedDepartment,
          "grades",
          formattedGrade,
          "books",
          selectedBook, 
          "chapters", 
          chapterId,
          "topics",
          topicId,
          "questions"
        ),
        questionData
      );
      
      setToast({
        open: true,
        message: "Question submitted for approval. It won't be visible until approved by an administrator.",
        severity: "success"
      });
    } else {
      // For existing questions, preserve the current status unless we're explicitly changing it
      if (!editingQuestion.question.status) {
        questionData.status = "pending";
      } else {
        questionData.status = editingQuestion.question.status;
      }
      
      // Update existing question
      await updateDoc(
        doc(
          db, 
          "books", 
          selectedDepartment,
          "grades",
          formattedGrade,
          "books",
          selectedBook, 
          "chapters", 
          chapterId,
          "topics",
          topicId,
          "questions",
          editingQuestion.question.id
        ),
        questionData
      );
      
      setToast({
        open: true,
        message: editingQuestion.question.status === "approved" 
          ? "Question updated successfully" 
          : "Question updated and sent for approval",
        severity: "success"
      });
    }
    
    // Close dialog and refresh book structure
    setQuestionDialog(false);
    await loadBookStructure(selectedBook);
  } catch (error) {
    console.error("Error saving question:", error);
    setToast({
      open: true,
      message: "Failed to save question: " + error.message,
      severity: "error"
    });
  }
};

// Delete question from the book structure
const handleDeleteQuestion = async (questionId, chapterId, topicId) => {
  try {
    if (window.confirm("Are you sure you want to delete this question?")) {
      const formattedGrade = selectedGrade.replace(" ", "_");
      
      await deleteDoc(
        doc(
          db, 
          "books", 
          selectedDepartment,
          "grades",
          formattedGrade,
          "books",
          selectedBook, 
          "chapters", 
          chapterId,
          "topics",
          topicId,
          "questions",
          questionId
        )
      );
      
      setToast({
        open: true,
        message: "Question deleted successfully",
        severity: "success"
      });
      
      // Refresh book structure
      await loadBookStructure(selectedBook);
    }
  } catch (error) {
    console.error("Error deleting question:", error);
    setToast({
      open: true,
      message: "Failed to delete question: " + error.message,
      severity: "error"
    });
  }
};

  // Handle bulk upload
  const handleBulkUpload = (chapterId, topicId) => {
    setEditingQuestion({ chapterId, topicId });
    setBulkUploadDialog(true);
  };

  // Handle file change for bulk upload
  const handleFileChange = (e) => {
    setBulkUploadFile(e.target.files[0]);
  };

  // Parse CSV file for bulk upload
const parseCSVFile = async () => {
  if (!bulkUploadFile) {
    setBulkUploadError("Please select a file to upload.");
    return;
  }

  try {
    const fileContent = await bulkUploadFile.text();
    // Use a better CSV parsing approach to handle commas within quoted text
    const rows = [];
    let inQuotes = false;
    let currentRow = [];
    let currentField = '';
    
    for (let i = 0; i < fileContent.length; i++) {
      const char = fileContent[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      
      if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
        continue;
      }
      
      if (char === '\n' && !inQuotes) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        continue;
      }
      
      currentField += char;
    }
    
    // Handle the last field and row
    if (currentField) {
      currentRow.push(currentField.trim());
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
    }

    // Validate the header row
    const headers = rows[0];
    const expectedHeaders = [
      "Question Text",
      "Type",
      "Option 1",
      "Option 2",
      "Option 3",
      "Option 4",
      "Correct Option Index",
      "Short Answer",
      "Blank Answer",
      "True/False Answer",
      "Short Answer Type"
    ];

    if (!headers || headers.length < 8) {
      setBulkUploadError("Invalid CSV format. Please ensure the file has the correct headers and data format.");
      return;
    }

    // Skip the header row and parse the questions
    const parsedQuestions = rows.slice(1).map((row) => {
      // Get the basic question data
      const questionType = row[1]?.trim().toLowerCase();
      
      // Create the question object based on type
      const question = {
        text: row[0]?.trim(),
        type: questionType,
      };
      
      // Add type-specific data
      if (questionType === "multiple") {
        question.options = row.slice(2, 6).map(opt => opt?.trim() || ""); // Get all 4 options
        question.correctOption = parseInt(row[6], 10) || 0; // Index of the correct option
      } 
      else if (questionType === "short") {
        question.shortAnswer = row[7]?.trim() || "";
        question.instructionType = row[10]?.trim() || "shortAnswer"; // Get the short answer type
      }
      else if (questionType === "fillinblanks") {
        question.blankAnswer = row[8]?.trim() || "";
      }
      else if (questionType === "truefalse") {
        // Make sure to explicitly set to true or false, not undefined
        const value = row[9]?.trim()?.toLowerCase() || "";
        question.isTrueAnswer = value === "true" ? true : false;
      }
      
      return question;
    });

    // Filter out empty rows and validate
    const validQuestions = parsedQuestions.filter((question) => {
      if (!question.text) return false;
      
      // Type-specific validation
      if (question.type === "multiple" && (!question.options || question.options.filter(Boolean).length < 2)) {
        return false;
      }
      if (question.type === "short" && !question.shortAnswer) {
        return false;
      }
      if (question.type === "fillinblanks" && !question.blankAnswer) {
        return false;
      }
      
      return true;
    });

    setBulkUploadQuestions(validQuestions);
    setBulkUploadError(validQuestions.length === 0 ? "No valid questions found in the file." : "");
  } catch (error) {
    console.error("Error parsing CSV file:", error);
    setBulkUploadError("Failed to parse the file. Please ensure it is in the correct format.");
  }
};

  // Save bulk questions to the appropriate topic in the book structure
const saveBulkQuestions = async () => {
  try {
    const { chapterId, topicId } = editingQuestion;
    const formattedGrade = selectedGrade.replace(" ", "_");

    // Initialize a Firestore batch
    const batch = writeBatch(db);

    const questionsRef = collection(
      db,
      "books",
      selectedDepartment,
      "grades",
      formattedGrade,
      "books",
      selectedBook,
      "chapters",
      chapterId,
      "topics",
      topicId,
      "questions"
    );

    bulkUploadQuestions.forEach((question) => {
      // Create a base question object
      const questionData = {
        text: question.text,
        type: question.type,
        author: currentUser.email,
        createdAt: new Date(),
        status: "pending",
      };

      // Add type-specific fields only if they exist
      if (question.type === "multiple") {
        questionData.options = question.options || ["", "", "", ""];
        questionData.correctOption = question.correctOption || 0;
      } 
      else if (question.type === "short") {
        questionData.shortAnswer = question.shortAnswer || "";
        questionData.instructionType = question.instructionType || "shortAnswer";
      } 
      else if (question.type === "fillinblanks") {
        questionData.blankAnswer = question.blankAnswer || "";
      }
      else if (question.type === "truefalse") {
        // Ensure isTrueAnswer is explicitly a boolean value
        questionData.isTrueAnswer = question.isTrueAnswer === true;
      }

      const newDocRef = doc(questionsRef);
      batch.set(newDocRef, questionData);
    });

    await batch.commit();

    setToast({
      open: true,
      message: `${bulkUploadQuestions.length} questions uploaded successfully and sent for approval.`,
      severity: "success",
    });

    setBulkUploadDialog(false);
    setBulkUploadQuestions([]);
    setBulkUploadFile(null);
    await loadBookStructure(selectedBook);
  } catch (error) {
    console.error("Error saving bulk questions:", error);
    setToast({
      open: true,
      message: "Failed to upload questions: " + error.message,
      severity: "error",
    });
  }
};

  // Handle closing the toast
  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  // Add formula keyboard state
  const [formulaKeyboardOpen, setFormulaKeyboardOpen] = useState(false);
  const [formulaInsertPosition, setFormulaInsertPosition] = useState(0);

  // Math symbols for formula keyboard
  const mathSymbols = [
    '±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '∑', '∏', 
    '∫', '∂', '√', '∛', 'π', 'θ', 'Δ', 'α', 'β', 'γ',
    'μ', 'φ', 'Ω', 'λ', 'ε', '∈', '∉', '∩', '∪', '⊂',
    '⊃', '⊆', '⊇', '∀', '∃', '∄', '⇒', '⇔', '∧', '∨'
  ];

  // Function to insert formula symbol at cursor position
  const insertFormulaSymbol = (symbol) => {
    const textBefore = newQuestion.text.substring(0, formulaInsertPosition);
    const textAfter = newQuestion.text.substring(formulaInsertPosition);
    
    setNewQuestion({
      ...newQuestion,
      text: textBefore + symbol + textAfter
    });
    
    // Update cursor position
    setFormulaInsertPosition(formulaInsertPosition + symbol.length);
  };

  // Track cursor position in the text field
  const handleQuestionTextChange = (e) => {
    const cursorPosition = e.target.selectionStart;
    setNewQuestion({...newQuestion, text: e.target.value});
    setFormulaInsertPosition(cursorPosition);
  };

  // Toggle formula keyboard
  const toggleFormulaKeyboard = () => {
    setFormulaKeyboardOpen(!formulaKeyboardOpen);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" color="#011E41">
            Question Bank
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => navigate("/teacher")}
          >
            Back to Dashboard
          </Button>
        </Box>
        
        {/* Selection Form */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  label="Department"
                >
                  {departments.map((department, index) => (
                    <MenuItem key={index} value={department}>
                      {department}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth disabled={!selectedDepartment}>
                <InputLabel>Grade</InputLabel>
                <Select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  label="Grade"
                >
                  {grades.map((grade, index) => (
                    <MenuItem key={index} value={grade}>
                      {grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth disabled={!(selectedDepartment && selectedGrade)}>
                <InputLabel>Book</InputLabel>
                <Select
                  value={selectedBook || ""}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  label="Book"
                >
                  {books.length > 0 ? (
                    books.map((book) => (
                      <MenuItem key={book.id} value={book.id}>
                        {book.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled value="">
                      No books found for this grade
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Add message when no books are available */}
            {selectedDepartment && selectedGrade && books.length === 0 && !loading && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  No books found for {selectedGrade} in {selectedDepartment}. Please create a book first using the Create Book page.
                </Alert>
              </Grid>
            )}
            
            <Grid item xs={12} sm={2}>
              <Button 
                variant="contained"
                fullWidth
                onClick={handleViewBook}
                disabled={!selectedBook}
                sx={{ bgcolor: '#011E41', height: '56px' }}
              >
                View Book
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Loading Indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {/* No Book Selected Message */}
        {!loading && !bookStructure && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Please select a department, grade, and book to view questions.
          </Alert>
        )}
        
        {/* Book Content */}
        {!loading && bookStructure && (
          <Box>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" color="#011E41" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <BookIcon sx={{ mr: 1 }} /> {bookStructure.name}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="body1">
                  <strong>Department:</strong> {bookStructure.department}
                </Typography>
                <Typography variant="body1">
                  <strong>Grade:</strong> {bookStructure.grade}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Filter options */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ mr: 2 }}>Filter:</Typography>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={showPendingQuestions}
                      onChange={(e) => setShowPendingQuestions(e.target.checked)}
                      color="warning"
                    />
                  }
                  label="Show Pending Questions"
                />
              </Box>
            </Paper>
            
            {/* Approval status info */}
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> New questions require admin approval before they can be used in quizzes.
                  Questions with <Chip size="small" label="Pending Approval" color="warning" sx={{ mx: 1, height: 20 }} />
                  status are awaiting administrator review.
                </Typography>
              </Alert>
            </Box>

            {/* Pending Questions Info */}
            {/* <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> New questions require admin approval before they appear in quizzes.
                  Questions with <Chip size="small" label="Pending Approval" color="warning" sx={{ mx: 1, height: 20 }} />
                  status are awaiting administrator review.
                </Typography>
              </Alert>
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Important:</strong> Students will not see pending questions in quizzes until they are approved by an administrator.
                  You can still view and manage your pending questions here while waiting for approval.
                </Typography>
              </Alert>
            </Box> */}
            
            {/* Chapters */}
            {bookStructure.chapters.length > 0 ? (
              <Box sx={{ mt: 3 }}>
                {bookStructure.chapters.map((chapter) => (
                  <Accordion 
                    key={chapter.id} 
                    expanded={expandedChapter === chapter.id}
                    onChange={() => setExpandedChapter(expandedChapter === chapter.id ? null : chapter.id)}
                    sx={{ 
                      mb: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <ChapterIcon sx={{ mr: 1, color: '#011E41' }} />
                        <Typography variant="h6">
                          {chapter.name}
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                          ({chapter.topics.length} {chapter.topics.length === 1 ? 'topic' : 'topics'})
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails sx={{ p: 0 }}>
                      {/* Topics */}
                      {chapter.topics.length > 0 ? (
                        <List component="div" disablePadding>
                          {chapter.topics.map((topic) => (
                            <React.Fragment key={topic.id}>
                              <ListItemButton
                                onClick={() => {
                                  setSelectedChapter(chapter.id);
                                  setSelectedTopic(topic.id === selectedTopic ? null : topic.id);
                                }}
                                sx={{
                                  pl: 4,
                                  bgcolor: selectedTopic === topic.id ? 'rgba(1, 30, 65, 0.08)' : 'inherit',
                                  borderLeft: selectedTopic === topic.id ? '4px solid #011E41' : 'none',
                                }}
                              >
                                <ListItemIcon>
                                  <TopicIcon sx={{ color: '#011E41' }} />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={topic.name}
                                  secondary={`${topic.questions.length} ${topic.questions.length === 1 ? 'question' : 'questions'}`}
                                />
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddQuestion(chapter.id, topic.id);
                                  }}
                                  sx={{ mr: 1 }}
                                >
                                  Add Question
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBulkUpload(chapter.id, topic.id);
                                  }}
                                  sx={{ mr: 1 }}
                                >
                                  Bulk Upload
                                </Button>
                              </ListItemButton>
                              
                              {/* Display questions if topic is selected */}
                              {selectedTopic === topic.id && (
                                <Box sx={{ pl: 8, pr: 4, pb: 2, pt: 1 }}>
                                  {topic.questions
                                    .filter(q => showPendingQuestions ? true : (q.status !== 'pending'))
                                    .map((question, qIndex) => (
                                      <Card 
                                        key={question.id} 
                                        sx={{ 
                                          mb: 2,
                                          border: '1px solid #e0e0e0',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                          borderLeft: question.status === 'pending' ? '4px solid #ff9800' : 
                                                     question.status === 'approved' ? '4px solid #4caf50' : 
                                                     '4px solid #e0e0e0'
                                        }}
                                      >
                                        <CardHeader
                                          avatar={<QuestionIcon sx={{ color: '#011E41' }} />}
                                          title={
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                              {`Question ${qIndex + 1}`}
                                              {question.status === 'pending' && (
                                                <Chip 
                                                  label="Pending Approval" 
                                                  size="small" 
                                                  color="warning"
                                                  sx={{ ml: 1, fontSize: '0.75rem' }}
                                                />
                                              )}
                                              {question.status === 'approved' && (
                                                <Chip 
                                                  label="Approved" 
                                                  size="small" 
                                                  color="success"
                                                  sx={{ ml: 1, fontSize: '0.75rem' }}
                                                />
                                              )}
                                            </Box>
                                          }
                                          subheader={
                                            question.type === "multiple" ? "Multiple Choice" : 
                                            question.type === "short" ? 
                                              `Short Answer - ${
                                                question.instructionType === "shortAnswer" ? "Brief Answer" :
                                                question.instructionType === "oneWord" ? "One Word" :
                                                question.instructionType === "describe" ? "Description" :
                                                question.instructionType === "jumbled" ? "Jumbled Sentences" :
                                                question.instructionType === "punctuation" ? "Punctuation" :
                                                question.instructionType === "scrambled" ? "Scrambled Words" :
                                                (question.instructionType || "Other")
                                              }` :
                                            question.type === "fillinblanks" ? "Fill in the Blanks" :
                                            "True/False"
                                          }
                                          action={
                                            <Box>
                                              <IconButton
                                                onClick={() => handleEditQuestion(question, chapter.id, topic.id)}
                                                size="small"
                                                sx={{ color: '#4caf50' }}
                                                disabled={question.status === 'pending'} // Disable editing for pending questions
                                                title={question.status === 'pending' ? "Cannot edit pending questions" : "Edit question"}
                                              >
                                                <EditIcon />
                                              </IconButton>
                                              <IconButton
                                                onClick={() => handleDeleteQuestion(question.id, chapter.id, topic.id)}
                                                size="small"
                                                sx={{ color: '#f44336' }}
                                              >
                                                <DeleteIcon />
                                              </IconButton>
                                            </Box>
                                          }
                                        />
                                        <CardContent>
                                          <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 1 }}>
                                            {question.text}
                                          </Typography>
                                          
                                          {question.type === "multiple" && (
                                            <List dense>
                                              {question.options.map((option, optIndex) => (
                                                <ListItem key={optIndex}>
                                                  <Radio
                                                    checked={question.correctOption === optIndex}
                                                    disabled
                                                    size="small"
                                                  />
                                                  <ListItemText primary={option} />
                                                </ListItem>
                                              ))}
                                            </List>
                                          )}
                                          
                                          {question.type === "short" && (
                                            <Box sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                                              <Typography variant="body2">
                                                Correct answer: {question.shortAnswer}
                                              </Typography>
                                            </Box>
                                          )}

                                          {question.type === "fillinblanks" && (
                                            <Box sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                                              <Typography variant="body2">
                                                Blank should be filled with: {question.blankAnswer}
                                              </Typography>
                                            </Box>
                                          )}

                                          {question.type === "truefalse" && (
                                            <Box sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                                              <Typography variant="body2">
                                                Correct answer: {question.isTrueAnswer ? "True" : "False"}
                                              </Typography>
                                            </Box>
                                          )}
                                        </CardContent>
                                      </Card>
                                    ))
                                  }
                                </Box>
                              )}
                            </React.Fragment>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ p: 2 }}>
                          <Alert severity="info">No topics in this chapter.</Alert>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Alert severity="info">This book has no chapters yet.</Alert>
            )}
          </Box>
        )}
      </Box>
      
      {/* Question Edit Dialog */}
      <Dialog 
        open={questionDialog} 
        onClose={() => setQuestionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isNewQuestion ? "Add New Question" : "Edit Question"}
        </DialogTitle>
        <DialogContent>
          {/* Add approval process notice */}
          {isNewQuestion && (
            <Alert severity="info" sx={{ mb: 3 }}>
              New questions will be sent to administrators for review and approval before they appear in quizzes.
            </Alert>
          )}
          
          <Box sx={{ mt: 1 }}>
            {/* Question text box with RTL support for Urdu */}
            <Box sx={{ position: 'relative', mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Question Text"
                value={newQuestion.text}
                onChange={handleQuestionTextChange}
                onSelect={(e) => {
                  setFormulaInsertPosition(e.target.selectionStart);
                }}
                InputProps={{
                  endAdornment: (
                    !isUrduText(newQuestion.text) ? (
                      <InputAdornment position="end">
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={toggleFormulaKeyboard}
                          sx={{ 
                            fontFamily: 'math', 
                            fontWeight: 'bold', 
                            fontSize: '15px',
                            minWidth: 'auto',
                            borderRadius: '4px'
                          }}
                        >
                          ƒ<sub>x</sub>
                        </Button>
                      </InputAdornment>
                    ) : null
                  ),
                  style: isUrduText(newQuestion.text) ? { 
                    direction: 'rtl', 
                    textAlign: 'right', 
                    fontFamily: 'Noto Nastaliq Urdu, Arial'
                  } : {}
                }}
                InputLabelProps={{
                  style: isUrduText(newQuestion.text) ? { 
                    left: 'auto', 
                    right: 32, 
                    transformOrigin: 'top right',
                    background: 'white',
                    padding: '0 8px'
                  } : {}
                }}
                sx={isUrduText(newQuestion.text) ? { 
                  '& .MuiInputBase-input': { textAlign: 'right' },
                  '& .MuiOutlinedInput-notchedOutline': { 
                    textAlign: 'right'
                  },
                  '& .MuiInputLabel-outlined': {
                    transform: 'translate(-14px, -9px) scale(0.75)'
                  },
                  '& .MuiInputLabel-shrink': {
                    transform: 'translate(-14px, -9px) scale(0.75)'
                  }
                } : {}}
              />
              
              {formulaKeyboardOpen && !isUrduText(newQuestion.text) && (
                <Paper 
                  elevation={3} 
                  sx={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    zIndex: 1000,
                    p: 2,
                    mt: 1,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">Insert Math Symbol</Typography>
                    <IconButton size="small" onClick={toggleFormulaKeyboard}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {mathSymbols.map((symbol) => (
                      <Button 
                        key={symbol}
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          insertFormulaSymbol(symbol);
                        }}
                        sx={{ 
                          minWidth: '36px', 
                          height: '36px',
                          fontFamily: 'math',
                          p: 0
                        }}
                      >
                        {symbol}
                      </Button>
                    ))}
                  </Box>
                </Paper>
              )}
            </Box>
            
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <Typography variant="subtitle1">Question Type</Typography>
              <RadioGroup
                row
                value={newQuestion.type}
                onChange={(e) => setNewQuestion({...newQuestion, type: e.target.value})}
              >
                <FormControlLabel 
                  value="multiple" 
                  control={<Radio />} 
                  label="Multiple Choice" 
                />
                <FormControlLabel 
                  value="short" 
                  control={<Radio />} 
                  label="Short Answer" 
                />
                <FormControlLabel 
                  value="fillinblanks" 
                  control={<Radio />} 
                  label="Fill in the Blanks" 
                />
                <FormControlLabel 
                  value="truefalse" 
                  control={<Radio />} 
                  label="True/False" 
                />
              </RadioGroup>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
              <InputLabel>Difficulty Level</InputLabel>
              <Select
                value={newQuestion.difficulty || "Medium"}
                onChange={(e) => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                label="Difficulty Level"
              >
                <MenuItem value="Easy" sx={{ color: 'success.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main', mr: 1 }} />
                    Easy
                  </Box>
                </MenuItem>
                <MenuItem value="Medium" sx={{ color: 'warning.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main', mr: 1 }} />
                    Medium
                  </Box>
                </MenuItem>
                <MenuItem value="Hard" sx={{ color: 'error.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', mr: 1 }} />
                    Hard
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>Select the difficulty level of this question</FormHelperText>
            </FormControl>
            
            {/* Multiple choice options with RTL support */}
            {newQuestion.type === "multiple" && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Options</Typography>
                <Grid container spacing={2}>
                  {newQuestion.options.map((option, index) => {
                    const isOptionUrdu = isUrduText(option);
                    return (
                      <Grid item xs={12} sm={6} key={index} container alignItems="center" spacing={1}>
                        <Grid item>
                          <Radio 
                            checked={newQuestion.correctOption === index}
                            onChange={() => setNewQuestion({...newQuestion, correctOption: index})}
                          />
                        </Grid>
                        <Grid item xs>
                          <TextField
                            fullWidth
                            label={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            InputProps={{
                              style: isOptionUrdu ? { 
                                direction: 'rtl', 
                                textAlign: 'right', 
                                fontFamily: 'Noto Nastaliq Urdu, Arial' 
                              } : {}
                            }}
                            InputLabelProps={{
                              style: isOptionUrdu ? { 
                                left: 'auto', 
                                right: 32, 
                                transformOrigin: 'top right',
                                background: 'white',
                                padding: '0 8px'
                              } : {}
                            }}
                            sx={isOptionUrdu ? { 
                              '& .MuiInputBase-input': { textAlign: 'right' },
                              '& .MuiOutlinedInput-notchedOutline': { 
                                textAlign: 'right'
                              },
                              '& .MuiInputLabel-outlined': {
                                transform: 'translate(-14px, -9px) scale(0.75)'
                              },
                              '& .MuiInputLabel-shrink': {
                                transform: 'translate(-14px, -9px) scale(0.75)'
                              }
                            } : {}}
                          />
                        </Grid>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
            
            {/* Short answer with improved RTL support */}
{newQuestion.type === "short" && (
  <>
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel>Question Subtype</InputLabel>
      <Select
        value={newQuestion.instructionType}
        onChange={(e) => setNewQuestion({...newQuestion, instructionType: e.target.value})}
        label="Question Subtype"
      >
        <MenuItem value="shortAnswer">Short Answer</MenuItem>
        <MenuItem value="oneWord">One Word Answer</MenuItem>
        <MenuItem value="describe">Description</MenuItem>
        <MenuItem value="jumbled">Jumbled Sentences</MenuItem>
        <MenuItem value="punctuation">Punctuation & Capitalization</MenuItem>
        <MenuItem value="scrambled">Scrambled Words</MenuItem>
        <MenuItem value="other">Other</MenuItem>
        {/* Include any additional custom types */}
        {customInstructionTypes.map(type => {
          // Skip types already in default list
          if (!["shortAnswer", "oneWord", "describe", "jumbled", 
              "punctuation", "scrambled", "other"].includes(type)) {
            return (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            );
          }
          return null;
        }).filter(Boolean)}
      </Select>
      <FormHelperText>
        {shortAnswerInstructions[newQuestion.instructionType] || "Select question subtype"}
      </FormHelperText>
    </FormControl>

    <TextField
      fullWidth
      label="Correct Answer"
      value={newQuestion.shortAnswer}
      onChange={(e) => setNewQuestion({...newQuestion, shortAnswer: e.target.value})}
      InputProps={{
        style: isUrduText(newQuestion.shortAnswer) ? { 
          direction: 'rtl', 
          textAlign: 'right', 
          fontFamily: 'Noto Nastaliq Urdu, Arial'
        } : {}
      }}
      InputLabelProps={{
        style: isUrduText(newQuestion.shortAnswer) ? { 
          left: 'auto', 
          right: 32, 
          transformOrigin: 'top right',
          background: 'white',
          padding: '0 8px'
        } : {}
      }}
      sx={isUrduText(newQuestion.shortAnswer) ? { 
        '& .MuiInputBase-input': { textAlign: 'right' },
        '& .MuiOutlinedInput-notchedOutline': { 
          textAlign: 'right'
        },
        '& .MuiInputLabel-outlined': {
          transform: 'translate(-14px, -9px) scale(0.75)'
        },
        '& .MuiInputLabel-shrink': {
          transform: 'translate(-14px, -9px) scale(0.75)'
        }
      } : {}}
    />
  </>
)}
            
            {/* Fill in the blanks with RTL support */}
            {newQuestion.type === "fillinblanks" && (
              <TextField
                fullWidth
                label="Correct Answer"
                value={newQuestion.blankAnswer}
                onChange={(e) => setNewQuestion({...newQuestion, blankAnswer: e.target.value})}
                helperText="Enter the word or phrase that should fill in the blank"
                InputProps={{
                  style: isUrduText(newQuestion.blankAnswer) ? { 
                    direction: 'rtl', 
                    textAlign: 'right', 
                    fontFamily: 'Noto Nastaliq Urdu, Arial' 
                  } : {}
                }}
                InputLabelProps={{
                  style: isUrduText(newQuestion.blankAnswer) ? { 
                    left: 'auto', 
                    right: 32, 
                    transformOrigin: 'top right',
                    background: 'white',
                    padding: '0 8px'
                  } : {}
                }}
                sx={isUrduText(newQuestion.blankAnswer) ? { 
                  '& .MuiInputBase-input': { textAlign: 'right' },
                  '& .MuiOutlinedInput-notchedOutline': { 
                    textAlign: 'right'
                  },
                  '& .MuiInputLabel-outlined': {
                    transform: 'translate(-14px, -9px) scale(0.75)'
                  },
                  '& .MuiInputLabel-shrink': {
                    transform: 'translate(-14px, -9px) scale(0.75)'
                  }
                } : {}}
              />
            )}

            {/* True/False with RTL support and Arabic/Urdu translations */}
            {newQuestion.type === "truefalse" && (
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <Typography variant="subtitle1">Correct Answer</Typography>
                <RadioGroup
                  row
                  value={newQuestion.isTrueAnswer}
                  onChange={(e) => setNewQuestion({...newQuestion, isTrueAnswer: e.target.value === "true"})}
                  sx={isUrduText(newQuestion.text) ? { flexDirection: 'row-reverse' } : {}}
                >
                  <FormControlLabel 
                    value={true} 
                    control={<Radio />} 
                    label={isUrduText(newQuestion.text) ? "صحیح" : "True"}
                    sx={isUrduText(newQuestion.text) ? { 
                      '& .MuiFormControlLabel-label': { 
                        fontFamily: 'Noto Nastaliq Urdu, Arial',
                        fontSize: '1.1rem'  
                      } 
                    } : {}}
                  />
                  <FormControlLabel 
                    value={false} 
                    control={<Radio />} 
                    label={isUrduText(newQuestion.text) ? "غلط" : "False"}
                    sx={isUrduText(newQuestion.text) ? { 
                      '& .MuiFormControlLabel-label': { 
                        fontFamily: 'Noto Nastaliq Urdu, Arial',
                        fontSize: '1.1rem'  
                      } 
                    } : {}}
                  />
                </RadioGroup>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionDialog(false)}>Cancel</Button>
          <Button 
            onClick={saveQuestion}
            variant="contained"
            sx={{ bgcolor: '#011E41' }}
          >
            {isNewQuestion ? "Submit for Approval" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Bulk Upload Dialog */}
      <Dialog
        open={bulkUploadDialog}
        onClose={() => setBulkUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Bulk Upload Questions</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a CSV file with the following format:
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontStyle: "italic" }}>
            Question Text, Type (multiple/short/fillinblanks/truefalse), Option 1, Option 2, Option 3, Option 4, Correct Option Index (0-3), Short Answer, Blank Answer, True/False Answer, Short Answer Type
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Instructions:</strong>
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>For <strong>multiple choice</strong> questions: fill columns 1-7</li>
              <li>For <strong>short answer</strong> questions: fill columns 1-2, 8, and 11 (type=short)</li>
              <li>For <strong>fill in the blanks</strong> questions: fill columns 1-2 and 9 (type=fillinblanks)</li>
              <li>For <strong>true/false</strong> questions: fill columns 1-2 and 10 (type=truefalse)</li>
              <li>For <strong>Short Answer Type</strong> use: shortAnswer, oneWord, describe, jumbled, punctuation, scrambled, or other</li>
            </ul>
          </Alert>
          
          <Button 
            variant="outlined" 
            color="primary" 
            sx={{ mb: 2 }}
            onClick={() => {
              // Create a CSV template for download
              const template = 'Question Text,Type,Option 1,Option 2,Option 3,Option 4,Correct Option Index,Short Answer,Blank Answer,True/False Answer,Short Answer Type\n' +
                'Sample multiple choice question,multiple,Option A,Option B,Option C,Option D,0,,,,""\n' +
                'Sample short answer question,short,,,,,,Answer goes here,,,"shortAnswer"\n' + 
                'Sample fill in blanks question,fillinblanks,,,,,,,answer word,,""\n' + 
                'Sample true/false question,truefalse,,,,,,,,true,""\n';
                
              const blob = new Blob([template], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'question_template.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Download Template
          </Button>

          <TextField
            type="file"
            inputProps={{ accept: ".csv" }}
            fullWidth
            onChange={handleFileChange}
            sx={{ mb: 2 }}
          />
          
          {bulkUploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {bulkUploadError}
            </Alert>
          )}
          
          <Button
            variant="outlined"
            onClick={parseCSVFile}
            sx={{ mb: 2 }}
          >
            Parse File
          </Button>
          
          {bulkUploadQuestions.length > 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {bulkUploadQuestions.length} questions parsed successfully.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkUploadDialog(false)}>Cancel</Button>
          <Button
            onClick={saveBulkQuestions}
            variant="contained"
            sx={{ bgcolor: "#011E41" }}
            disabled={bulkUploadQuestions.length === 0}
          >
            Upload Questions
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Toast Notifications */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={6000} 
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default QuestionBank;