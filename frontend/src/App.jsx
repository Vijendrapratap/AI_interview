import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/common/Layout'
import HomePage from './pages/HomePage'
import AnalysisPage from './pages/AnalysisPage'
import InterviewPage from './pages/InterviewPage'
import ReportPage from './pages/ReportPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { AuthProvider, useAuth } from './context/AuthContext'

import VerificationPage from './pages/VerificationPage'

import RecruiterDashboard from './pages/RecruiterDashboard'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!token) return <Navigate to="/login" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="analysis/:resumeId" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
          <Route path="verification/:resumeId" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
          <Route path="interview/:resumeId" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
          <Route path="report/:sessionId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="recruiter" element={<ProtectedRoute><RecruiterDashboard /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
