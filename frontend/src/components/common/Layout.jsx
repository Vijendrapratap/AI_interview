import { Outlet, Link, useLocation } from 'react-router-dom'
import { FileText, Home, ArrowLeft } from 'lucide-react'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ResumeAI</span>
            </Link>

            {/* Back to Home (when not on home) */}
            {!isHome && (
              <Link
                to="/"
                className="flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Home
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-sm text-gray-500">
            Resume Analyzer & Interview Prep - Powered by AI
          </p>
        </div>
      </footer>
    </div>
  )
}
