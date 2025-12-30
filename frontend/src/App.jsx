import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/common/Layout'
import HomePage from './pages/HomePage'
import AnalysisPage from './pages/AnalysisPage'
import InterviewPage from './pages/InterviewPage'
import ReportPage from './pages/ReportPage'

function App() {
  return (
    <>
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
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="analysis/:resumeId" element={<AnalysisPage />} />
          <Route path="interview/:resumeId" element={<InterviewPage />} />
          <Route path="report/:sessionId" element={<ReportPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
