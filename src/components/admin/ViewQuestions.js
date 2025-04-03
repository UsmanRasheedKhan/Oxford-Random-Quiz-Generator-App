import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp, deleteDoc, updateDoc } from "firebase/firestore";
import { 
  Typography, Box, MenuItem, Select, InputLabel, FormControl, List, 
  ListItem, Button, Grid, Paper, Accordion, AccordionSummary, 
  AccordionDetails, Card, CardContent, TextField, Divider, 
  CircularProgress, Alert
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChapterIcon from '@mui/icons-material/MenuBook';
import TopicIcon from '@mui/icons-material/Topic';
import QuizIcon from '@mui/icons-material/Quiz';
import { useNavigate } from "react-router-dom"; // Make sure this import exists
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Add this import

const ViewQuestions = () => {
  const navigate = useNavigate(); // Add this hook
  
  // Selection states
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("");
  
  // Book data
  const [bookStructure, setBookStructure] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Comments
  const [comments, setComments] = useState({});
  const [existingComments, setExistingComments] = useState({});  // Store comments by questionId
  const [editingComment, setEditingComment] = useState(null);    // Track which comment is being edited
  const [editCommentText, setEditCommentText] = useState("");    // Store edited comment text

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        
        // Get all departments from the "categories" collection
        const departmentsSnapshot = await getDocs(collection(db, "categories"));
        
        // Only include departments that have a name field
        const departmentsList = departmentsSnapshot.docs
          .filter(doc => doc.data().name) // Filter out documents without names
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name
          }));
        
        console.log("Fetched departments with names:", departmentsList);
        
        setDepartments(departmentsList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching departments:", error);
        setError("Error fetching departments: " + error.message);
        setLoading(false);
      }
    };
    
    fetchDepartments();
  }, []);

  // Update the fetchGrades function to log department name
  useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedDepartment) {
        setGrades([]);
        return;
      }
      
      // Log both department ID and name
      console.log(`Fetching grades for department: ID=${selectedDepartment}, Name=${selectedDepartmentName}`);
      
      try {
        setLoading(true);
        setGrades([]); // Reset grades when department changes
        
        console.log("Fetching grades for department:", selectedDepartment);
        
        // Direct query on grades collection where department matches selected department
        const gradesQuery = query(
          collection(db, "grades"),
          where("department", "==", selectedDepartmentName)
        );
        
        const querySnapshot = await getDocs(gradesQuery);
        console.log(`Query returned ${querySnapshot.docs.length} grades for department=${selectedDepartment}`);
        
        // Map through documents and use the 'name' field from each document
        const gradesList = querySnapshot.docs.map(doc => {
          // Log each grade document to see its structure
          console.log(`Grade ${doc.id}:`, doc.data());
          return doc.data().name || doc.id;
        });
        
        console.log("Final grades list:", gradesList);
        
        if (gradesList.length > 0) {
          setGrades(gradesList);
        } else {
          console.warn(`No grades found for department: ${selectedDepartment}`);
        }
        
        setLoading(false);
        
        // Always reset these when department changes
        setSelectedGrade("");
        setBooks([]);
        setSelectedBook("");
        setBookStructure(null);
      } catch (error) {
        console.error("Error fetching grades:", error);
        setError("Error fetching grades: " + error.message);
        setLoading(false);
      }
    };
    
    fetchGrades();
  }, [selectedDepartment, selectedDepartmentName]);

  // Update the fetchBooks function to fetch books for the selected grade
  useEffect(() => {
    const fetchBooks = async () => {
      if (!selectedDepartment || !selectedGrade) {
        setBooks([]);
        return;
      }
      
      try {
        setLoading(true);
        setBooks([]); // Reset books when grade changes
        
        // Format grade name by replacing all spaces with underscores
        const formattedGrade = selectedGrade.replace(/ /g, "_");
        
        console.log(`Fetching books for department="${selectedDepartment}", grade="${selectedGrade}" (formatted as "${formattedGrade}")`);
        
        // Using the database structure described:
        // books -> departmentName -> grades -> grade_name -> books -> book_name
        const booksRef = collection(
          db, 
          "books", 
          selectedDepartmentName, 
          "grades", 
          formattedGrade, 
          "books"
        );
        
        const booksSnapshot = await getDocs(booksRef);
        
        console.log(`Found ${booksSnapshot.docs.length} books for grade "${selectedGrade}"`);
        
        const booksList = booksSnapshot.docs.map((doc) => {
          console.log(`Book document ${doc.id}:`, doc.data());
          return {
            id: doc.id,
            name: doc.id.replace(/_/g, " ")  // Replace all underscores with spaces for display
          };
        });
        
        setBooks(booksList);
        setSelectedBook("");
        setBookStructure(null);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching books:", error);
        setError("Error fetching books: " + error.message);
        setLoading(false);
      }
    };
    
    fetchBooks();
  }, [selectedDepartment, selectedGrade]);

  // Load book structure
  const loadBookStructure = async () => {
    if (!selectedDepartment || !selectedGrade || !selectedBook) {
      setError("Please select department, grade, and book");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const formattedGrade = selectedGrade.replace(" ", "_");
      const bookRef = doc(
        db, 
        "books", 
        selectedDepartmentName, 
        "grades", 
        formattedGrade, 
        "books", 
        selectedBook
      );
      
      const bookDoc = await getDoc(bookRef);
      
      if (!bookDoc.exists()) {
        throw new Error("Book not found");
      }
      
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
        selectedDepartmentName,
        "grades",
        formattedGrade,
        "books",
        selectedBook,
        "chapters"
      );
      
      const chaptersSnapshot = await getDocs(chaptersRef);
      
      const chaptersData = await Promise.all(
        chaptersSnapshot.docs.map(async (chapterDoc) => {
          const chapterId = chapterDoc.id;
          const chapterData = {
            name: chapterId.replace(/_/g, " "),
            ...chapterDoc.data()
          };
          
          // Get topics for this chapter
          const topicsRef = collection(
            db,
            "books",
            selectedDepartmentName,
            "grades",
            formattedGrade,
            "books",
            selectedBook,
            "chapters",
            chapterId,
            "topics"
          );
          
          const topicsSnapshot = await getDocs(topicsRef);
          
          const topicsData = await Promise.all(
            topicsSnapshot.docs.map(async (topicDoc) => {
              const topicId = topicDoc.id;
              const topicData = {
                name: topicId.replace(/_/g, " "),
                ...topicDoc.data()
              };
              
              // Get questions for this topic
              const questionsRef = collection(
                db,
                "books",
                selectedDepartmentName,
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
              
              const questionsSnapshot = await getDocs(questionsRef);
              
              const questionsData = questionsSnapshot.docs.map(questionDoc => ({
                id: questionDoc.id,
                ...questionDoc.data()
              }));
              
              // Fetch comments for the questions in this topic
              await fetchCommentsForTopic(chapterId, topicId, questionsData);
              
              return {
                id: topicId,
                name: topicData.name,
                order: topicData.order || 0,
                questions: questionsData
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

  // Add this function for fetching comments for a topic's questions
  const fetchCommentsForTopic = async (chapterId, topicId, questions) => {
    const formattedGrade = selectedGrade.replace(/ /g, "_");
    
    // Create a new object to store comments by questionId
    const commentsByQuestion = {};
    
    // Loop through all questions in this topic
    for (const question of questions) {
      // Reference to comments collection for this question
      const commentsRef = collection(
        db,
        "books",
        selectedDepartmentName,
        "grades",
        formattedGrade,
        "books",
        selectedBook,
        "chapters",
        chapterId,
        "topics",
        topicId,
        "questions",
        question.id,
        "comments"
      );
      
      // Get all comments for this question
      const commentsSnapshot = await getDocs(commentsRef);
      
      // Store comments array for this question
      commentsByQuestion[question.id] = commentsSnapshot.docs.map(commentDoc => ({
        id: commentDoc.id,
        ...commentDoc.data(),
        timestamp: commentDoc.data().timestamp?.toDate?.() || new Date()
      }));
    }
    
    // Update state with all comments
    setExistingComments(prevComments => ({
      ...prevComments,
      ...commentsByQuestion
    }));
  };

  // Add function to delete a comment
  const deleteComment = async (questionId, commentId, chapterId, topicId) => {
    try {
      setLoading(true);
      
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      const commentRef = doc(
        db,
        "books",
        selectedDepartmentName,
        "grades",
        formattedGrade,
        "books",
        selectedBook,
        "chapters",
        chapterId,
        "topics",
        topicId,
        "questions",
        questionId,
        "comments",
        commentId
      );
      
      // Delete the comment document
      await deleteDoc(commentRef);
      
      // Update local state to remove the deleted comment
      setExistingComments(prevComments => ({
        ...prevComments,
        [questionId]: prevComments[questionId].filter(comment => comment.id !== commentId)
      }));
      
      setSuccess("Comment deleted successfully");
      setTimeout(() => setSuccess(null), 3000);
      setLoading(false);
    } catch (error) {
      setError("Error deleting comment: " + error.message);
      setLoading(false);
    }
  };

  // Add function to edit a comment
  const startEditingComment = (questionId, commentId, currentText) => {
    setEditingComment({ questionId, commentId });
    setEditCommentText(currentText);
  };

  const saveEditedComment = async (questionId, commentId, chapterId, topicId) => {
    if (!editCommentText.trim()) {
      setError("Comment cannot be empty");
      return;
    }
    
    try {
      setLoading(true);
      
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      const commentRef = doc(
        db,
        "books",
        selectedDepartmentName,
        "grades",
        formattedGrade,
        "books",
        selectedBook,
        "chapters",
        chapterId,
        "topics",
        topicId,
        "questions",
        questionId,
        "comments",
        commentId
      );
      
      // Update the comment document
      await updateDoc(commentRef, {
        text: editCommentText,
        edited: true,
        editTimestamp: serverTimestamp()
      });
      
      // Update local state with the edited comment
      setExistingComments(prevComments => ({
        ...prevComments,
        [questionId]: prevComments[questionId].map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                text: editCommentText, 
                edited: true,
                editTimestamp: new Date()
              } 
            : comment
        )
      }));
      
      // Reset editing state
      setEditingComment(null);
      setEditCommentText("");
      
      setSuccess("Comment updated successfully");
      setTimeout(() => setSuccess(null), 3000);
      setLoading(false);
    } catch (error) {
      setError("Error updating comment: " + error.message);
      setLoading(false);
    }
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditCommentText("");
  };

  // Handle chapter accordion expansion
  const handleChapterExpand = (chapterId) => {
    setExpandedChapter(expandedChapter === chapterId ? null : chapterId);
  };

  // Update the handleTopicExpand function to fetch comments when a topic is expanded
  const handleTopicExpand = (topicId, chapterId, questions) => {
    const isExpanding = expandedTopic !== topicId;
    
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
    
    // If expanding this topic, fetch comments for all questions
    if (isExpanding && questions.length > 0) {
      fetchCommentsForTopic(chapterId, topicId, questions);
    }
  };

  // Handle comment change
  const handleCommentChange = (questionId, value) => {
    setComments({
      ...comments,
      [questionId]: value
    });
  };

  // Update the submitComment function
  const submitComment = async (question, chapterId, topicId) => {
    if (!comments[question.id]) {
      setError("Please enter a comment before submitting");
      return;
    }
    
    // Check if user already has a comment on this question
    const userHasComment = existingComments[question.id]?.some(
      comment => comment.role === "admin"  // Change this to use actual user ID in a real app
    );
    
    if (userHasComment) {
      setError("You have already commented on this question");
      return;
    }
    
    try {
      setLoading(true);
      
      const formattedGrade = selectedGrade.replace(/ /g, "_");
      const commentsRef = collection(
        db,
        "books",
        selectedDepartmentName,
        "grades",
        formattedGrade,
        "books",
        selectedBook,
        "chapters",
        chapterId,
        "topics",
        topicId,
        "questions",
        question.id,
        "comments"
      );
      
      // Add new comment with author information
      const newCommentRef = await addDoc(commentsRef, {
        text: comments[question.id],
        timestamp: serverTimestamp(),
        role: "admin",  // You would use actual user role here
        author: "Admin User",  // Replace with actual user name
        authorId: "admin-123"  // Replace with actual user ID
      });
      
      // Get the new comment ID
      const newCommentId = newCommentRef.id;
      
      // Update the local state with the new comment
      const newComment = {
        id: newCommentId,
        text: comments[question.id],
        timestamp: new Date(),
        role: "admin",
        author: "Admin User",
        authorId: "admin-123"
      };
      
      setExistingComments(prevComments => ({
        ...prevComments,
        [question.id]: [...(prevComments[question.id] || []), newComment]
      }));
      
      // Reset the comment for this question
      setComments({
        ...comments,
        [question.id]: ""
      });
      
      setSuccess("Comment submitted successfully");
      setTimeout(() => setSuccess(null), 3000);
      setLoading(false);
    } catch (error) {
      setError("Error submitting comment: " + error.message);
      setLoading(false);
    }
  };

  // Update the renderQuestion function
  const renderQuestion = (question, chapterId, topicId) => {
    // Get comments for this question
    const questionComments = existingComments[question.id] || [];
    
    // Check if the current user has already commented
    const userHasComment = questionComments.some(
      comment => comment.role === "admin"  // Change this to use actual user ID in a real app
    );
    
    return (
      <Card key={question.id} sx={{ mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Question: {question.text}
          </Typography>
          
          {question.type === "multiple" && (
            <Box sx={{ ml: 2, mt: 1 }}>
              <Typography variant="subtitle2">Options:</Typography>
              <List>
                {question.options.map((option, index) => (
                  <ListItem key={index}>
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
              <Typography variant="subtitle2">
                Correct Answer: <span style={{ fontWeight: 'bold' }}>{question.shortAnswer}</span>
              </Typography>
            </Box>
          )}
          
          {question.type === "truefalse" && (
            <Box sx={{ ml: 2, mt: 1 }}>
              <Typography variant="subtitle2">
                Correct Answer: <span style={{ fontWeight: 'bold' }}>{question.isTrueAnswer ? "True" : "False"}</span>
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Display existing comments */}
          {questionComments.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Comments:
              </Typography>
              
              {questionComments.map(comment => (
                <Paper key={comment.id} elevation={1} sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                  {editingComment && 
                   editingComment.questionId === question.id && 
                   editingComment.commentId === comment.id ? (
                    // Edit mode
                    <Box>
                      <TextField
                        multiline
                        rows={2}
                        fullWidth
                        variant="outlined"
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          size="small" 
                          variant="contained" 
                          onClick={() => saveEditedComment(question.id, comment.id, chapterId, topicId)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    // View mode
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {comment.author || "Unknown"} ({comment.role || "user"})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {comment.timestamp?.toLocaleString?.() || "Unknown date"}
                          {comment.edited && " (edited)"}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2">
                        {comment.text}
                      </Typography>
                      
                      {/* Only show edit/delete for the user's own comments */}
                      {comment.role === "admin" && (  // Replace with actual user role check
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                          <Button 
                            size="small" 
                            variant="text" 
                            onClick={() => startEditingComment(question.id, comment.id, comment.text)}
                            sx={{ minWidth: 'auto', mr: 1 }}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="small" 
                            color="error" 
                            variant="text" 
                            onClick={() => deleteComment(question.id, comment.id, chapterId, topicId)}
                            sx={{ minWidth: 'auto' }}
                          >
                            Delete
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
          
          {/* Show comment form only if the user hasn't already commented */}
          {!userHasComment && (
            <Box>
              <Typography variant="subtitle2">Leave a comment:</Typography>
              <TextField
                multiline
                rows={2}
                fullWidth
                variant="outlined"
                placeholder="Enter your comment here..."
                value={comments[question.id] || ""}
                onChange={(e) => handleCommentChange(question.id, e.target.value)}
                sx={{ mt: 1, mb: 2 }}
              />
              
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => submitComment(question, chapterId, topicId)}
                disabled={!comments[question.id]}
                sx={{ bgcolor: "#011E41" }}
              >
                Submit Comment
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ m: 4 }}>
      {/* Header with back button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="#011E41">
          Admin Question Review
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin')}
          sx={{ ml: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 3, color: "#011E41" }}>
          Select Book to Review
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => {
                  const deptId = e.target.value;
                  setSelectedDepartment(deptId);
                  
                  // Find the corresponding department name from the departments array
                  const selectedDept = departments.find(dept => dept.id === deptId);
                  setSelectedDepartmentName(selectedDept ? selectedDept.name : "");
                }}
                label="Department"
                disabled={loading}
              >
                {departments.length === 0 && !loading ? (
                  <MenuItem disabled value="">No departments found</MenuItem>
                ) : (
                  departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {loading && departments.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Loading departments...
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!selectedDepartment || loading}>
              <InputLabel>Grade</InputLabel>
              <Select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                label="Grade"
              >
                {grades.length === 0 && selectedDepartment && loading ? (
                  <MenuItem disabled value="">Loading grades...</MenuItem>
                ) : grades.length === 0 && selectedDepartment ? (
                  <MenuItem disabled value="">No grades found</MenuItem>
                ) : (
                  grades.map((grade) => (
                    <MenuItem key={grade} value={grade}>
                      {grade}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {loading && selectedDepartment && grades.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Loading grades...
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!selectedGrade || loading}>
              <InputLabel>Book</InputLabel>
              <Select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                label="Book"
              >
                {books.length === 0 && selectedGrade && loading ? (
                  <MenuItem disabled value="">Loading books...</MenuItem>
                ) : books.length === 0 && selectedGrade ? (
                  <MenuItem disabled value="">No books found</MenuItem>
                ) : (
                  books.map((book) => (
                    <MenuItem key={book.id} value={book.id}>
                      {book.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {loading && selectedGrade && books.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Loading books...
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={loadBookStructure}
              disabled={!selectedBook}
              fullWidth
              sx={{ bgcolor: "#011E41", mt: 2 }}
            >
              View Book Content
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {bookStructure && !loading && (
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
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ChapterIcon sx={{ mr: 1, color: '#011E41' }} />
                  <Typography variant="h6">{chapter.name}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {chapter.topics.map((topic) => (
                  <Accordion
                    key={topic.id}
                    expanded={expandedTopic === topic.id}
                    onChange={() => handleTopicExpand(topic.id, chapter.id, topic.questions)}
                    sx={{ mb: 1, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TopicIcon sx={{ mr: 1, color: '#011E41' }} />
                        <Typography>{topic.name}</Typography>
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
                        topic.questions.map((question) => 
                          renderQuestion(question, chapter.id, topic.id)
                        )
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default ViewQuestions;
