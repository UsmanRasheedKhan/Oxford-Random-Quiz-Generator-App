import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Card,
  CardContent,
  CardHeader, // Added missing import
  Chip,
  Checkbox,
  FormControlLabel,
  TextField,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Fade,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List, // Added missing import
  ListItem, // Added missing import
  ListItemIcon, // Added missing import
  ListItemText, // Added missing import
  Radio, // Added missing import
  ExpandMore as ExpandMoreIcon, 
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Check as CheckIcon, // Added missing import
  Close as CloseIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Done as DoneAllIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Check as ApproveIcon, // Add ApproveIcon as alias for Check
} from '@mui/icons-material';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, writeBatch, collectionGroup, setDoc, deleteDoc } from 'firebase/firestore';

const ApprovalRequests = () => {
  const navigate = useNavigate();
  
  // State for filters
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [grades, setGrades] = useState([]);
  const [filteredGrades, setFilteredGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState('');
  
  // State for questions
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // State for dialogs
  const [detailDialog, setDetailDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);

  // Add these new states at the beginning of the component
  const [editedQuestionText, setEditedQuestionText] = useState('');
  const [editedAnswerText, setEditedAnswerText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Helper function to format display names
  const formatDisplayName = (name) => {
    return name ? name.replace(/_/g, ' ') : "Unnamed";
  };

  // Add this helper function to extract path components at the beginning of your component
  const extractPathComponents = (path) => {
    if (!path) return {};
    
    // Match pattern: books/dept/grades/grade/books/book/chapters/chapter/topics/topic/questions/id
    const regex = /books\/(.+?)\/grades\/(.+?)\/books\/(.+?)\/chapters\/(.+?)\/topics\/(.+?)\/questions/;
    const matches = path.match(regex);
    
    if (matches && matches.length >= 6) {
      return {
        department: matches[1],
        grade: matches[2],
        book: matches[3],
        chapter: matches[4],
        topic: matches[5]
      };
    }
    
    return {};
  };

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

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        console.log("Fetching departments from books collection");
        // Get all documents in the top-level books collection - these are department documents
        const departmentsSnapshot = await getDocs(collection(db, 'books'));
        
        if (departmentsSnapshot.empty) {
          console.warn("No departments found in the books collection");
          setError("No departments available. Please add some first.");
          return;
        }
        
        // Each document ID in the top-level books collection is a department
        const departmentsList = departmentsSnapshot.docs.map(doc => doc.id);
        console.log("Departments fetched:", departmentsList);
        setDepartments(departmentsList);
      } catch (err) {
        console.error("Error fetching departments:", err);
        setError("Failed to load departments: " + err.message);
      }
    };

    fetchDepartments();
  }, []);
  
  // Filter grades when department is selected
  useEffect(() => {
    const fetchGradesForDepartment = async () => {
      if (!selectedDepartment) return;
      
      setFilteredGrades([]);
      setSelectedGrade('');
      
      try {
        console.log(`Fetching grades for department: ${selectedDepartment}`);
        // Get grades sub-collection for the selected department
        const gradesSnapshot = await getDocs(
          collection(db, 'books', selectedDepartment, 'grades')
        );
        
        if (gradesSnapshot.empty) {
          console.warn(`No grades found for department: ${selectedDepartment}`);
          return;
        }
        
        // Each document in the grades sub-collection is a grade
        const gradesList = gradesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.id // The grade name is the document ID
        }));
        
        console.log(`Grades for ${selectedDepartment}:`, gradesList);
        setFilteredGrades(gradesList);
      } catch (err) {
        console.error(`Error fetching grades for ${selectedDepartment}:`, err);
        setError(`Failed to load grades: ${err.message}`);
      }
    };
    
    fetchGradesForDepartment();
  }, [selectedDepartment]);
  
  // Filter books when grade is selected
  useEffect(() => {
    const fetchBooksForGrade = async () => {
      if (!selectedDepartment || !selectedGrade) return;
      
      setFilteredBooks([]);
      setSelectedBook('');
      
      try {
        console.log(`Fetching books for ${selectedDepartment}, grade ${selectedGrade}`);
        // Get books sub-collection for the selected grade
        const booksSnapshot = await getDocs(
          collection(db, 'books', selectedDepartment, 'grades', selectedGrade, 'books')
        );
        
        if (booksSnapshot.empty) {
          console.warn(`No books found for ${selectedDepartment}, grade ${selectedGrade}`);
          return;
        }
        
        // Each document in the books sub-collection is a book
        const booksList = booksSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.id, // The book name is the document ID
          path: `books/${selectedDepartment}/grades/${selectedGrade}/books/${doc.id}` // Store path for later
        }));
        
        console.log(`Books for ${selectedGrade}:`, booksList);
        setFilteredBooks(booksList);
      } catch (err) {
        console.error(`Error fetching books for ${selectedGrade}:`, err);
        setError(`Failed to load books: ${err.message}`);
      }
    };
    
    fetchBooksForGrade();
  }, [selectedDepartment, selectedGrade]);
  
  // Fetch questions based on filters
  const fetchQuestions = async () => {
    if (!selectedDepartment || !selectedGrade || !selectedBook) {
      setError("Please select department, grade, and book to view approval requests");
      return;
    }
    
    setLoading(true);
    setError('');
    setQuestions([]);
    setSelectedQuestions([]);
    setSelectAll(false);
    
    try {
      const selectedBookObj = filteredBooks.find(book => book.id === selectedBook);
      if (!selectedBookObj) {
        setError("Selected book not found");
        setLoading(false);
        return;
      }

      console.log(`Fetching questions for book: ${selectedBook}`);
      
      // We'll need to search all questions in this book's path
      // We use collectionGroup to find all questions nested beneath our book
      const questionsQuery = query(
        collectionGroup(db, 'questions'),
        where('status', '==', 'pending')
      );
      
      const questionsSnapshot = await getDocs(questionsQuery);
      
      if (questionsSnapshot.empty) {
        setError("No pending approval requests found");
        setLoading(false);
        return;
      }
      
      // Filter questions to only include those from the selected book path
      const bookPath = `books/${selectedDepartment}/grades/${selectedGrade}/books/${selectedBook}`;
      const questionsForBook = questionsSnapshot.docs.filter(questionDoc => {
        const path = questionDoc.ref.path;
        return path.includes(bookPath);
      });
      
      if (questionsForBook.length === 0) {
        setError("No pending approval requests found for this book");
        setLoading(false);
        return;
      }
      
      // Process the filtered questions
      const questionsList = [];
      for (const questionDoc of questionsForBook) {
        const questionData = {
          id: questionDoc.id,
          path: questionDoc.ref.path,
          ...questionDoc.data()
        };
        
        // Convert author email to name if possible
        if (questionData.author) {
          try {
            // First try teachers collection
            const teachersQuery = query(
              collection(db, 'users', 'usersData', 'teachers'),
              where('email', '==', questionData.author)
            );
            let authorSnapshot = await getDocs(teachersQuery);
            
            // If not found, try admins collection
            if (authorSnapshot.empty) {
              const adminsQuery = query(
                collection(db, 'users', 'usersData', 'admins'),
                where('email', '==', questionData.author)
              );
              authorSnapshot = await getDocs(adminsQuery);
            }
            
            if (!authorSnapshot.empty) {
              questionData.authorName = authorSnapshot.docs[0].data().name || "Unknown";
              questionData.authorEmail = questionData.author;
            } else {
              questionData.authorName = questionData.author;
              questionData.authorEmail = questionData.author;
            }
          } catch (err) {
            console.error("Error fetching author details:", err);
            questionData.authorName = questionData.author;
            questionData.authorEmail = questionData.author;
          }
        } else {
          questionData.authorName = "Unknown";
          questionData.authorEmail = "Unknown";
        }
        
        questionsList.push(questionData);
      }
      
      console.log(`Found ${questionsList.length} questions pending approval`);
      setQuestions(questionsList);
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError("Failed to load approval requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Alternative hierarchical query approach
  const fetchQuestionsHierarchical = async () => {
    if (!selectedDepartment || !selectedGrade) {
      setError("Please select department and grade to view approval requests");
      return;
    }
    
    setLoading(true);
    setError('');
    setQuestions([]);
    setSelectedQuestions([]);
    setSelectAll(false);
    
    try {
      console.log(`Fetching questions for ${selectedBook === 'ALL_BOOKS' ? 'all books' : `book: ${selectedBook}`}`);
      
      let allQuestions = [];
      
      // If "All Books" is selected, process all books for the department and grade
      if (selectedBook === 'ALL_BOOKS') {
        console.log(`Processing all books for ${selectedDepartment}, grade ${selectedGrade}`);
        
        // Process each book
        for (const bookObj of filteredBooks) {
          const bookId = bookObj.id;
          
          // Get all chapters for this book
          const chaptersPath = `books/${selectedDepartment}/grades/${selectedGrade}/books/${bookId}/chapters`;
          const chaptersSnapshot = await getDocs(collection(db, chaptersPath));
          
          if (!chaptersSnapshot.empty) {
            // For each chapter, get topics
            for (const chapterDoc of chaptersSnapshot.docs) {
              const chapterId = chapterDoc.id;
              const topicsPath = `${chaptersPath}/${chapterId}/topics`;
              const topicsSnapshot = await getDocs(collection(db, topicsPath));
              
              if (!topicsSnapshot.empty) {
                // For each topic, get questions
                for (const topicDoc of topicsSnapshot.docs) {
                  const topicId = topicDoc.id;
                  const questionsPath = `${topicsPath}/${topicId}/questions`;
                  
                  // Query for pending questions
                  const questionsSnapshot = await getDocs(
                    query(collection(db, questionsPath), where('status', '==', 'pending'))
                  );
                  
                  if (!questionsSnapshot.empty) {
                    // Map questions and include path and book info
                    const questionDocs = questionsSnapshot.docs.map(doc => ({
                      id: doc.id,
                      path: doc.ref.path,
                      book: bookId,
                      ...doc.data()
                    }));
                    
                    allQuestions = [...allQuestions, ...questionDocs];
                  }
                }
              }
            }
          }
        }
      } else {
        // Original logic for a single book
        // First, get all chapters for this book
        const chaptersPath = `books/${selectedDepartment}/grades/${selectedGrade}/books/${selectedBook}/chapters`;
        const chaptersSnapshot = await getDocs(collection(db, chaptersPath));
        
        if (chaptersSnapshot.empty) {
          setError("No chapters found for this book");
          setLoading(false);
          return;
        }
        
        // For each chapter, get topics
        for (const chapterDoc of chaptersSnapshot.docs) {
          const chapterId = chapterDoc.id;
          const topicsPath = `${chaptersPath}/${chapterId}/topics`;
          const topicsSnapshot = await getDocs(collection(db, topicsPath));
          
          if (!topicsSnapshot.empty) {
            // For each topic, get questions
            for (const topicDoc of topicsSnapshot.docs) {
              const topicId = topicDoc.id;
              const questionsPath = `${topicsPath}/${topicId}/questions`;
              
              // Query for pending questions
              const questionsSnapshot = await getDocs(
                query(collection(db, questionsPath), where('status', '==', 'pending'))
              );
              
              if (!questionsSnapshot.empty) {
                // Map questions and include path
                const questionDocs = questionsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  path: doc.ref.path,
                  book: selectedBook,
                  ...doc.data()
                }));
                
                allQuestions = [...allQuestions, ...questionDocs];
              }
            }
          }
        }
      }
      
      if (allQuestions.length === 0) {
        setError(`No pending approval requests found ${selectedBook === 'ALL_BOOKS' ? 'for any book' : 'for this book'}`);
        setLoading(false);
        return;
      }
      
      // Add this code to process questions and update state
      const processedQuestions = [];
      for (const questionData of allQuestions) {
        // Convert author email to name if possible
        if (questionData.author) {
          try {
            // First try teachers collection
            const teachersQuery = query(
              collection(db, 'users', 'usersData', 'teachers'),
              where('email', '==', questionData.author)
            );
            let authorSnapshot = await getDocs(teachersQuery);
            
            // If not found, try admins collection
            if (authorSnapshot.empty) {
              const adminsQuery = query(
                collection(db, 'users', 'usersData', 'admins'),
                where('email', '==', questionData.author)
              );
              authorSnapshot = await getDocs(adminsQuery);
            }
            
            if (!authorSnapshot.empty) {
              questionData.authorName = authorSnapshot.docs[0].data().name || "Unknown";
              questionData.authorEmail = questionData.author;
            } else {
              questionData.authorName = questionData.author;
              questionData.authorEmail = questionData.author;
            }
          } catch (err) {
            console.error("Error fetching author details:", err);
            questionData.authorName = questionData.author;
            questionData.authorEmail = questionData.author;
          }
        } else {
          questionData.authorName = "Unknown";
          questionData.authorEmail = "Unknown";
        }
        
        processedQuestions.push(questionData);
      }
      
      console.log(`Processed ${processedQuestions.length} questions for display`);
      setQuestions(processedQuestions);
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError("Failed to load approval requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle selection of all questions
  const handleSelectAll = (event) => {
    const checked = event.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedQuestions(questions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };
  
  // Handle selection of individual question
  const handleSelectQuestion = (questionId) => {
    const newSelected = [...selectedQuestions];
    
    if (newSelected.includes(questionId)) {
      // Remove if already selected
      setSelectedQuestions(newSelected.filter(id => id !== questionId));
    } else {
      // Add if not selected
      newSelected.push(questionId);
      setSelectedQuestions(newSelected);
    }
  };
  
  // Update handleViewDetails function
  const handleViewDetails = (question) => {
    setCurrentQuestion(question);
    setEditedQuestionText(question.text || '');
    
    // Set the appropriate answer field based on question type
    if (question.type === 'multiple') {
      // For multiple choice, we'll edit options in the UI
      setEditedAnswerText('');
    } else if (question.type === 'short') {
      setEditedAnswerText(question.shortAnswer || '');
    } else if (question.type === 'truefalse') {
      // For true/false, we don't edit the answer text directly
      setEditedAnswerText('');
    }
    
    setIsEditing(false);
    setDetailDialog(true);
  };
  
  // Handle approving a single question
  const handleApproveOne = async (questionId) => {
    const questionToApprove = questions.find(q => q.id === questionId);
    if (!questionToApprove || !questionToApprove.path) {
      setError("Cannot find question path for approval");
      return;
    }
    
    setApproveLoading(true);
    try {
      // Get the document reference from the full path
      const questionRef = doc(db, questionToApprove.path);
      
      await updateDoc(questionRef, {
        status: 'approved',
        approvedAt: new Date()
      });
      
      // Update local state
      setQuestions(questions.filter(q => q.id !== questionId));
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
      
    } catch (err) {
      console.error("Error approving question:", err);
      setError("Failed to approve question: " + err.message);
    } finally {
      setApproveLoading(false);
    }
  };
  
  // Handle approving selected questions
  const handleApproveSelected = async () => {
    if (selectedQuestions.length === 0) {
      setError("No questions selected for approval");
      return;
    }
    
    setApproveLoading(true);
    try {
      const batch = writeBatch(db);
      
      for (const questionId of selectedQuestions) {
        const questionToApprove = questions.find(q => q.id === questionId);
        if (questionToApprove && questionToApprove.path) {
          const questionRef = doc(db, questionToApprove.path);
          batch.update(questionRef, {
            status: 'approved',
            approvedAt: new Date()
          });
        }
      }
      
      await batch.commit();
      
      // Update local state
      setQuestions(questions.filter(q => !selectedQuestions.includes(q.id)));
      setSelectedQuestions([]);
      setSelectAll(false);
      
    } catch (err) {
      console.error("Error batch approving questions:", err);
      setError("Failed to approve questions: " + err.message);
    } finally {
      setApproveLoading(false);
      setApproveDialog(false);
    }
  };

  // Add this function to save question edits
  const handleSaveQuestionChanges = async () => {
    if (!currentQuestion || !currentQuestion.path) return;
    
    setSaveLoading(true);
    try {
      const questionRef = doc(db, currentQuestion.path);
      
      // Prepare update based on question type
      const updateData = {
        text: editedQuestionText
      };
      
      if (currentQuestion.type === 'short') {
        updateData.shortAnswer = editedAnswerText;
      } else if (currentQuestion.type === 'multiple' && editedAnswerText) {
        // Handle option edits if implemented
        // This would be more complex and require tracking each option
      }
      
      await updateDoc(questionRef, updateData);
      
      // Update the local state
      setCurrentQuestion({
        ...currentQuestion,
        text: editedQuestionText,
        ...(currentQuestion.type === 'short' ? { shortAnswer: editedAnswerText } : {})
      });
      
      // Update in questions array
      setQuestions(questions.map(q => 
        q.id === currentQuestion.id 
          ? {
              ...q,
              text: editedQuestionText,
              ...(q.type === 'short' ? { shortAnswer: editedAnswerText } : {})
            } 
          : q
      ));
      
      setIsEditing(false);
      
    } catch (err) {
      console.error("Error saving question changes:", err);
      setError("Failed to save changes: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Add this function to handle question deletion
  const handleDeleteOne = async (questionId) => {
    const questionToDelete = questions.find(q => q.id === questionId);
    if (!questionToDelete || !questionToDelete.path) {
      setError("Cannot find question path for deletion");
      return;
    }
    
    try {
      // Get the document reference from the full path
      const questionRef = doc(db, questionToDelete.path);
      
      await deleteDoc(questionRef);
      
      // Update local state
      setQuestions(questions.filter(q => q.id !== questionId));
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
      
    } catch (err) {
      console.error("Error deleting question:", err);
      setError("Failed to delete question: " + err.message);
    }
  };

  // Add this function to handle batch deletion of selected questions
  const handleDeleteSelected = async () => {
    if (selectedQuestions.length === 0) {
      setError("No questions selected for deletion");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedQuestions.length} selected questions? This action cannot be undone.`)) {
      return;
    }
    
    setApproveLoading(true);
    try {
      const batch = writeBatch(db);
      
      for (const questionId of selectedQuestions) {
        const questionToDelete = questions.find(q => q.id === questionId);
        if (questionToDelete && questionToDelete.path) {
          const questionRef = doc(db, questionToDelete.path);
          batch.delete(questionRef);
        }
      }
      
      await batch.commit();
      
      // Update local state
      setQuestions(questions.filter(q => !selectedQuestions.includes(q.id)));
      setSelectedQuestions([]);
      setSelectAll(false);
      
      // Show success message
      setError("Selected questions have been deleted successfully");
      
    } catch (err) {
      console.error("Error batch deleting questions:", err);
      setError("Failed to delete questions: " + err.message);
    } finally {
      setApproveLoading(false);
    }
  };

  // Update question card display with RTL support for Urdu text
  const QuestionCard = ({ question, onApprove, onReject }) => {
    const isQuestionUrdu = isUrduText(question.text);
    
    return (
      <Card sx={{ mb: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <CardHeader
          title={
            <Typography 
              variant="h6" 
              sx={{ 
                direction: isQuestionUrdu ? 'rtl' : 'ltr',
                textAlign: isQuestionUrdu ? 'right' : 'left',
                fontFamily: isQuestionUrdu ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                fontSize: isQuestionUrdu ? '1.2rem' : 'inherit'
              }}
            >
              {question.text}
            </Typography>
          }
          subheader={
            <Box sx={{ mt: 1 }}>
              <Chip 
                label={`${question.type.charAt(0).toUpperCase() + question.type.slice(1)} Question`} 
                size="small" 
                color="primary" 
                sx={{ mr: 1 }}
              />
              <Chip 
                label={`${question.difficulty || 'Medium'} Difficulty`} 
                size="small" 
                color={
                  question.difficulty === 'Easy' ? 'success' : 
                  question.difficulty === 'Hard' ? 'error' : 'warning'
                }
              />
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => onApprove(question)}
                startIcon={<CheckIcon />}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => onReject(question)}
                startIcon={<CloseIcon />}
              >
                Reject
              </Button>
            </Box>
          }
        />
        <CardContent>
          {/* Multiple choice question */}
          {question.type === "multiple" && (
            <List dense sx={{ pt: 0 }}>
              {question.options.map((option, index) => {
                const isOptionUrdu = isUrduText(option);
                const isCorrect = index === question.correctOption;
                
                return (
                  <ListItem 
                    key={index}
                    sx={{ 
                      bgcolor: isCorrect ? 'success.light' : 'transparent',
                      borderRadius: 1,
                      mb: 0.5,
                      direction: isOptionUrdu ? 'rtl' : 'ltr',
                      textAlign: isOptionUrdu ? 'right' : 'left'
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Radio
                        checked={isCorrect}
                        size="small"
                        readOnly
                        sx={{ 
                          color: isCorrect ? 'success.main' : 'inherit',
                          '&.Mui-checked': {
                            color: 'success.main'
                          }
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography 
                          sx={{ 
                            fontWeight: isCorrect ? 'bold' : 'normal',
                            fontFamily: isOptionUrdu ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                            fontSize: isOptionUrdu ? '1.1rem' : 'inherit'
                          }}
                        >
                          {option}
                        </Typography>
                      } 
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
          
          {/* Short answer question */}
          {question.type === "short" && (
            <Typography 
              variant="body1" 
              sx={{ 
                bgcolor: 'success.light', 
                p: 1.5,
                borderRadius: 1,
                fontWeight: 'medium',
                direction: isUrduText(question.shortAnswer) ? 'rtl' : 'ltr',
                textAlign: isUrduText(question.shortAnswer) ? 'right' : 'left',
                fontFamily: isUrduText(question.shortAnswer) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                fontSize: isUrduText(question.shortAnswer) ? '1.1rem' : 'inherit'
              }}
            >
              Answer: {question.shortAnswer}
            </Typography>
          )}
          
          {/* Fill in the blanks question */}
          {question.type === "fillinblanks" && (
            <Typography 
              variant="body1" 
              sx={{ 
                bgcolor: 'success.light', 
                p: 1.5,
                borderRadius: 1,
                fontWeight: 'medium',
                direction: isUrduText(question.blankAnswer) ? 'rtl' : 'ltr',
                textAlign: isUrduText(question.blankAnswer) ? 'right' : 'left',
                fontFamily: isUrduText(question.blankAnswer) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                fontSize: isUrduText(question.blankAnswer) ? '1.1rem' : 'inherit'
              }}
            >
              Blank answer: {question.blankAnswer}
            </Typography>
          )}
          
          {/* True/False question */}
          {question.type === "truefalse" && (
            <Typography 
              variant="body1" 
              sx={{ 
                bgcolor: 'success.light', 
                p: 1.5,
                borderRadius: 1,
                fontWeight: 'medium',
                direction: isQuestionUrdu ? 'rtl' : 'ltr',
                textAlign: isQuestionUrdu ? 'right' : 'left',
                fontFamily: isQuestionUrdu ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                fontSize: isQuestionUrdu ? '1.1rem' : 'inherit'
              }}
            >
              Answer: {isQuestionUrdu 
                ? (question.isTrueAnswer ? "صحیح" : "غلط")
                : (question.isTrueAnswer ? "True" : "False")
              }
            </Typography>
          )}
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Submitted by: {question.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {question.createdAt && new Date(question.createdAt.seconds * 1000).toLocaleString()}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Fade in={true} timeout={800}>
        <Paper elevation={4} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#f8f9fa', p: 3, borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <IconButton onClick={() => navigate('/admin')} sx={{ mr: 2 }}>
                <BackIcon />
              </IconButton>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: '#011E41' }}>
                <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Question Approval Requests
              </Typography>
            </Box>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Select department, grade, and book to view questions pending approval
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    label="Department"
                  >
                    <MenuItem value="" disabled>Select Department</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined" disabled={!selectedDepartment}>
                  <InputLabel>{selectedDepartment ? 'Grade' : 'Select Department First'}</InputLabel>
                  <Select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    label={selectedDepartment ? 'Grade' : 'Select Department First'}
                  >
                    <MenuItem value="" disabled>Select Grade</MenuItem>
                    {filteredGrades.map((grade) => (
                      <MenuItem key={grade.id} value={grade.name}>
                        {formatDisplayName(grade.name)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined" disabled={!selectedGrade}>
                  <InputLabel>{selectedGrade ? 'Book' : 'Select Grade First'}</InputLabel>
                  <Select
                    value={selectedBook}
                    onChange={(e) => setSelectedBook(e.target.value)}
                    label={selectedGrade ? 'Book' : 'Select Grade First'}
                  >
                    <MenuItem value="" disabled>
                      {filteredBooks.length > 0 ? "Select Book" : "No books available"}
                    </MenuItem>
                    
                    {filteredBooks.length > 0 && (
                      <MenuItem value="ALL_BOOKS" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
                        -- All Books --
                      </MenuItem>
                    )}
                    
                    {filteredBooks.map((book) => (
                      <MenuItem key={book.id} value={book.id}>
                        {formatDisplayName(book.name || "Untitled Book")}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {selectedGrade && filteredBooks.length === 0 && (
                  <Typography 
                    variant="caption" 
                    color="error" 
                    sx={{ display: 'block', mt: 1 }}
                  >
                    No books found for this department and grade
                  </Typography>
                )}
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={fetchQuestionsHierarchical}
                disabled={!selectedBook || loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                sx={{ px: 3 }}
              >
                {loading ? 'Loading...' : 'Show Approval Requests'}
              </Button>
            </Box>
          </Box>
          
          <Box sx={{ p: 3 }}>
            {error && (
              <Alert severity="info" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            {questions.length > 0 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={selectAll} 
                        onChange={handleSelectAll}
                        color="primary"
                      />
                    }
                    label={`Select All (${questions.length})`}
                  />
                  
                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<DoneAllIcon />}
                      onClick={() => setApproveDialog(true)}
                      disabled={selectedQuestions.length === 0 || approveLoading}
                    >
                      Approve Selected
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteSelected}
                      disabled={selectedQuestions.length === 0 || approveLoading}
                      sx={{ ml: 2 }}
                    >
                      Delete Selected
                    </Button>
                  </Box>
                </Box>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectAll} onChange={handleSelectAll} />
                        </TableCell>
                        <TableCell>Question Text</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Author</TableCell>
                        <TableCell>Submitted Date</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {questions.map((question) => (
                        <TableRow 
                          key={question.id}
                          hover
                          selected={selectedQuestions.includes(question.id)}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox 
                              checked={selectedQuestions.includes(question.id)}
                              onChange={() => handleSelectQuestion(question.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography noWrap sx={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {question.text || "No question text"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={
                                question.type === 'multiple' ? 'Multiple Choice' : 
                                question.type === 'short' ? 'Short Answer' :
                                question.type === 'truefalse' ? 'True/False' : 
                                question.type || "Unknown"
                              } 
                              size="small" 
                              sx={{ 
                                bgcolor: question.type === 'multiple' ? '#e3f2fd' : 
                                        question.type === 'short' ? '#e0f7fa' :
                                        question.type === 'truefalse' ? '#f1f8e9' : 
                                        '#f5f5f5',
                                color: question.type === 'multiple' ? '#1976d2' : 
                                      question.type === 'short' ? '#00838f' :
                                      question.type === 'truefalse' ? '#388e3c' : 
                                      'text.secondary'
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title={question.authorEmail || "Unknown"}>
                              <Typography variant="body2">
                                {question.authorName || "Unknown"}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {question.createdAt ? 
                              (typeof question.createdAt === 'object' && question.createdAt.seconds ? 
                                new Date(question.createdAt.seconds * 1000).toLocaleDateString() :
                                new Date(question.createdAt).toLocaleDateString()) : 
                              "Unknown"}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              <Tooltip title="View Details">
                                <IconButton
                                  onClick={() => handleViewDetails(question)}
                                  size="small"
                                  sx={{ color: '#1976d2' }}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Approve">
                                <IconButton
                                  onClick={() => handleApproveOne(question.id)}
                                  size="small"
                                  sx={{ color: '#4caf50' }}
                                  disabled={approveLoading}
                                >
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </Paper>
      </Fade>
      
      {/* Question Details Dialog - Enhanced Version */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ 
          sx: { borderRadius: 2, maxHeight: '80vh' } 
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          flexDirection: 'column',
          borderBottom: '1px solid #e0e0e0',
          pb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <VisibilityIcon sx={{ mr: 1.5, color: '#1976d2' }} />
              <Typography variant="h6">Question Preview</Typography>
            </Box>
            
            {currentQuestion && (
              <Chip 
                label={
                  currentQuestion.type === 'multiple' ? 'Multiple Choice' : 
                  currentQuestion.type === 'short' ? 'Short Answer' : 
                  currentQuestion.type === 'truefalse' ? 'True/False' : 
                  currentQuestion.type || 'Unknown Type'
                } 
                size="small" 
                sx={{ 
                  bgcolor: currentQuestion.type === 'multiple' ? '#e3f2fd' : 
                          currentQuestion.type === 'short' ? '#e0f7fa' :
                          currentQuestion.type === 'truefalse' ? '#f1f8e9' : 
                          '#f5f5f5',
                  color: currentQuestion.type === 'multiple' ? '#1976d2' : 
                        currentQuestion.type === 'short' ? '#00838f' :
                        currentQuestion.type === 'truefalse' ? '#388e3c' : 
                        'text.secondary'
                }}
              />
            )}
          </Box>
          
          {currentQuestion && (() => {
            const pathComponents = extractPathComponents(currentQuestion.path);
            if (Object.keys(pathComponents).length > 0) {
              return (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#616161' }}>
                    Location:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={pathComponents.department} sx={{ mr: 0.5, height: 20, bgcolor: '#f5f5f5' }} />
                    <Typography variant="caption" sx={{ mx: 0.5 }}>›</Typography>
                    <Chip size="small" label={formatDisplayName(pathComponents.grade)} sx={{ mr: 0.5, height: 20, bgcolor: '#f5f5f5' }} />
                    <Typography variant="caption" sx={{ mx: 0.5 }}>›</Typography>
                    <Chip size="small" label={formatDisplayName(pathComponents.book)} sx={{ mr: 0.5, height: 20, bgcolor: '#f5f5f5' }} />
                    <Typography variant="caption" sx={{ mx: 0.5 }}>›</Typography>
                    <Chip size="small" label={formatDisplayName(pathComponents.chapter)} sx={{ mr: 0.5, height: 20, bgcolor: '#e8f5e9', color: '#2e7d32' }} />
                    <Typography variant="caption" sx={{ mx: 0.5 }}>›</Typography>
                    <Chip size="small" label={formatDisplayName(pathComponents.topic)} sx={{ height: 20, bgcolor: '#e3f2fd', color: '#1565c0' }} />
                  </Box>
                </Box>
              );
            }
            return null;
          })()}
        </DialogTitle>

        <DialogContent dividers sx={{ pb: 0, pt: 3 }}>
          {currentQuestion && (
            <Box sx={{ position: 'relative' }}>
              {/* Question Content Card - Enhanced styling */}
              <Paper 
                elevation={0} 
                variant="outlined" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2, 
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                {/* Question Header */}
                <Box sx={{ 
                  bgcolor: '#f8f9fa', 
                  p: 2, 
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      bgcolor: '#e3f2fd', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 1.5
                    }}>
                      <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 'bold' }}>Q</Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                      Question Text
                    </Typography>
                  </Box>
                  
                  {/* Add delete button in header */}
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Are you sure you want to delete this question? This action cannot be undone.")) {
                        handleDeleteOne(currentQuestion.id);
                        setDetailDialog(false);
                      }
                    }}
                  >
                    Delete Question
                  </Button>
                </Box>
                
                {/* Question Content - Now editable with RTL support */}
                <Box sx={{ p: 3, bgcolor: '#ffffff' }}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      variant="outlined"
                      value={editedQuestionText}
                      onChange={(e) => setEditedQuestionText(e.target.value)}
                      placeholder="Question text"
                      sx={{ mb: 2 }}
                      InputProps={{
                        style: {
                          direction: isUrduText(editedQuestionText) ? 'rtl' : 'ltr',
                          textAlign: isUrduText(editedQuestionText) ? 'right' : 'left',
                          fontFamily: isUrduText(editedQuestionText) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                          fontSize: isUrduText(editedQuestionText) ? '1.2rem' : 'inherit'
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.6,
                        color: '#333333',
                        fontSize: '1.05rem',
                        direction: isUrduText(currentQuestion.text) ? 'rtl' : 'ltr',
                        textAlign: isUrduText(currentQuestion.text) ? 'right' : 'left',
                        fontFamily: isUrduText(currentQuestion.text) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                        fontSize: isUrduText(currentQuestion.text) ? '1.2rem' : 'inherit'
                      }}
                    >
                      {currentQuestion.text || "No question text provided"}
                    </Typography>
                  )}
                  
                  {/* Show question difficulty */}
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: isUrduText(currentQuestion.text) ? 'flex-end' : 'flex-start' }}>
                    <Chip 
                      label={`${currentQuestion.difficulty || 'Medium'} Difficulty`} 
                      size="small" 
                      color={
                        currentQuestion.difficulty === 'Easy' ? 'success' : 
                        currentQuestion.difficulty === 'Hard' ? 'error' : 'warning'
                      }
                    />
                  </Box>
                </Box>
              </Paper>

              {/* Options Section for Multiple Choice Questions */}
              {currentQuestion && currentQuestion.type === 'multiple' && (
                <>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight="bold" 
                    sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}
                  >
                    Answer Options
                    <Box component="span" sx={{ ml: 2, fontSize: '0.8rem', color: 'text.secondary' }}>
                      (Correct answer is highlighted)
                    </Box>
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 5 }}>  {/* Increased bottom margin from 3 to 5 */}
                    {currentQuestion.options && currentQuestion.options.map((option, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            height: '100%',
                            bgcolor: currentQuestion.correctOption === index ? '#e8f5e9' : '#ffffff',
                            borderColor: currentQuestion.correctOption === index ? '#4caf50' : '#e0e0e0',
                            borderWidth: currentQuestion.correctOption === index ? 2 : 1,
                            position: 'relative',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: '0px 2px 8px rgba(0,0,0,0.08)'
                            }
                          }}
                        >
                          {currentQuestion.correctOption === index && (
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                top: -10, 
                                right: -10, 
                                bgcolor: '#4caf50',
                                color: 'white',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <ApproveIcon fontSize="small" />
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <Box 
                              sx={{ 
                                minWidth: 28, 
                                height: 28,
                                borderRadius: '50%',
                                mr: 1.5,
                                bgcolor: '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e0e0e0',
                                fontWeight: 'bold'
                              }}
                            >
                              {String.fromCharCode(65 + index)}
                            </Box>
                            <Typography sx={{ pt: 0.5 }}>
                              {option}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* Short Answer Question with RTL support */}
              {currentQuestion && currentQuestion.type === 'short' && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                    Correct Answer
                  </Typography>
                  
                  {isEditing ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      variant="outlined"
                      value={editedAnswerText}
                      onChange={(e) => setEditedAnswerText(e.target.value)}
                      placeholder="Correct answer"
                      sx={{ mb: 2 }}
                      InputProps={{
                        style: {
                          direction: isUrduText(editedAnswerText) ? 'rtl' : 'ltr',
                          textAlign: isUrduText(editedAnswerText) ? 'right' : 'left',
                          fontFamily: isUrduText(editedAnswerText) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                          fontSize: isUrduText(editedAnswerText) ? '1.2rem' : 'inherit'
                        }
                      }}
                    />
                  ) : (
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2.5,
                        bgcolor: '#e8f5e9',
                        borderColor: '#4caf50',
                        borderWidth: 2
                      }}
                    >
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'medium',
                          direction: isUrduText(currentQuestion.shortAnswer) ? 'rtl' : 'ltr',
                          textAlign: isUrduText(currentQuestion.shortAnswer) ? 'right' : 'left',
                          fontFamily: isUrduText(currentQuestion.shortAnswer) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                          fontSize: isUrduText(currentQuestion.shortAnswer) ? '1.2rem' : 'inherit'
                        }}
                      >
                        {currentQuestion.shortAnswer || "No answer provided"}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}

              {/* True/False Question - With Urdu support */}
              {currentQuestion && currentQuestion.type === 'truefalse' && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                    Correct Answer
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: isUrduText(currentQuestion.text) ? 'row-reverse' : 'row' }}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        width: 150,
                        textAlign: 'center',
                        bgcolor: currentQuestion.isTrueAnswer === true ? '#e8f5e9' : '#ffffff',
                        borderColor: currentQuestion.isTrueAnswer === true ? '#4caf50' : '#e0e0e0',
                        borderWidth: currentQuestion.isTrueAnswer === true ? 2 : 1
                      }}
                    >
                      <Typography 
                        fontWeight={currentQuestion.isTrueAnswer === true ? 'bold' : 'normal'}
                        color={currentQuestion.isTrueAnswer === true ? 'success.main' : 'inherit'}
                        sx={{
                          fontFamily: isUrduText(currentQuestion.text) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                          fontSize: isUrduText(currentQuestion.text) ? '1.2rem' : 'inherit'
                        }}
                      >
                        {isUrduText(currentQuestion.text) ? "صحیح" : "TRUE"}
                      </Typography>
                    </Paper>
                    
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        width: 150,
                        textAlign: 'center',
                        bgcolor: currentQuestion.isTrueAnswer === false ? '#ffebee' : '#ffffff',
                        borderColor: currentQuestion.isTrueAnswer === false ? '#f44336' : '#e0e0e0',
                        borderWidth: currentQuestion.isTrueAnswer === false ? 2 : 1
                      }}
                    >
                      <Typography 
                        fontWeight={currentQuestion.isTrueAnswer === false ? 'bold' : 'normal'}
                        color={currentQuestion.isTrueAnswer === false ? 'error.main' : 'inherit'}
                        sx={{
                          fontFamily: isUrduText(currentQuestion.text) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                          fontSize: isUrduText(currentQuestion.text) ? '1.2rem' : 'inherit'
                        }}
                      >
                        {isUrduText(currentQuestion.text) ? "غلط" : "FALSE"}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              )}
              
              <Grid container spacing={3}>
                {/* Author Information */}
                <Grid item xs={12} sm={6}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      height: '100%', 
                      borderRadius: 2,
                      bgcolor: '#fafafa',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom sx={{ color: '#01579b', display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ 
                        mr: 1, 
                        display: 'inline-flex', 
                        bgcolor: '#e1f5fe',
                        p: 0.5,
                        borderRadius: 1
                      }}>
                        <PersonIcon fontSize="small" />
                      </Box>
                      Author Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            bgcolor: '#f0f4f8', 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1,
                            minWidth: 55,
                            fontWeight: 'bold'
                          }}
                        >
                          Name
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2, pt: 0.5 }}>
                          {currentQuestion.authorName || "Unknown"}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            bgcolor: '#f0f4f8', 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1,
                            minWidth: 55,
                            fontWeight: 'bold'
                          }}
                        >
                          Email
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2, pt: 0.5 }}>
                          {currentQuestion.authorEmail || "Unknown"}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            bgcolor: '#f0f4f8', 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1,
                            minWidth: 55,
                            fontWeight: 'bold'
                          }}
                        >
                          Date
                        </Typography>
                        <Typography variant="body2" sx={{ ml: 2, pt: 0.5 }}>
                          {currentQuestion.createdAt ? 
                            (typeof currentQuestion.createdAt === 'object' && currentQuestion.createdAt.seconds ? 
                              new Date(currentQuestion.createdAt.seconds * 1000).toLocaleString() :
                              new Date(currentQuestion.createdAt).toLocaleString()) : 
                            "Unknown"}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                
                {/* Question Metadata */}
                <Grid item xs={12} sm={6}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      height: '100%', 
                      borderRadius: 2,
                      bgcolor: '#fafafa'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom sx={{ color: '#00695c', display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ 
                        mr: 1, 
                        display: 'inline-flex', 
                        bgcolor: '#e0f2f1',
                        p: 0.5,
                        borderRadius: 1
                      }}>
                        <InfoIcon fontSize="small" />
                      </Box>
                      Question Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {/* Extract path components */}
                    {(() => {
                      const pathComponents = extractPathComponents(currentQuestion.path);
                      return (
                        <>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <Box component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Type:</Box>
                            {currentQuestion.type === 'multiple' ? 'Multiple Choice' :
                            currentQuestion.type === 'truefalse' ? 'True/False' :
                            currentQuestion.type === 'short' ? 'Short Answer' :
                            currentQuestion.type || "Unknown"}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <Box component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Chapter:</Box>
                            <Chip 
                              size="small" 
                              label={formatDisplayName(pathComponents.chapter || currentQuestion.chapter || "Unknown")}
                              sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }}
                            />
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <Box component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Topic:</Box>
                            <Chip 
                              size="small" 
                              label={formatDisplayName(pathComponents.topic || "Unknown")}
                              sx={{ bgcolor: '#e3f2fd', color: '#1565c0' }}
                            />
                          </Typography>
                        </>
                      );
                    })()}
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      
        {/* Enhanced dialog actions */}
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0', justifyContent: 'space-between' }}>
          <Button 
            onClick={() => setDetailDialog(false)} 
            variant="outlined" 
            startIcon={<CloseIcon />}
            disabled={saveLoading}
          >
            Close
          </Button>
          
          {currentQuestion && (
            <Box>
              {isEditing ? (
                <>
                  <Button 
                    onClick={() => setIsEditing(false)}
                    variant="outlined"
                    color="secondary"
                    disabled={saveLoading}
                    sx={{ mr: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveQuestionChanges}
                    variant="contained"
                    color="primary"
                    disabled={saveLoading}
                    startIcon={saveLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {saveLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => setIsEditing(true)}
                    variant="outlined"
                    color="secondary"
                    sx={{ mr: 1 }}
                  >
                    Edit Question
                  </Button>
                  <Button 
                    onClick={() => {
                      handleApproveOne(currentQuestion.id);
                      setDetailDialog(false);
                    }}
                    variant="contained"
                    color="primary"
                    disabled={approveLoading}
                    startIcon={approveLoading ? <CircularProgress size={20} /> : <ApproveIcon />}
                  >
                    {approveLoading ? 'Approving...' : 'Approve Question'}
                  </Button>
                </>
              )}
            </Box>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Approve Selected Dialog */}
      <Dialog
        open={approveDialog}
        onClose={() => !approveLoading && setApproveDialog(false)}
      >
        <DialogTitle>
          Approve Selected Questions
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to approve {selectedQuestions.length} selected questions?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action will mark all selected questions as approved and they will be available for use in quizzes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setApproveDialog(false)} 
            disabled={approveLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApproveSelected}
            disabled={approveLoading}
            startIcon={approveLoading ? <CircularProgress size={20} /> : <DoneAllIcon />}
          >
            {approveLoading ? 'Processing...' : 'Approve All Selected'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ApprovalRequests;