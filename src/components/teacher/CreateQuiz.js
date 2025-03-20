import React, { useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../firebase";

const CreateQuiz = () => {
  const [quizData, setQuizData] = useState({
    grade: "",
    subject: "",
    chapters: [],
    numOfQuestions: 0,
  });
  const [questions, setQuestions] = useState([]);

  const fetchQuestions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "questions"));
      const allQuestions = querySnapshot.docs.map((doc) => doc.data());
      setQuestions(allQuestions);
    } catch (error) {
      alert("Error fetching questions: " + error.message);
    }
  };

  const generateQuiz = () => {
    const filteredQuestions = questions
      .filter((q) => quizData.chapters.includes(q.chapter))
      .sort(() => Math.random() - 0.5)
      .slice(0, quizData.numOfQuestions);

    return filteredQuestions;
  };

  const handleQuizCreation = async () => {
    const generatedQuiz = generateQuiz();
    try {
      await addDoc(collection(db, "quizzes"), { ...quizData, questions: generatedQuiz });
      alert("Quiz created successfully!");
    } catch (error) {
      alert("Error creating quiz: " + error.message);
    }
  };

  return (
    <div>
      <h3>Create Quiz</h3>
      <button onClick={fetchQuestions}>Fetch Questions</button>
      {/* Add form elements for quizData input */}
      <button onClick={handleQuizCreation}>Generate Quiz</button>
    </div>
  );
};

export default CreateQuiz;
