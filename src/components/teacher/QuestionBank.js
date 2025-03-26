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
  Checkbox
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
  School as SchoolIcon
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
    isTrueAnswer: true  // New field for true/false questions
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
      
      // Parse the grades which are in "Department|Grade" format
      const gradesArray = teacherData.grades || [];
      const parsedGrades = {};
      
      // Transform the flat array into a nested structure
      gradesArray.forEach(gradeString => {
        if (gradeString && gradeString.includes('|')) {
          const [department, grade] = gradeString.split('|');
          
          if (!parsedGrades[department]) {
            parsedGrades[department] = [];
          }
          
          parsedGrades[department].push(grade);
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
      isTrueAnswer: question.isTrueAnswer || true
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
      isTrueAnswer: true
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
    
    // Prepare question data with author name and pending status
    const questionData = {
      text: newQuestion.text.trim(),
      type: newQuestion.type,
      ...(newQuestion.type === "multiple" ? {
        options: newQuestion.options.map(opt => opt.trim()),
        correctOption: newQuestion.correctOption
      } : newQuestion.type === "short" ? {
        shortAnswer: newQuestion.shortAnswer.trim()
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
    const rows = fileContent.split("\n").map((row) => row.split(","));

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
      "True/False Answer",
    ];
    if (!headers || headers.length < expectedHeaders.length || !headers.every((header, index) => header.trim() === expectedHeaders[index])) {
      setBulkUploadError("Invalid CSV format. Please ensure the headers match the required format.");
      return;
    }

    // Skip the header row and parse the questions
    const parsedQuestions = rows.slice(1).map((row) => ({
      text: row[0]?.trim(),
      type: row[1]?.trim(),
      options: row.slice(2, 6).map((opt) => opt?.trim()), // Assuming 4 options for multiple-choice
      correctOption: parseInt(row[6]?.trim(), 10), // Index of the correct option
      shortAnswer: row[7]?.trim(), // For short answer questions
      isTrueAnswer: row[8]?.trim()?.toLowerCase() === "true", // For true/false questions
    }));

    // Filter out empty rows
    const validQuestions = parsedQuestions.filter((question) => question.text);

    setBulkUploadQuestions(validQuestions);
    setBulkUploadError("");
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
        const questionData = {
          text: question.text,
          type: question.type,
          ...(question.type === "multiple" ? {
            options: question.options,
            correctOption: question.correctOption,
          } : question.type === "short" ? {
            shortAnswer: question.shortAnswer,
          } : {
            isTrueAnswer: question.isTrueAnswer,
          }),
          author: currentUser.email,
          createdAt: new Date(),
          status: "pending", // Add pending status for new questions
        };

        const newDocRef = doc(questionsRef); // Create a new document reference
        batch.set(newDocRef, questionData); // Add the document to the batch
      });

      // Commit the batch
      await batch.commit();

      setToast({
        open: true,
        message: "Questions uploaded successfully and sent for approval.",
        severity: "success",
      });

      setBulkUploadDialog(false);
      await loadBookStructure(selectedBook); // Refresh the book structure
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
                  <strong>Note:</strong> New questions require admin approval before they can be used in quizzes.
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
                                          subheader={question.type === "multiple" ? "Multiple Choice" : question.type === "short" ? "Short Answer" : "True/False"}
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
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Question Text"
              value={newQuestion.text}
              onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
              sx={{ mb: 3 }}
            />
            
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
                  value="truefalse" 
                  control={<Radio />} 
                  label="True/False" 
                />
              </RadioGroup>
            </FormControl>
            
            {newQuestion.type === "multiple" && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Options</Typography>
                <Grid container spacing={2}>
                  {newQuestion.options.map((option, index) => (
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
                        />
                      </Grid>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
            
            {newQuestion.type === "short" && (
              <TextField
                fullWidth
                label="Correct Answer"
                value={newQuestion.shortAnswer}
                onChange={(e) => setNewQuestion({...newQuestion, shortAnswer: e.target.value})}
              />
            )}

            {newQuestion.type === "truefalse" && (
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <Typography variant="subtitle1">Correct Answer</Typography>
                <RadioGroup
                  row
                  value={newQuestion.isTrueAnswer}
                  onChange={(e) => setNewQuestion({...newQuestion, isTrueAnswer: e.target.value === "true"})}
                >
                  <FormControlLabel 
                    value={true} 
                    control={<Radio />} 
                    label="True" 
                  />
                  <FormControlLabel 
                    value={false} 
                    control={<Radio />} 
                    label="False" 
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
            Question Text, Type (multiple/short/truefalse), Option 1, Option 2, Option 3, Option 4, Correct Option Index (0-3), Short Answer, True/False Answer
          </Typography>
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