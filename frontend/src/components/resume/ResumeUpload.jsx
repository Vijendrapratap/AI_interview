import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadResume } from '../../services/api'

export default function ResumeUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt']
    const fileExt = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowedTypes.includes(fileExt)) {
      toast.error('Please upload a PDF, DOCX, or TXT file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setUploading(true)

    try {
      const result = await uploadResume(file)
      toast.success('Resume uploaded successfully!')
      onUploadComplete(result)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload resume')
      setSelectedFile(null)
    } finally {
      setUploading(false)
    }
  }, [onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    disabled: uploading
  })

  const removeFile = () => {
    setSelectedFile(null)
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer
          ${isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center text-center">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors
            ${isDragActive ? 'bg-primary-100' : 'bg-gray-100'}
          `}>
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            ) : (
              <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary-600' : 'text-gray-400'}`} />
            )}
          </div>

          {uploading ? (
            <div>
              <p className="font-medium text-gray-900">Uploading...</p>
              <p className="text-sm text-gray-500">Please wait while we process your resume</p>
            </div>
          ) : isDragActive ? (
            <div>
              <p className="font-medium text-primary-700">Drop your resume here</p>
              <p className="text-sm text-primary-500">Release to upload</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-900">
                Drag & drop your resume here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or <span className="text-primary-600 font-medium">browse files</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports: PDF, DOCX, TXT (Max 10MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Selected File Preview */}
      <AnimatePresence>
        {selectedFile && !uploading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-primary-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeFile()
              }}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
