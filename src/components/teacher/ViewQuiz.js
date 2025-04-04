import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Button, Container, Paper, Grid, Divider, 
  Card, CardContent, CardActions, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Chip, TextField, InputAdornment,
  DialogContentText
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import QuizIcon from '@mui/icons-material/Quiz';
import DateRangeIcon from '@mui/icons-material/DateRange';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ClassIcon from '@mui/icons-material/Class';
import SortIcon from '@mui/icons-material/Sort';
import DeleteIcon from '@mui/icons-material/Delete';
import { doc, deleteDoc } from "firebase/firestore";

const ViewQuiz = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [success, setSuccess] = useState(null);
  
  // UI states
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  
  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        navigate('/login');
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);
  
  // Fetch quizzes when user is authenticated
  useEffect(() => {
    if (currentUser) {
      fetchQuizzes();
    }
  }, [currentUser]);
  
  // Updated fetchQuizzes function for ViewQuiz.js
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, find the teacher's document ID
      const teachersRef = collection(db, "users", "usersData", "teachers");
      const teacherQuery = query(teachersRef, where("email", "==", currentUser.email));
      const teacherSnapshot = await getDocs(teacherQuery);
      
      if (teacherSnapshot.empty) {
        setError("Could not find your teacher account");
        setQuizzes([]);
        setLoading(false);
        return;
      }
      
      const teacherId = teacherSnapshot.docs[0].id;
      
      // Now fetch quizzes from the teacher's subcollection
      const teacherQuizesRef = collection(
        db, 
        "users", 
        "usersData", 
        "teachers", 
        teacherId, 
        "quizes"
      );
      
      const q = query(teacherQuizesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setQuizzes([]);
        setError("You haven't created any quizzes yet.");
      } else {
        const quizzesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? 
            new Date(doc.data().createdAt.seconds * 1000) : 
            new Date()
        }));
        
        setQuizzes(quizzesData);
        console.log(`Loaded ${quizzesData.length} quizzes`);
      }
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      setError("Failed to load quizzes: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Filter quizzes based on search term
  const filteredQuizzes = quizzes.filter(quiz => {
    const searchString = searchTerm.toLowerCase();
    return (
      (quiz.title && quiz.title.toLowerCase().includes(searchString)) ||
      (quiz.department && quiz.department.toLowerCase().includes(searchString)) ||
      (quiz.grade && quiz.grade.toLowerCase().includes(searchString)) ||
      (quiz.book && quiz.book.toLowerCase().includes(searchString))
    );
  });
  
  // Handle quiz selection for viewing
  const handleViewQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setDialogOpen(true);
  };
  
  // Print quiz
  const handlePrintQuiz = (quiz) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${quiz.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; }
          h1 { color: #011E41; margin-bottom: 20px; }
          .quiz-info { margin-bottom: 30px; }
          .question-item { margin-bottom: 25px; }
          .question-text { font-weight: bold; margin-bottom: 10px; }
          .options { margin-left: 20px; }
          .option-item { margin-bottom: 5px; }
          @media print {
            .no-print { display: none; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background-color: #011E41; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print Quiz
          </button>
        </div>
        
        <h1>${quiz.title}</h1>
        <p>${quiz.description || ''}</p>
        
        <div class="quiz-info">
          <p><strong>Department:</strong> ${quiz.department}</p>
          <p><strong>Grade:</strong> ${quiz.grade}</p>
          <p><strong>Book:</strong> ${quiz.book}</p>
        </div>
        
        ${quiz.questions.map((question, index) => `
          <div class="question-item">
            <div class="question-text">${index + 1}. ${question.text}</div>
            ${question.type === "multiple" ? `
              <div class="options">
                ${question.options.map((option, i) => `
                  <div class="option-item">
                    ${String.fromCharCode(65 + i)}) ${option}
                  </div>
                `).join('')}
              </div>
            ` : question.type === "short" ? `
              <div class="options">
                Answer: ________________________
              </div>
            ` : `
              <div class="options">
                <div class="option-item">True / False</div>
              </div>
            `}
            <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
              ${question.chapterName} > ${question.topicName}
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Print answer key
  const handlePrintAnswerKey = (quiz) => {
    const answerKeyContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Answer Key - ${quiz.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; }
          h1 { color: #011E41; margin-bottom: 20px; }
          .quiz-info { margin-bottom: 30px; }
          .answer-item { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
          .question { margin-bottom: 5px; }
          .answer { font-weight: bold; }
          .topic { font-style: italic; color: #666; font-size: 0.9em; }
          @media print {
            .no-print { display: none; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background-color: #011E41; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print Answer Key
          </button>
        </div>
        
        <h1>Answer Key: ${quiz.title}</h1>
        
        <div class="quiz-info">
          <p><strong>Department:</strong> ${quiz.department}</p>
          <p><strong>Grade:</strong> ${quiz.grade}</p>
          <p><strong>Book:</strong> ${quiz.book}</p>
        </div>
        
        ${quiz.questions.map((question, index) => `
          <div class="answer-item">
            <div class="question"><strong>Q${index + 1}:</strong> ${question.text}</div>
            <div class="answer">Answer: ${
              question.type === "multiple" 
                ? question.options[question.correctOption] 
                : question.type === "short" 
                  ? question.shortAnswer 
                  : question.isTrueAnswer 
                    ? "True" 
                    : "False"
            }</div>
            <div class="topic">Topic: ${question.chapterName} > ${question.topicName}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const answerWindow = window.open('', '_blank', 'width=800,height=600');
    answerWindow.document.write(answerKeyContent);
    answerWindow.document.close();
  };

  // Add this function to handle quiz deletion
  const handleDeleteQuiz = async () => {
    try {
      setLoading(true);
      
      // First, find the teacher's document ID
      const teachersRef = collection(db, "users", "usersData", "teachers");
      const teacherQuery = query(teachersRef, where("email", "==", currentUser.email));
      const teacherSnapshot = await getDocs(teacherQuery);
      
      if (teacherSnapshot.empty) {
        throw new Error("Could not find your teacher account");
      }
      
      const teacherId = teacherSnapshot.docs[0].id;
      
      // Delete the quiz document
      const quizDocRef = doc(
        db, 
        "users", 
        "usersData", 
        "teachers", 
        teacherId, 
        "quizes",
        quizToDelete.id
      );
      
      await deleteDoc(quizDocRef);
      
      // Update UI by filtering out the deleted quiz
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizToDelete.id));
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
      setError(null);
      setSuccess("Quiz deleted successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting quiz:", err);
      setError(`Failed to delete quiz: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 2 }}>
        {/* Header with back button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" color="#011E41">
            My Quizzes
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/teacher")}
          >
            Back to Dashboard
          </Button>
        </Box>
        
        {error && !loading && quizzes.length === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {error && !loading && quizzes.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        {/* Search bar - simplified */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            placeholder="Search quizzes..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: '100%', maxWidth: 500 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {searchTerm && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {filteredQuizzes.length} results found
              </Typography>
            )}
          </Box>
        </Paper>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {quizzes.length === 0 ? (
              <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                <QuizIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography variant="h6">
                  No Quizzes Found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  You haven't created any quizzes yet.
                </Typography>
                <Button 
                  variant="contained"
                  onClick={() => navigate('/teacher/generate-quiz')}
                >
                  Create New Quiz
                </Button>
              </Paper>
            ) : (
              <Paper elevation={3}>
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell>Quiz Title</TableCell>
                        <TableCell>Book</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell>Questions</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredQuizzes
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((quiz) => (
                          <TableRow 
                            key={quiz.id}
                            hover
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >
                            <TableCell component="th" scope="row">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <QuizIcon sx={{ color: '#011E41', mr: 1 }} />
                                {quiz.title}
                              </Box>
                            </TableCell>
                            <TableCell>{quiz.book}</TableCell>
                            <TableCell>{quiz.department}</TableCell>
                            <TableCell>{quiz.grade}</TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={quiz.questions.length} 
                                sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }}
                              />
                            </TableCell>
                            <TableCell>
                              {quiz.createdAt.toLocaleDateString()}
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => handleViewQuiz(quiz)}
                                sx={{ mr: 1 }}
                              >
                                View
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => {
                                  setQuizToDelete(quiz);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      
                      {filteredQuizzes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                            <Typography variant="body1">
                              No quizzes found matching your search
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredQuizzes.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </Paper>
            )}
          </>
        )}
      </Box>
      
      {/* Quiz Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedQuiz && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8f9fa' }}>
              <Box>
                <Typography variant="h6">{selectedQuiz.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Created on {selectedQuiz.createdAt.toLocaleDateString()}
                </Typography>
              </Box>
              <IconButton onClick={() => setDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1">{selectedQuiz.description || 'No description provided.'}</Typography>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <MenuBookIcon sx={{ mr: 1, color: '#011E41' }} />
                      <Typography variant="subtitle2">Book</Typography>
                    </Box>
                    <Typography>{selectedQuiz.book}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ClassIcon sx={{ mr: 1, color: '#011E41' }} />
                      <Typography variant="subtitle2">Department & Grade</Typography>
                    </Box>
                    <Typography>{selectedQuiz.department}, {selectedQuiz.grade}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <QuestionAnswerIcon sx={{ mr: 1, color: '#011E41' }} />
                      <Typography variant="subtitle2">Questions</Typography>
                    </Box>
                    <Typography>{selectedQuiz.questions.length} questions</Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Questions Preview
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {selectedQuiz.questions.slice(0, 3).map((question, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', mb: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%',
                        bgcolor: '#011E41',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mr: 1
                      }}>
                        {index + 1}
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {question.text}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ pl: 4, fontSize: '0.9rem', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        Type: {question.type === 'multiple' ? 'Multiple Choice' : 
                               question.type === 'short' ? 'Short Answer' : 'True/False'}
                      </Typography>
                      <Typography variant="body2">
                        Topic: {question.chapterName} &gt; {question.topicName}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              
              {selectedQuiz.questions.length > 3 && (
                <Box sx={{ textAlign: 'center', mt: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    ... and {selectedQuiz.questions.length - 3} more questions
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
              <Button onClick={() => setDialogOpen(false)}>
                Close
              </Button>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => handlePrintAnswerKey(selectedQuiz)}
                  sx={{ mr: 2 }}
                >
                  Print Answer Key
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={() => handlePrintQuiz(selectedQuiz)}
                >
                  Print Quiz
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the quiz "{quizToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteQuiz} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ViewQuiz;