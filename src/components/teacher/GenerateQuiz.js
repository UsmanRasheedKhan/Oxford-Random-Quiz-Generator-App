import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Button, Container, Paper, Grid, FormControl, 
  InputLabel, Select, MenuItem, FormLabel, RadioGroup, FormControlLabel, 
  Radio, Checkbox, TextField, CircularProgress, Divider, Accordion,
  AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon,
  ListItemText, Alert, Card, CardHeader, CardContent
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChapterIcon from '@mui/icons-material/MenuBook';
import TopicIcon from '@mui/icons-material/Topic';
import QuizIcon from '@mui/icons-material/Quiz';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import PrintIcon from '@mui/icons-material/Print';

const GenerateQuiz = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Selection states
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  
  // User permissions
  const [userAssignedDepartments, setUserAssignedDepartments] = useState([]);
  const [userAssignedGrades, setUserAssignedGrades] = useState({});
  
  // Book data
  const [bookStructure, setBookStructure] = useState(null);
  
  // Quiz generation options
  const [quizType, setQuizType] = useState("single"); // single, multiple, whole
  const [selectedSingleChapter, setSelectedSingleChapter] = useState(""); // Add this line
  const [selectedChapters, setSelectedChapters] = useState({});
  const [selectedTopics, setSelectedTopics] = useState({});
  const [questionCount, setQuestionCount] = useState(10);
  
  // Generate state
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: selection, 2: options, 3: quiz

  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [quizHeaders, setQuizHeaders] = useState({ title: "", description: "" });
  const [showTopicNames, setShowTopicNames] = useState(true);
  const [success, setSuccess] = useState(null);

  const handlePrintQuiz = () => {
    window.print(); // Directly trigger the print functionality
  };

  const handlePrint = () => {
    setPrintDialogOpen(false);
    window.print(); // Trigger print
  };
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        navigate('/login');
      } else {
        setAuthLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);
  
  // Load user and their departments
  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchUserDepartments(currentUser);
    } else if (!authLoading && !currentUser) {
      navigate("/login");
    }
  }, [currentUser, authLoading, navigate]);
  
  // Fetch user's assigned departments and grades
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
        
        // Store assigned departments
        const assignedDepartments = teacherData.department || [];
        setUserAssignedDepartments(assignedDepartments);
        setDepartments(assignedDepartments);
        
        // Parse grades in "Department|Grade" format
        const gradesArray = teacherData.grades || [];
        const parsedGrades = {};
        
        gradesArray.forEach(gradeString => {
          if (gradeString && gradeString.includes('|')) {
            const [department, grade] = gradeString.split('|');
            
            if (!parsedGrades[department]) {
              parsedGrades[department] = [];
            }
            
            parsedGrades[department].push(grade);
          }
        });
        
        setUserAssignedGrades(parsedGrades);
      } else {
        setError("Could not find your teacher profile");
      }
    } catch (error) {
      console.error("Error fetching teacher data:", error);
      setError("Failed to load profile data");
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
      const assignedGradesForDept = userAssignedGrades[department] || [];
      
      if (assignedGradesForDept.length > 0) {
        setGrades(assignedGradesForDept);
      } else {
        setGrades([]);
        setError(`You don't have any grades assigned in the ${department} department`);
      }
    } catch (error) {
      console.error("Error fetching grades:", error);
      setError("Failed to load grades");
    }
  };
  
  // Fetch books when grade changes
  useEffect(() => {
    if (selectedDepartment && selectedGrade) {
      fetchBooks(selectedDepartment, selectedGrade);
    } else {
      setBooks([]);
      setSelectedBook(null);
    }
  }, [selectedDepartment, selectedGrade]);
  
  // Fetch books from the books database
  const fetchBooks = async (department, grade) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Integrity checks
      if (!userAssignedDepartments.includes(department)) {
        setError("You are not authorized to access this department");
        setLoading(false);
        return;
      }
      
      const assignedGradesForDept = userAssignedGrades[department] || [];
      if (!assignedGradesForDept.includes(grade)) {
        setError("You are not authorized to access this grade");
        setLoading(false);
        return;
      }
      
      // Updated path to match the described structure:
      // books -> department name -> grades -> grade name -> books
      const formattedGrade = grade.replace(" ", "_");
      const booksRef = collection(db, "books", department, "grades", formattedGrade, "books");
      const booksSnapshot = await getDocs(booksRef);
      
      const booksData = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.id.replace(/_/g, " "),
        ...doc.data()
      }));
      
      setBooks(booksData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching books:", error);
      setError("Failed to load books: " + error.message);
      setLoading(false);
    }
  };
  
  // When book is selected, load its structure
  const handleViewBook = async () => {
    if (selectedBook) {
      await loadBookStructure(selectedBook);
      // Move to the next step once book structure is loaded
      setStep(2);
      // Reset quiz type and selections
      setQuizType("single");
      setSelectedChapters({});
      setSelectedTopics({});
    }
  };
  
  // Load book structure from the hierarchical database
  const loadBookStructure = async (bookId) => {
    try {
      setLoading(true);
      setError(null);
      
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
      
      // Get chapters
      const chaptersRef = collection(db, "books", selectedDepartment, "grades", formattedGrade, "books", bookId, "chapters");
      const chaptersSnapshot = await getDocs(chaptersRef);
      
      const chaptersData = await Promise.all(
        chaptersSnapshot.docs.map(async (chapterDoc) => {
          const chapterId = chapterDoc.id;
          const chapterData = {
            name: chapterId.replace(/_/g, " "),
            ...chapterDoc.data()
          };
          
          // Get topics for this chapter
          const topicsRef = collection(db, "books", selectedDepartment, "grades", formattedGrade, "books", bookId, "chapters", chapterId, "topics");
          const topicsSnapshot = await getDocs(topicsRef);
          
          const topicsData = await Promise.all(
            topicsSnapshot.docs.map(async (topicDoc) => {
              const topicId = topicDoc.id;
              const topicData = {
                name: topicId.replace(/_/g, " "),
                ...topicDoc.data()
              };
              
              return {
                id: topicId,
                name: topicData.name,
                order: topicData.order || 0
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
  
  // Handle chapter selection for multiple chapters
  const handleChapterChange = (chapterId) => {
    setSelectedChapters(prev => {
      const updated = { ...prev };
      updated[chapterId] = !updated[chapterId];
      return updated;
    });
    
    // If unselecting a chapter, remove its topics
    if (selectedChapters[chapterId]) {
      setSelectedTopics(prev => {
        const updated = { ...prev };
        // Remove all topics for this chapter
        bookStructure.chapters.find(c => c.id === chapterId)?.topics.forEach(topic => {
          delete updated[topic.id];
        });
        return updated;
      });
    }
  };
  
  // Handle topic selection
  const handleTopicChange = (topicId) => {
    setSelectedTopics(prev => {
      const updated = { ...prev };
      updated[topicId] = !updated[topicId];
      return updated;
    });
  };
  
  // Generate quiz from selected options
  const generateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate selections
      if (quizType === "single") {
        if (!selectedSingleChapter) {
          setError("Please select a chapter");
          setLoading(false);
          return;
        }
        
        if (!Object.values(selectedTopics).some(v => v)) {
          setError("Please select at least one topic");
          setLoading(false);
          return;
        }
      }
      
      if (quizType === "multiple" && !Object.values(selectedChapters).some(v => v)) {
        setError("Please select at least one chapter");
        setLoading(false);
        return;
      }
      
      if (questionCount < 1) {
        setError("Please enter a valid number of questions");
        setLoading(false);
        return;
      }
      
      // Determine topics to fetch questions from
      let targetTopics = [];
      const formattedGrade = selectedGrade.replace(" ", "_");
      
      if (quizType === "whole") {
        // Get all topics from all chapters
        bookStructure.chapters.forEach(chapter => {
          chapter.topics.forEach(topic => {
            targetTopics.push({
              chapterId: chapter.id,
              topicId: topic.id,
              chapterName: chapter.name,
              topicName: topic.name
            });
          });
        });
      } else if (quizType === "multiple") {
        // Get selected topics from selected chapters
        bookStructure.chapters.forEach(chapter => {
          if (selectedChapters[chapter.id]) {
            chapter.topics.forEach(topic => {
              if (selectedTopics[topic.id]) {
                targetTopics.push({
                  chapterId: chapter.id,
                  topicId: topic.id,
                  chapterName: chapter.name,
                  topicName: topic.name
                });
              }
            });
          }
        });
      } else if (quizType === "single") {
        // Get selected topics from the selected chapter
        const chapter = bookStructure.chapters.find(c => c.id === selectedSingleChapter);
        if (chapter) {
          chapter.topics.forEach(topic => {
            if (selectedTopics[topic.id]) {
              targetTopics.push({
                chapterId: chapter.id,
                topicId: topic.id,
                chapterName: chapter.name,
                topicName: topic.name
              });
            }
          });
        }
      }
      
      if (targetTopics.length === 0) {
        setError("No topics available to generate questions from");
        setLoading(false);
        return;
      }
      
      // Fetch questions from each topic
      const allQuestions = [];
      for (const topic of targetTopics) {
        const questionsRef = collection(
          db, 
          "books", 
          selectedDepartment,
          "grades",
          formattedGrade,
          "books",
          selectedBook, 
          "chapters", 
          topic.chapterId,
          "topics",
          topic.topicId,
          "questions"
        );
        
        // Filter to only get approved questions
        const questionsQuery = query(questionsRef, where("status", "==", "approved"));
        const questionsSnapshot = await getDocs(questionsQuery);
        const questions = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          chapterName: topic.chapterName,
          topicName: topic.topicName
        }));
        
        allQuestions.push(...questions);
      }
      
      // Add this check after all questions have been fetched

      // Check if we have any approved questions
      if (allQuestions.length === 0) {
        setError(
          "No approved questions found. Questions must be approved by an administrator " +
          "before they can be used in quizzes. Please try again later or contact an administrator."
        );
        setLoading(false);
        return;
      }

      // Continue with generating the quiz if we have approved questions...
      
      // Randomly select questions up to the requested count
      let selectedQuestions = [];
      if (allQuestions.length <= questionCount) {
        selectedQuestions = allQuestions;
      } else {
        // Shuffle array and take first n elements
        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
        selectedQuestions = shuffled.slice(0, questionCount);
      }
      
      // Generate the quiz object
      const quiz = {
        title: `${bookStructure.name} Quiz`,
        description: `Generated ${quizType} quiz with ${selectedQuestions.length} questions`,
        department: selectedDepartment,
        grade: selectedGrade,
        book: bookStructure.name,
        quizType,
        createdAt: new Date(),
        questions: selectedQuestions
      };
      
      setGeneratedQuiz(quiz);
      setStep(3);
      setLoading(false);
    } catch (error) {
      console.error("Error generating quiz:", error);
      setError("Failed to generate quiz: " + error.message);
      setLoading(false);
    }
  };
  
  // Fix renderBookSelectionForm
const renderBookSelectionForm = () => (
  <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
    <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>Select Book</Typography>
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
      
      <Grid item xs={12} sm={2}>
        <Button 
          variant="contained"
          fullWidth
          onClick={handleViewBook}
          disabled={!selectedBook}
          sx={{ bgcolor: '#011E41', height: '56px' }}
        >
          Continue
        </Button>
      </Grid>
    </Grid>
  </Paper>
);

// Fix renderQuizTypeSelection
const renderQuizTypeSelection = () => (
  <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
    <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>Select Quiz Type</Typography>
    <FormControl component="fieldset">
      <RadioGroup
        value={quizType}
        onChange={(e) => {
          setQuizType(e.target.value);
          setSelectedSingleChapter(""); // Reset selected chapter when quiz type changes
          setSelectedChapters({});
          setSelectedTopics({});
        }}
      >
        <FormControlLabel value="single" control={<Radio />} label="Single Chapter" />
        <FormControlLabel value="multiple" control={<Radio />} label="Multiple Chapters" />
        <FormControlLabel value="whole" control={<Radio />} label="Whole Book" />
      </RadioGroup>
    </FormControl>
  </Paper>
);

// Fix renderTopicSelection - just for the single chapter case, similar fixes needed for other cases
const renderTopicSelection = () => {
  if (!bookStructure) return null;
  
  if (quizType === "single") {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>
          Select Chapter and Topics
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Chapter</InputLabel>
          <Select
            value={selectedSingleChapter || ""}
            onChange={(e) => {
              setSelectedSingleChapter(e.target.value);
              setSelectedTopics({}); // Reset topics when chapter changes
            }}
            label="Select Chapter"
          >
            {bookStructure.chapters.map((chapter) => (
              <MenuItem key={chapter.id} value={chapter.id}>
                {chapter.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedSingleChapter && (
          <List>
            {bookStructure.chapters
              .find(chapter => chapter.id === selectedSingleChapter)
              ?.topics.map((topic) => (
                <ListItem key={topic.id} dense button onClick={() => handleTopicChange(topic.id)}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={!!selectedTopics[topic.id]}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={topic.name} />
                </ListItem>
              ))}
          </List>
        )}
      </Paper>
    );
  } else if (quizType === "multiple") {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>
          Select Chapters and Topics
        </Typography>
        
        {bookStructure.chapters.map((chapter) => (
          <Accordion key={chapter.id} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={!!selectedChapters[chapter.id]}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChapterChange(chapter.id);
                  }}
                />
                <ChapterIcon sx={{ mr: 1, color: '#011E41' }} />
                <Typography>{chapter.name}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {chapter.topics.map((topic) => (
                  <ListItem key={topic.id} dense>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={!!selectedTopics[topic.id]}
                        onChange={() => handleTopicChange(topic.id)}
                        disabled={!selectedChapters[chapter.id]}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={topic.name}
                      secondary={`Topic ${topic.order + 1}`}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    );
  } else if (quizType === "whole") {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>
          Whole Book Quiz
        </Typography>
        <Typography>
          Questions will be selected randomly from all {bookStructure.chapters.length} chapters and their topics.
        </Typography>
      </Paper>
    );
  }
  
  return null;
};

// Update the renderQuestionCount function

const renderQuestionCount = () => (
  <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
    <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>Number of Questions</Typography>
    <TextField
      type="number"
      value={questionCount}
      onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 0))}
      label="Question Count"
      inputProps={{ min: 1 }}
      sx={{ width: 200 }}
    />
    
    {/* Add this warning message */}
    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
      If fewer approved questions are available than your requested count, 
      all available approved questions will be included.
    </Typography>
  </Paper>
);

// Fix renderGeneratedQuiz
const renderGeneratedQuiz = () => {
  if (!generatedQuiz) return null;

  return (
    <Box>
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
    
      {/* Quiz header form */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, className: "no-print" }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#011E41" }}>
          Quiz Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Quiz Title"
              value={quizHeaders.title || generatedQuiz.title}
              onChange={(e) => setQuizHeaders({...quizHeaders, title: e.target.value})}
              variant="outlined"
              placeholder="Enter quiz title"
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Quiz Description"
              value={quizHeaders.description || generatedQuiz.description}
              onChange={(e) => setQuizHeaders({...quizHeaders, description: e.target.value})}
              variant="outlined"
              placeholder="Enter quiz description"
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showTopicNames}
                  onChange={(e) => setShowTopicNames(e.target.checked)}
                />
              }
              label="Show chapter and topic names with questions"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Quiz info - will be printed */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom color="#011E41">
          {quizHeaders.title || generatedQuiz.title}
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          {quizHeaders.description || generatedQuiz.description}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Department:</strong> {generatedQuiz.department}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Grade:</strong> {generatedQuiz.grade}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Book:</strong> {generatedQuiz.book}
        </Typography>
        <Typography variant="body2">
          <strong>Questions:</strong> {generatedQuiz.questions.length}
        </Typography>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2, color: "#011E41" }}>
        Quiz Questions
      </Typography>

      {/* Questions - will be printed */}
      {generatedQuiz.questions.map((question, index) => (
        <Card key={question.id} sx={{ mb: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <CardHeader
            title={`Question ${index + 1}`}
            subheader={showTopicNames ? `${question.chapterName} > ${question.topicName}` : null}
            avatar={<QuizIcon sx={{ color: "#011E41" }} />}
          />
          <CardContent>
            <Typography variant="body1" gutterBottom sx={{ fontWeight: 'medium' }}>
              {question.text}
            </Typography>

            {question.type === "multiple" && (
              <List dense>
                {question.options.map((option, optIndex) => (
                  <ListItem key={optIndex}>
                    <Radio disabled /> {/* Do not show the correct option */}
                    <ListItemText primary={option} />
                  </ListItem>
                ))}
              </List>
            )}

            {question.type === "short" && (
              <Box sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                <Typography variant="body2">
                  <strong>Answer:</strong> __________________________
                </Typography>
              </Box>
            )}

            {question.type === "truefalse" && (
              <Box sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                <Typography variant="body2">
                  <strong>Answer:</strong> True / False
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Action buttons - will not be printed */}
      <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'center', className: "no-print" }}>
        <Button
          variant="contained"
          onClick={saveQuizToDatabase}
          sx={{ mr: 2 }}
          startIcon={<SaveAltIcon />}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Quiz"}
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handlePrintQuiz}
          sx={{ mr: 2, bgcolor: '#011E41' }}
          startIcon={<PrintIcon />}
        >
          Print Quiz
        </Button>
        
        <Button
          variant="outlined"
          onClick={handlePrintAnswerKey}
          startIcon={<PrintIcon />}
        >
          Print Answer Key
        </Button>
      </Box>
    </Box>
  );
};

const handlePrintAnswerKey = () => {
  const answerKeyContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Answer Key - ${generatedQuiz.title}</title>
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
      
      <h1>Answer Key: ${quizHeaders.title || generatedQuiz.title}</h1>
      
      <div class="quiz-info">
        <p><strong>Department:</strong> ${generatedQuiz.department}</p>
        <p><strong>Grade:</strong> ${generatedQuiz.grade}</p>
        <p><strong>Book:</strong> ${generatedQuiz.book}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      
      ${generatedQuiz.questions.map((question, index) => `
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

// Updated saveQuizToDatabase function
const saveQuizToDatabase = async () => {
  try {
    // Check if user is authenticated
    if (!currentUser) {
      setError("You must be logged in to save quizzes");
      return;
    }
    
    setLoading(true);
    
    // Create quiz object to save (keep existing structure)
    const quizData = {
      title: quizHeaders.title || generatedQuiz.title,
      description: quizHeaders.description || generatedQuiz.description,
      department: generatedQuiz.department,
      grade: generatedQuiz.grade,
      book: generatedQuiz.book,
      quizType: generatedQuiz.quizType || 'standard',
      createdAt: serverTimestamp(),
      createdBy: currentUser.email,
      authorId: currentUser.uid,
      questions: generatedQuiz.questions.map(q => {
        // Create base object with common properties
        const questionData = {
          id: q.id,
          text: q.text,
          type: q.type,
          chapterName: q.chapterName || '',
          topicName: q.topicName || ''
        };
        
        // Add type-specific properties
        if (q.type === "multiple") {
          questionData.options = q.options || [];
          questionData.correctOption = q.correctOption !== undefined ? q.correctOption : 0;
        } 
        else if (q.type === "short") {
          questionData.shortAnswer = q.shortAnswer || '';
        }
        else if (q.type === "truefalse") {
          questionData.isTrueAnswer = q.isTrueAnswer === true;
        }
        
        return questionData;
      })
    };
    
    // First, fetch the teacher's document to ensure it exists
    const teacherQuery = query(
      collection(db, "users", "usersData", "teachers"),
      where("email", "==", currentUser.email)
    );
    const teacherSnapshot = await getDocs(teacherQuery);
    
    if (teacherSnapshot.empty) {
      throw new Error("Teacher profile not found");
    }
    
    const teacherId = teacherSnapshot.docs[0].id;
    
    // Save to teacher's collection instead of root quizes collection
    const teacherQuizesRef = collection(
      db, 
      "users", 
      "usersData", 
      "teachers", 
      teacherId, 
      "quizes"
    );
    
    const docRef = await addDoc(teacherQuizesRef, quizData);
    
    console.log("Quiz saved with ID:", docRef.id);
    setSuccess(`Quiz saved successfully!`);
    setTimeout(() => setSuccess(null), 5000);
    setLoading(false);
  } catch (error) {
    console.error("Error saving quiz:", error);
    setError("Failed to save quiz: " + error.message);
    setLoading(false);
  }
};

// Add this in your component before the return statement
useEffect(() => {
  // Add print styles
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      .no-print, button, .MuiAppBar-root, header, nav, footer {
        display: none !important;
      }
      body {
        padding: 0;
        margin: 0;
      }
      #quiz-section {
        padding: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  return () => {
    document.head.removeChild(style);
  };
}, []);

// Fix the return statement
return (
  <Container maxWidth="lg">
    <Box sx={{ mt: 4, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="no-print">
        <Typography variant="h4" component="h1" color="#011E41">
          Generate Quiz
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/teacher")}
        >
          Back to Dashboard
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && step === 1 && renderBookSelectionForm()}
      
      {!loading && step === 2 && (
        <>
          {renderQuizTypeSelection()}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Only questions approved by administrators will be included in the quiz. 
              If you've recently submitted questions, they may not appear until they've been reviewed.
            </Typography>
          </Alert>
          {renderTopicSelection()}
          {renderQuestionCount()}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => setStep(1)}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={generateQuiz}
              sx={{ bgcolor: '#011E41' }}
            >
              Generate Quiz
            </Button>
          </Box>
        </>
      )}
      
      {!loading && step === 3 && (
        <div id="quiz-section">
          {renderGeneratedQuiz()}
        </div>
      )}
    </Box>
  </Container>
);
};

export default GenerateQuiz;