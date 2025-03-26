import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Button, Container, Paper, Grid, FormControl, 
  InputLabel, Select, MenuItem, TextField, CircularProgress, Divider,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton,
  Card, CardContent, CardActions, Alert, Snackbar, Tooltip, FormLabel, RadioGroup, FormControlLabel, Radio
} from "@mui/material";
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc,
  deleteDoc, arrayUnion, arrayRemove, serverTimestamp, setDoc, addDoc
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TopicIcon from '@mui/icons-material/Topic';
import QuizIcon from '@mui/icons-material/Quiz';

const ViewEditBook = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // User permissions
  const [userAssignedDepartments, setUserAssignedDepartments] = useState([]);
  const [userAssignedGrades, setUserAssignedGrades] = useState({});

  // Selection states
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedBook, setSelectedBook] = useState("");
  const [books, setBooks] = useState([]);

  // Book data
  const [bookStructure, setBookStructure] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);

  // Edit states
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editText, setEditText] = useState("");

  // Add these new state variables to the existing state declarations
  const [addingChapter, setAddingChapter] = useState(false);
  const [addingTopic, setAddingTopic] = useState(null); // Will store chapter ID when adding topic
  const [addingQuestion, setAddingQuestion] = useState(null); // Will store {chapterId, topicId} when adding question

  // For new items
  const [newItemText, setNewItemText] = useState("");

  // For new question specifics
  const [newQuestionType, setNewQuestionType] = useState("multiple");
  const [newQuestionOptions, setNewQuestionOptions] = useState(["", "", "", ""]);
  const [newQuestionCorrectOption, setNewQuestionCorrectOption] = useState(0);
  const [newQuestionShortAnswer, setNewQuestionShortAnswer] = useState("");
  const [newQuestionIsTrueAnswer, setNewQuestionIsTrueAnswer] = useState(true);

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User authenticated:", user.uid, user.email);
        setCurrentUser(user);
        // Pass the complete user object instead of just the ID
        fetchUserPermissions(user);
      } else {
        console.log("No user authenticated");
        setCurrentUser(null);
        setUserAssignedDepartments([]);
        setUserAssignedGrades({});
        setLoading(false);
        setError("You need to be logged in to access this page");
      }
    });

    return () => unsubscribe();
  }, []);

  // Update the fetchUserPermissions function to match your database structure
  const fetchUserPermissions = async (user) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching permissions for user:", user.uid);
      
      // Get user email directly from the passed user object, not from state
      const userEmail = user.email;
      console.log("User email:", userEmail);
      
      // Query the teachers subcollection based on email
      const teachersQuery = query(
        collection(db, "users", "usersData", "teachers"),
        where("email", "==", userEmail)
      );
      
      const teacherSnapshot = await getDocs(teachersQuery);
      
      if (teacherSnapshot.empty) {
        console.warn("No teacher record found for email:", userEmail);
        setError("No teacher permissions found. Please contact an administrator.");
        setLoading(false);
        return;
      }
      
      // Use the first matching document
      const teacherData = teacherSnapshot.docs[0].data();
      console.log("Teacher data retrieved:", teacherData);
    //   console.log("Teacher departments:", teacherData.department);
    //   console.log("Teacher assigned grades:", teacherData.grades);
      
      // Get assigned departments and grades
      const assignedDepartments = teacherData.department || [];
      const assignedGrades = teacherData.grades || {};
      
      setUserAssignedDepartments(assignedDepartments);
      setUserAssignedGrades(assignedGrades);
      
      console.log("User assigned departments:", assignedDepartments);
      console.log("User assigned grades:", assignedGrades);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      setError("Failed to load your permissions: " + error.message);
      setLoading(false);
    }
  };

  // Fetch books when grade changes
  useEffect(() => {
    const fetchBooks = async () => {
      if (!selectedDepartment || !selectedGrade) {
        setBooks([]);
        return;
      }
      
      try {
        setLoading(true);
        
        // Format grade name by replacing spaces with underscores
        const formattedGrade = selectedGrade.replace(/ /g, "_");
        
        const booksRef = collection(
          db,
          "books",
          selectedDepartment,
          "grades",
          formattedGrade,
          "books"
        );
        
        const booksSnapshot = await getDocs(booksRef);
        
        const booksList = booksSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.id.replace(/_/g, " ")
        }));
        
        setBooks(booksList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching books:", error);
        setError("Failed to load books: " + error.message);
        setLoading(false);
      }
    };
    
    fetchBooks();
  }, [selectedDepartment, selectedGrade]);

  // Add a new useEffect to fetch grades when department changes
  useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedDepartment || userAssignedGrades[selectedDepartment]) {
        // If we already have the grades from user permissions, no need to fetch again
        return;
      }
      
      try {
        setLoading(true);
        
        console.log("Fetching grades for department:", selectedDepartment);
        
        // Query grades collection for the selected department
        const gradesQuery = query(
          collection(db, "grades"),
          where("department", "==", selectedDepartment)
        );
        
        const gradesSnapshot = await getDocs(gradesQuery);
        console.log(`Found ${gradesSnapshot.docs.length} grades for department ${selectedDepartment}`);
        
        if (!gradesSnapshot.empty) {
          // Extract grade names
          const gradesList = gradesSnapshot.docs.map(doc => doc.data().name);
          
          // Update the user assigned grades
          setUserAssignedGrades(prevGrades => ({
            ...prevGrades,
            [selectedDepartment]: gradesList
          }));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching grades:", error);
        setLoading(false);
      }
    };
    
    fetchGrades();
  }, [selectedDepartment, userAssignedGrades]);

  // Load book structure
  const loadBookStructure = async () => {
    if (!selectedDepartment || !selectedGrade || !selectedBook) {
      setError("Please select department, grade, and book");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Format grade name by replacing spaces with underscores
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      
      // Get book document
      const bookRef = doc(
        db, 
        "books", 
        selectedDepartment, 
        "grades", 
        formattedGrade, 
        "books", 
        selectedBook
      );
      
      const bookDoc = await getDoc(bookRef);
      
      if (!bookDoc.exists()) {
        throw new Error("Book not found");
      }
      
      // Store basic book data
      const bookData = {
        id: selectedBook,
        name: selectedBook.replace(/_/g, " "),
        department: selectedDepartment,
        grade: selectedGrade,
        ...bookDoc.data()
      };
      
      // Get chapters
      const chaptersRef = collection(
        db,
        "books",
        selectedDepartment,
        "grades",
        formattedGrade,
        "books",
        selectedBook,
        "chapters"
      );
      
      const chaptersSnapshot = await getDocs(chaptersRef);
      
      // Process each chapter
      const chaptersData = await Promise.all(
        chaptersSnapshot.docs.map(async (chapterDoc) => {
          const chapterId = chapterDoc.id;
          
          // Get chapter data
          const chapterData = {
            id: chapterId,
            name: chapterId.replace(/_/g, " "),
            ...chapterDoc.data()
          };
          
          // Get topics for this chapter
          const topicsRef = collection(
            db,
            "books",
            selectedDepartment,
            "grades",
            formattedGrade,
            "books",
            selectedBook,
            "chapters",
            chapterId,
            "topics"
          );
          
          const topicsSnapshot = await getDocs(topicsRef);
          
          // Process each topic
          const topicsData = await Promise.all(
            topicsSnapshot.docs.map(async (topicDoc) => {
              const topicId = topicDoc.id;
              
              // Get topic data
              const topicData = {
                id: topicId,
                name: topicId.replace(/_/g, " "),
                ...topicDoc.data()
              };
              
              // Get questions for this topic
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
              
              // Filter to only get approved questions
              const questionsSnapshot = await getDocs(
                query(questionsRef, where('status', '==', 'approved'))
              );
              
              // Map questions
              const questionsData = questionsSnapshot.docs.map(questionDoc => ({
                id: questionDoc.id,
                ...questionDoc.data()
              }));
              
              return {
                ...topicData,
                questions: questionsData
              };
            })
          );
          
          return {
            ...chapterData,
            topics: topicsData.sort((a, b) => (a.order || 0) - (b.order || 0))
          };
        })
      );
      
      // Update book structure state
      setBookStructure({
        ...bookData,
        chapters: chaptersData.sort((a, b) => (a.order || 0) - (b.order || 0))
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading book structure:", error);
      setError("Failed to load book: " + error.message);
      setLoading(false);
    }
  };

  // Handle chapter edit
  const startEditingChapter = (chapter) => {
    setEditingChapter(chapter.id);
    setEditText(chapter.name);
  };

  const saveChapterEdit = async (chapter) => {
    if (!editText.trim()) {
      setError("Chapter name cannot be empty");
      return;
    }
    
    try {
      setLoading(true);
      
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      const chapterRef = doc(
        db,
        "books",
        selectedDepartment,
        "grades",
        formattedGrade,
        "books",
        selectedBook,
        "chapters",
        chapter.id
      );
      
      await updateDoc(chapterRef, {
        name: editText
      });
      
      // Update local state
      setBookStructure(prevStructure => ({
        ...prevStructure,
        chapters: prevStructure.chapters.map(c => 
          c.id === chapter.id ? { ...c, name: editText } : c
        )
      }));
      
      setSuccess("Chapter updated successfully");
      setEditingChapter(null);
      setEditText("");
      setLoading(false);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error updating chapter:", error);
      setError("Failed to update chapter: " + error.message);
      setLoading(false);
    }
  };

  // Handle topic edit
  const startEditingTopic = (topic) => {
    setEditingTopic(topic.id);
    setEditText(topic.name);
  };

  const saveTopicEdit = async (topic, chapterId) => {
    if (!editText.trim()) {
      setError("Topic name cannot be empty");
      return;
    }
    
    try {
      setLoading(true);
      
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      const topicRef = doc(
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
        topic.id
      );
      
      await updateDoc(topicRef, {
        name: editText
      });
      
      // Update local state
      setBookStructure(prevStructure => ({
        ...prevStructure,
        chapters: prevStructure.chapters.map(chapter => {
          if (chapter.id === chapterId) {
            return {
              ...chapter,
              topics: chapter.topics.map(t => 
                t.id === topic.id ? { ...t, name: editText } : t
              )
            };
          }
          return chapter;
        })
      }));
      
      setSuccess("Topic updated successfully");
      setEditingTopic(null);
      setEditText("");
      setLoading(false);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error updating topic:", error);
      setError("Failed to update topic: " + error.message);
      setLoading(false);
    }
  };

  // Handle question edit
  const startEditingQuestion = (question) => {
    setEditingQuestion(question.id);
    setEditText(question.text);
  };

  const saveQuestionEdit = async (question, chapterId, topicId) => {
    if (!editText.trim()) {
      setError("Question text cannot be empty");
      return;
    }
    
    try {
      setLoading(true);
      
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      const questionRef = doc(
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
        question.id
      );
      
      await updateDoc(questionRef, {
        text: editText,
        lastEdited: serverTimestamp(),
        editedBy: currentUser.uid
      });
      
      // Update local state
      setBookStructure(prevStructure => ({
        ...prevStructure,
        chapters: prevStructure.chapters.map(chapter => {
          if (chapter.id === chapterId) {
            return {
              ...chapter,
              topics: chapter.topics.map(topic => {
                if (topic.id === topicId) {
                  return {
                    ...topic,
                    questions: topic.questions.map(q => 
                      q.id === question.id ? { ...q, text: editText } : q
                    )
                  };
                }
                return topic;
              })
            };
          }
          return chapter;
        })
      }));
      
      setSuccess("Question updated successfully");
      setEditingQuestion(null);
      setEditText("");
      setLoading(false);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error updating question:", error);
      setError("Failed to update question: " + error.message);
      setLoading(false);
    }
  };

  // Handle cancel editing
  const cancelEditing = () => {
    setEditingChapter(null);
    setEditingTopic(null);
    setEditingQuestion(null);
    setEditText("");
  };

  // Handle chapter accordion expansion
  const handleChapterExpand = (chapterId) => {
    setExpandedChapter(expandedChapter === chapterId ? null : chapterId);
    setExpandedTopic(null); // Close any open topics when changing chapters
  };

  // Handle topic accordion expansion
  const handleTopicExpand = (topicId) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  // Add this function to handle adding a new chapter
  const addNewChapter = async () => {
    if (!newItemText.trim()) {
      setError("Chapter name cannot be empty");
      return;
    }
    
    try {
      setLoading(true);
      
      // Format the chapter name for use as a document ID
      const formattedChapterName = newItemText.replace(/ /g, "_");
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      
      // Reference to the new chapter document
      const chapterRef = doc(
        db,
        "books",
        selectedDepartment,
        "grades",
        formattedGrade,
        "books",
        selectedBook,
        "chapters",
        formattedChapterName
      );
      
      // Create the chapter document
      await setDoc(chapterRef, {
        name: newItemText,
        order: bookStructure.chapters.length + 1,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
      
      // Create a new chapter object
      const newChapter = {
        id: formattedChapterName,
        name: newItemText,
        order: bookStructure.chapters.length + 1,
        topics: []
      };
      
      // Update local state
      setBookStructure(prevStructure => ({
        ...prevStructure,
        chapters: [...prevStructure.chapters, newChapter].sort((a, b) => (a.order || 0) - (b.order || 0))
      }));
      
      // Reset UI state
      setNewItemText("");
      setAddingChapter(false);
      setSuccess("Chapter added successfully");
      setTimeout(() => setSuccess(null), 3000);
      
      // Expand the new chapter
      setExpandedChapter(formattedChapterName);
      
      setLoading(false);
    } catch (error) {
      console.error("Error adding chapter:", error);
      setError("Failed to add chapter: " + error.message);
      setLoading(false);
    }
  };

  // Add this function to handle adding a new topic
  const addNewTopic = async (chapterId) => {
    if (!newItemText.trim()) {
      setError("Topic name cannot be empty");
      return;
    }
    
    try {
      setLoading(true);
      
      // Format the topic name for use as a document ID
      const formattedTopicName = newItemText.replace(/ /g, "_");
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      
      // Reference to the new topic document
      const topicRef = doc(
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
        formattedTopicName
      );
      
      // Get the chapter for order calculation
      const chapter = bookStructure.chapters.find(c => c.id === chapterId);
      const topicOrder = chapter.topics.length + 1;
      
      // Create the topic document
      await setDoc(topicRef, {
        name: newItemText,
        order: topicOrder,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
      
      // Create a new topic object
      const newTopic = {
        id: formattedTopicName,
        name: newItemText,
        order: topicOrder,
        questions: []
      };
      
      // Update local state
      setBookStructure(prevStructure => ({
        ...prevStructure,
        chapters: prevStructure.chapters.map(chapter => {
          if (chapter.id === chapterId) {
            return {
              ...chapter,
              topics: [...chapter.topics, newTopic].sort((a, b) => (a.order || 0) - (b.order || 0))
            };
          }
          return chapter;
        })
      }));
      
      // Reset UI state
      setNewItemText("");
      setAddingTopic(null);
      setSuccess("Topic added successfully");
      setTimeout(() => setSuccess(null), 3000);
      
      // Expand the new topic
      setExpandedTopic(formattedTopicName);
      
      setLoading(false);
    } catch (error) {
      console.error("Error adding topic:", error);
      setError("Failed to add topic: " + error.message);
      setLoading(false);
    }
  };

  // Add this function to handle adding a new question
  const addNewQuestion = async (chapterId, topicId) => {
    if (!newItemText.trim()) {
      setError("Question text cannot be empty");
      return;
    }
    
    // Validate based on question type
    if (newQuestionType === "multiple") {
      if (newQuestionOptions.some(opt => !opt.trim())) {
        setError("All options must be filled");
        return;
      }
    } else if (newQuestionType === "short") {
      if (!newQuestionShortAnswer.trim()) {
        setError("Short answer cannot be empty");
        return;
      }
    }
    
    try {
      setLoading(true);
      
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      
      // Create base question object
      const newQuestion = {
        text: newItemText,
        type: newQuestionType,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      };
      
      // Add type-specific fields
      if (newQuestionType === "multiple") {
        newQuestion.options = newQuestionOptions;
        newQuestion.correctOption = newQuestionCorrectOption;
      } else if (newQuestionType === "short") {
        newQuestion.shortAnswer = newQuestionShortAnswer;
      } else if (newQuestionType === "truefalse") {
        newQuestion.isTrueAnswer = newQuestionIsTrueAnswer;
      }
      
      // Reference to questions collection
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
      
      // Add the question to Firestore
      const newQuestionRef = await addDoc(questionsRef, newQuestion);
      
      // Create complete question object for local state
      const completeQuestion = {
        id: newQuestionRef.id,
        ...newQuestion
      };
      
      // Update local state
      setBookStructure(prevStructure => ({
        ...prevStructure,
        chapters: prevStructure.chapters.map(chapter => {
          if (chapter.id === chapterId) {
            return {
              ...chapter,
              topics: chapter.topics.map(topic => {
                if (topic.id === topicId) {
                  return {
                    ...topic,
                    questions: [...topic.questions, completeQuestion]
                  };
                }
                return topic;
              })
            };
          }
          return chapter;
        })
      }));
      
      // Reset UI state
      setNewItemText("");
      setAddingQuestion(null);
      setNewQuestionType("multiple");
      setNewQuestionOptions(["", "", "", ""]);
      setNewQuestionCorrectOption(0);
      setNewQuestionShortAnswer("");
      setNewQuestionIsTrueAnswer(true);
      
      setSuccess("Question added successfully");
      setTimeout(() => setSuccess(null), 3000);
      
      setLoading(false);
    } catch (error) {
      console.error("Error adding question:", error);
      setError("Failed to add question: " + error.message);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ m: 4 }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ color: "#011E41" }}>
        View and Edit Books
      </Typography>
      
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      {loading && !bookStructure ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : !currentUser ? (
        <Alert severity="warning">
          You need to be logged in to view assigned books
        </Alert>
      ) : (
        <Box>
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, color: "#011E41" }}>
              Select Book to Edit
            </Typography>
            
            <Grid container spacing={3}>
              {/* Department Selection */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedGrade("");
                      setSelectedBook("");
                      setBookStructure(null);
                    }}
                    label="Department"
                  >
                    {userAssignedDepartments.length === 0 ? (
                      <MenuItem disabled value="">
                        No departments assigned
                      </MenuItem>
                    ) : (
                      userAssignedDepartments.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Grade Selection */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth disabled={!selectedDepartment}>
                  <InputLabel>Grade</InputLabel>
                  <Select
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value);
                      setSelectedBook("");
                      setBookStructure(null);
                    }}
                    label="Grade"
                  >
                    {!selectedDepartment ? (
                      <MenuItem disabled value="">
                        Select department first
                      </MenuItem>
                    ) : !userAssignedGrades[selectedDepartment] ||
                      userAssignedGrades[selectedDepartment].length === 0 ? (
                      <MenuItem disabled value="">
                        No grades assigned in this department
                      </MenuItem>
                    ) : (
                      userAssignedGrades[selectedDepartment].map((grade) => (
                        <MenuItem key={grade} value={grade}>
                          {grade}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Book Selection */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth disabled={!selectedGrade}>
                  <InputLabel>Book</InputLabel>
                  <Select
                    value={selectedBook}
                    onChange={(e) => {
                      setSelectedBook(e.target.value);
                      setBookStructure(null);
                    }}
                    label="Book"
                  >
                    {!selectedGrade ? (
                      <MenuItem disabled value="">
                        Select grade first
                      </MenuItem>
                    ) : books.length === 0 ? (
                      <MenuItem disabled value="">
                        No books available
                      </MenuItem>
                    ) : (
                      books.map((book) => (
                        <MenuItem key={book.id} value={book.id}>
                          {book.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={loadBookStructure}
                  disabled={!selectedBook || loading}
                  fullWidth
                  sx={{ bgcolor: "#011E41" }}
                >
                  {loading ? "Loading..." : "View Book Structure"}
                </Button>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Book Structure */}
          {bookStructure && (
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 3, color: "#011E41" }}>
                {bookStructure.name}
              </Typography>
              
              {bookStructure.chapters.map((chapter) => (
                <Accordion
                  key={chapter.id}
                  expanded={expandedChapter === chapter.id}
                  onChange={() => handleChapterExpand(chapter.id)}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: expandedChapter === chapter.id ? 'rgba(0, 30, 65, 0.08)' : 'transparent'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <MenuBookIcon sx={{ mr: 1, color: '#011E41' }} />
                        
                        {editingChapter === chapter.id ? (
                          <TextField
                            size="small"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveChapterEdit(chapter);
                                e.preventDefault();
                              }
                              e.stopPropagation();
                            }}
                            autoFocus
                            sx={{ minWidth: 250 }}
                          />
                        ) : (
                          <Typography variant="h6">{chapter.name}</Typography>
                        )}
                      </Box>
                      
                      <Box onClick={(e) => e.stopPropagation()}>
                        {editingChapter === chapter.id ? (
                          <>
                            <IconButton 
                              color="primary" 
                              onClick={() => saveChapterEdit(chapter)}
                              size="small"
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton 
                              color="error" 
                              onClick={cancelEditing}
                              size="small"
                            >
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton 
                            color="primary" 
                            onClick={() => startEditingChapter(chapter)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ pt: 2, pb: 1 }}>
                    {chapter.topics.map((topic) => (
                      <Accordion
                        key={topic.id}
                        expanded={expandedTopic === topic.id}
                        onChange={() => handleTopicExpand(topic.id)}
                        sx={{ mb: 1, boxShadow: 1 }}
                      >
                        <AccordionSummary 
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            bgcolor: expandedTopic === topic.id ? 'rgba(0, 30, 65, 0.05)' : 'transparent'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TopicIcon sx={{ mr: 1, color: '#011E41' }} />
                              
                              {editingTopic === topic.id ? (
                                <TextField
                                  size="small"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveTopicEdit(topic, chapter.id);
                                      e.preventDefault();
                                    }
                                    e.stopPropagation();
                                  }}
                                  autoFocus
                                  sx={{ minWidth: 250 }}
                                />
                              ) : (
                                <Typography>{topic.name}</Typography>
                              )}
                            </Box>
                            
                            <Box onClick={(e) => e.stopPropagation()}>
                              {editingTopic === topic.id ? (
                                <>
                                  <IconButton 
                                    color="primary" 
                                    onClick={() => saveTopicEdit(topic, chapter.id)}
                                    size="small"
                                  >
                                    <SaveIcon />
                                  </IconButton>
                                  <IconButton 
                                    color="error" 
                                    onClick={cancelEditing}
                                    size="small"
                                  >
                                    <CancelIcon />
                                  </IconButton>
                                </>
                              ) : (
                                <IconButton 
                                  color="primary" 
                                  onClick={() => startEditingTopic(topic)}
                                  size="small"
                                >
                                  <EditIcon />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        </AccordionSummary>
                        
                        <AccordionDetails>
                          <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Questions ({topic.questions.length})
                          </Typography>
                          
                          {topic.questions.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No questions found for this topic.
                            </Typography>
                          ) : (
                            topic.questions.map((question) => (
                              <Card key={question.id} variant="outlined" sx={{ mb: 2, border: '1px solid #eee' }}>
                                <CardContent>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ flexGrow: 1 }}>
                                      {editingQuestion === question.id ? (
                                        <TextField
                                          fullWidth
                                          multiline
                                          rows={2}
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          variant="outlined"
                                          size="small"
                                          autoFocus
                                        />
                                      ) : (
                                        <Typography variant="body1">{question.text}</Typography>
                                      )}
                                      
                                      {question.type === "multiple" && (
                                        <Box sx={{ ml: 2, mt: 1 }}>
                                          <Typography variant="caption" color="text.secondary">Options:</Typography>
                                          <List dense disablePadding>
                                            {question.options.map((option, index) => (
                                              <ListItem key={index} dense disableGutters>
                                                <Typography 
                                                  variant="body2" 
                                                  sx={{ 
                                                    fontWeight: question.correctOption === index ? 'bold' : 'normal',
                                                    color: question.correctOption === index ? 'success.main' : 'text.primary'
                                                  }}
                                                >
                                                  {index + 1}. {option} {question.correctOption === index && " (Correct)"}
                                                </Typography>
                                              </ListItem>
                                            ))}
                                          </List>
                                        </Box>
                                      )}
                                      
                                      {question.type === "short" && (
                                        <Box sx={{ ml: 2, mt: 1 }}>
                                          <Typography variant="caption" color="text.secondary">
                                            Correct Answer: <span style={{ fontWeight: 'bold' }}>{question.shortAnswer}</span>
                                          </Typography>
                                        </Box>
                                      )}
                                      
                                      {question.type === "truefalse" && (
                                        <Box sx={{ ml: 2, mt: 1 }}>
                                          <Typography variant="caption" color="text.secondary">
                                            Correct Answer: <span style={{ fontWeight: 'bold' }}>{question.isTrueAnswer ? "True" : "False"}</span>
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                    
                                    <Box>
                                      {editingQuestion === question.id ? (
                                        <>
                                          <IconButton 
                                            color="primary" 
                                            onClick={() => saveQuestionEdit(question, chapter.id, topic.id)}
                                            size="small"
                                          >
                                            <SaveIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton 
                                            color="error" 
                                            onClick={cancelEditing}
                                            size="small"
                                          >
                                            <CancelIcon fontSize="small" />
                                          </IconButton>
                                        </>
                                      ) : (
                                        <IconButton 
                                          color="primary" 
                                          onClick={() => startEditingQuestion(question)}
                                          size="small"
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      )}
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))
                          )}
                          {/* Add Question section */}
                          {addingQuestion && 
                           addingQuestion.chapterId === chapter.id && 
                           addingQuestion.topicId === topic.id ? (
                            <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                              <Typography variant="subtitle1" sx={{ mb: 2 }}>Add New Question</Typography>
                              
                              {/* Question text */}
                              <TextField
                                fullWidth
                                label="Question Text"
                                value={newItemText}
                                onChange={(e) => setNewItemText(e.target.value)}
                                variant="outlined"
                                multiline
                                rows={2}
                                sx={{ mb: 2 }}
                              />
                              
                              {/* Question type selection */}
                              <FormControl component="fieldset" sx={{ mb: 2 }}>
                                <FormLabel component="legend">Question Type</FormLabel>
                                <RadioGroup 
                                  row 
                                  value={newQuestionType} 
                                  onChange={(e) => setNewQuestionType(e.target.value)}
                                >
                                  <FormControlLabel value="multiple" control={<Radio />} label="Multiple Choice" />
                                  <FormControlLabel value="short" control={<Radio />} label="Short Answer" />
                                  <FormControlLabel value="truefalse" control={<Radio />} label="True/False" />
                                </RadioGroup>
                              </FormControl>
                              
                              {/* Type-specific fields */}
                              {newQuestionType === "multiple" && (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Options:</Typography>
                                  {newQuestionOptions.map((option, index) => (
                                    <Box key={index} sx={{ display: 'flex', mb: 1, alignItems: 'center' }}>
                                      <Radio
                                        checked={newQuestionCorrectOption === index}
                                        onChange={() => setNewQuestionCorrectOption(index)}
                                        size="small"
                                      />
                                      <TextField
                                        fullWidth
                                        label={`Option ${index + 1}${newQuestionCorrectOption === index ? ' (Correct)' : ''}`}
                                        value={option}
                                        onChange={(e) => {
                                          const newOptions = [...newQuestionOptions];
                                          newOptions[index] = e.target.value;
                                          setNewQuestionOptions(newOptions);
                                        }}
                                        variant="outlined"
                                        size="small"
                                      />
                                    </Box>
                                  ))}
                                </Box>
                              )}
                              
                              {newQuestionType === "short" && (
                                <TextField
                                  fullWidth
                                  label="Correct Answer"
                                  value={newQuestionShortAnswer}
                                  onChange={(e) => setNewQuestionShortAnswer(e.target.value)}
                                  variant="outlined"
                                  size="small"
                                  sx={{ mb: 2 }}
                                />
                              )}
                              
                              {newQuestionType === "truefalse" && (
                                <FormControl component="fieldset" sx={{ mb: 2 }}>
                                  <FormLabel component="legend">Correct Answer</FormLabel>
                                  <RadioGroup 
                                    row 
                                    value={newQuestionIsTrueAnswer ? "true" : "false"} 
                                    onChange={(e) => setNewQuestionIsTrueAnswer(e.target.value === "true")}
                                  >
                                    <FormControlLabel value="true" control={<Radio />} label="True" />
                                    <FormControlLabel value="false" control={<Radio />} label="False" />
                                  </RadioGroup>
                                </FormControl>
                              )}
                              
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() => addNewQuestion(chapter.id, topic.id)}
                                  disabled={!newItemText.trim() || loading}
                                >
                                  Add Question
                                </Button>
                                <Button
                                  variant="outlined"
                                  onClick={() => {
                                    setAddingQuestion(null);
                                    setNewItemText("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Button
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => setAddingQuestion({ chapterId: chapter.id, topicId: topic.id })}
                              sx={{ mt: 2 }}
                              size="small"
                            >
                              Add New Question
                            </Button>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                    
                    {/* Add Topic section */}
                    {addingTopic === chapter.id ? (
                      <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2 }}>Add New Topic</Typography>
                        <TextField
                          fullWidth
                          label="Topic Name"
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          variant="outlined"
                          size="small"
                          sx={{ mb: 2 }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => addNewTopic(chapter.id)}
                            disabled={!newItemText.trim() || loading}
                          >
                            Add Topic
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setAddingTopic(null);
                              setNewItemText("");
                            }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setAddingTopic(chapter.id)}
                        sx={{ mt: 2 }}
                        size="small"
                      >
                        Add New Topic
                      </Button>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
              {/* Add Chapter section */}
              {addingChapter ? (
                <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Add New Chapter</Typography>
                  <TextField
                    fullWidth
                    label="Chapter Name"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={addNewChapter}
                      disabled={!newItemText.trim() || loading}
                    >
                      Add Chapter
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setAddingChapter(false);
                        setNewItemText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddingChapter(true)}
                  sx={{ mt: 2 }}
                >
                  Add New Chapter
                </Button>
              )}
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ViewEditBook;