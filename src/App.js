import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminDashboard from "./components/admin/AdminPanel";
import CreateUser from "./components/admin/CreateUser";
import EditUser from "./components/admin/EditUser";
import CreateCategories from "./components/admin/CreateCategories";
import CreateGrades from "./components/admin/CreateGrades";
import AddSubjects from "./components/admin/AddSubjects";
import AdminCreateBook from "./components/admin/AdminCreateBook";
import ViewQuestions from "./components/admin/ViewQuestions";
import Login from "./components/Login";
import ProfileScreen from "./components/ProfileScreen";
import TeacherPanel from "./components/teacher/TeacherPanel";
import QuestionBank from "./components/teacher/QuestionBank";
import GenerateQuiz from "./components/teacher/GenerateQuiz";
import ViewEditBook from "./components/teacher/ViewEditBook";
import ApprovalRequests from "./components/admin/ApprovalRequests";
import UserAccounts from "./components/admin/UserAccounts";
import ViewQuiz from "./components/teacher/ViewQuiz";

const App = () => {
  return (
    <Routes default>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/teacher" element={<TeacherPanel />} />
      <Route path="/create-user" element={<CreateUser />} />
      <Route path="/edit-user" element={<EditUser />} />
      <Route path="/user-accounts" element={<UserAccounts />} />
      <Route path="/create-categories" element={<CreateCategories />} />
      <Route path="/create-grades" element={<CreateGrades />} />
      <Route path="/add-subjects" element={<AddSubjects />} />
      <Route path="/admin/create-book" element={<AdminCreateBook />} />
      <Route path="/view-questions" element={<ViewQuestions />} />
      <Route path="/approval-requests" element={<ApprovalRequests />} />
      <Route path="/profile" element={<ProfileScreen />} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<TeacherPanel />} />
      <Route path="/teacher/question-bank" element={<QuestionBank />} />
      <Route path="/teacher/generate-quiz" element={<GenerateQuiz />} />
      <Route path="/teacher/view-books" element={<ViewEditBook />} />
      <Route path="/teacher/view-quiz" element={<ViewQuiz />} />

    </Routes>
  );
};

export default App;
