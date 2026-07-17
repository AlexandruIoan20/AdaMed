import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SubjectsPage from "./pages/SubjectsPage";
import SubjectDetailPage from "./pages/SubjectDetailPage";
import QuizPage from "./pages/QuizPage";
import QuizResultPage from "./pages/QuizResultPage";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./components/AppLayout";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminFacultiesPage from "./pages/admin/AdminFacultiesPage";
import AdminSubjectsPage from "./pages/admin/AdminSubjectsPage";
import AdminFacultyDetailPage from "./pages/admin/AdminFacultyDetailPage";
import AdminSubjectQuestionsPage from "./pages/admin/AdminSubjectQuestionsPage";
import AdminQuestionEditorPage from "./pages/admin/AdminQuestionEditorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/subjects" replace />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
        <Route path="/quiz/:sessionId" element={<QuizPage />} />
        <Route path="/quiz/:sessionId/result" element={<QuizResultPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route
        element={
          <AdminRoute>
            <AppLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/faculties" element={<AdminFacultiesPage />} />
        <Route path="/admin/faculties/:facultyId" element={<AdminFacultyDetailPage />} />
        <Route path="/admin/subjects" element={<AdminSubjectsPage />} />
        <Route path="/admin/faculty-subjects/:facultySubjectId" element={<AdminSubjectQuestionsPage />} />
        <Route path="/admin/questions/new" element={<AdminQuestionEditorPage />} />
        <Route path="/admin/questions/:questionId" element={<AdminQuestionEditorPage />} />
      </Route>
    </Routes>
  );
}
