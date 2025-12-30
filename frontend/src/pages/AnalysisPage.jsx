import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  FileText,
  Loader2,
  ArrowRight,
  RefreshCw,
  User,
  Briefcase,
  Code,
  Database,
  Cloud,
  Wrench,
  Award,
  TrendingUp,
  MessageSquare,
  GraduationCap,
  Building
} from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeResume, getResume } from '../services/api'

export default function AnalysisPage() {
  const { resumeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [resume, setResume] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const jobDescription = location.state?.jobDescription || ''

  useEffect(() => {
    loadAnalysis()
  }, [resumeId])

  const loadAnalysis = async () => {
    setLoading(true)
    try {
      const resumeData = await getResume(resumeId)
      setResume(resumeData)

      const analysisResult = await analyzeResume(resumeId, jobDescription || null)
      setAnalysis(analysisResult)
    } catch (error) {
      console.error('Error loading analysis:', error)
      toast.error(error.message || 'Failed to analyze resume')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Analyzing resume...</p>
          <p className="text-gray-500 text-sm">Extracting candidate information</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Failed to load analysis</p>
        <button onClick={loadAnalysis} className="px-4 py-2 bg-primary-600 text-white rounded-lg">
          Try Again
        </button>
      </div>
    )
  }

  const profile = analysis.candidate_profile || {}
  const techSkills = analysis.technical_skills || {}
  const domainExpertise = analysis.domain_expertise || {}

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate Analysis</h1>
          <p className="text-gray-500 text-sm flex items-center mt-1">
            <FileText className="w-4 h-4 mr-1" />
            {resume?.filename}
          </p>
        </div>
        <button
          onClick={loadAnalysis}
          className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Candidate Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {profile.title || 'Professional'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                {profile.career_stage || 'Professional'}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                {profile.domain || 'Technology'}
              </span>
              {profile.years_experience && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                  {profile.years_experience}
                </span>
              )}
            </div>
            {(profile.current_company || profile.current_role) && (
              <p className="text-sm text-gray-600 mt-2 flex items-center">
                <Building className="w-4 h-4 mr-1" />
                {profile.current_role && <span>{profile.current_role}</span>}
                {profile.current_role && profile.current_company && <span className="mx-1">at</span>}
                {profile.current_company && <span className="font-medium">{profile.current_company}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Recruiter Verdict */}
        {analysis.verdict && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Recruiter Assessment:</strong> {analysis.verdict}
            </p>
          </div>
        )}
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${getScoreBg(analysis.overall_score)}`}>
          <span className="text-xs font-medium text-gray-600">Overall</span>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.overall_score)}`}>
            {Math.round(analysis.overall_score || 0)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">Technical</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.technical_score || analysis.ats_score)}`}>
            {Math.round(analysis.technical_score || analysis.ats_score || 0)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">Experience</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.experience_score || analysis.content_score)}`}>
            {Math.round(analysis.experience_score || analysis.content_score || 0)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">JD Match</span>
          <div className={`text-2xl font-bold mt-1 ${analysis.jd_match_score ? getScoreColor(analysis.jd_match_score) : 'text-gray-400'}`}>
            {analysis.jd_match_score ? Math.round(analysis.jd_match_score) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Technical Skills */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Code className="w-5 h-5 mr-2 text-primary-600" />
          Technical Skills
        </h3>
        <div className="space-y-4">
          {techSkills.languages?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Code className="w-3 h-3 mr-1" /> Languages
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.languages.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {techSkills.frameworks?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Wrench className="w-3 h-3 mr-1" /> Frameworks & Libraries
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.frameworks.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {techSkills.databases?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Database className="w-3 h-3 mr-1" /> Databases
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.databases.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {techSkills.cloud_devops?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Cloud className="w-3 h-3 mr-1" /> Cloud & DevOps
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.cloud_devops.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-orange-50 text-orange-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {techSkills.tools?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center">
                <Wrench className="w-3 h-3 mr-1" /> Tools & Platforms
              </h4>
              <div className="flex flex-wrap gap-2">
                {techSkills.tools.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Domain Expertise & Certifications */}
      {(domainExpertise.industries?.length > 0 || domainExpertise.specializations?.length > 0 || domainExpertise.certifications?.length > 0 || analysis.certifications?.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-primary-600" />
            Domain Expertise
          </h3>
          <div className="space-y-4">
            {domainExpertise.industries?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Industries</h4>
                <div className="flex flex-wrap gap-2">
                  {domainExpertise.industries.map((item, idx) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {domainExpertise.specializations?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Specializations</h4>
                <div className="flex flex-wrap gap-2">
                  {domainExpertise.specializations.map((item, idx) => (
                    <span key={idx} className="px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(domainExpertise.certifications?.length > 0 || analysis.certifications?.length > 0) && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {(domainExpertise.certifications || analysis.certifications || []).map((cert, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm rounded-full font-medium">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Soft Skills */}
      {analysis.soft_skills?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-primary-600" />
            Leadership & Soft Skills
          </h3>
          <div className="space-y-2">
            {analysis.soft_skills.map((skill, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{skill}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Career Highlights */}
      {analysis.career_highlights?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Key Achievements
          </h3>
          <div className="space-y-3">
            {analysis.career_highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Summary */}
      {analysis.experience_summary?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-primary-600" />
            Work History
          </h3>
          <div className="space-y-4">
            {analysis.experience_summary.map((exp, idx) => (
              <div key={idx} className="border-l-2 border-primary-200 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{exp.role}</h4>
                  <span className="text-xs text-gray-500">{exp.duration}</span>
                </div>
                <p className="text-sm text-primary-600">{exp.company}</p>
                {exp.highlight && (
                  <p className="text-sm text-gray-600 mt-1">{exp.highlight}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {analysis.education?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2 text-primary-600" />
            Education
          </h3>
          <div className="space-y-3">
            {analysis.education.map((edu, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{edu.degree}</h4>
                  <p className="text-sm text-gray-600">{edu.institution}</p>
                  {edu.year && <p className="text-xs text-gray-500">{edu.year}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview Topics */}
      {analysis.interview_topics?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
            Suggested Interview Topics
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Key areas to explore during the interview:
          </p>
          <div className="space-y-2">
            {analysis.interview_topics.map((topic, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-100">
                <span className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {idx + 1}
                </span>
                <p className="text-sm text-gray-700">{topic}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => navigate(`/interview/${resumeId}`, { state: { jobDescription } })}
          className="flex items-center px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Start Mock Interview
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  )
}
