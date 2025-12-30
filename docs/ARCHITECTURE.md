# Resume Analysis & Interview Preparation Platform - Architecture Document

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [API Design](#api-design)
7. [AI/ML Integration](#aiml-integration)
8. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose
A comprehensive web application that:
1. Analyzes resumes using AI for scoring, ATS compatibility, and improvement suggestions
2. Conducts AI-powered mock interviews (text, voice, and future video)
3. Generates detailed performance reports

### Key Features
- **Resume Upload & Parsing**: Support for PDF, DOCX, TXT formats
- **AI Resume Scoring**: Content quality, format, keyword density, ATS compatibility
- **Job Description Matching**: Compare resume against specific JD or provide general analysis
- **Interactive Interviews**: Text-based and voice-based mock interviews
- **Multi-dimensional Evaluation**: Knowledge, confidence, communication, technical skills
- **Comprehensive Reporting**: Detailed feedback with actionable insights

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Tailwind)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Resume Upload│  │ JD Input     │  │ Interview UI │  │ Reports View │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Voice Interface (Web Speech API + TTS)             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY (FastAPI)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ /api/resume  │  │ /api/analyze │  │/api/interview│  │ /api/report  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│   RESUME PROCESSOR    │ │   INTERVIEW ENGINE    │ │   REPORT GENERATOR    │
│  ┌─────────────────┐  │ │  ┌─────────────────┐  │ │  ┌─────────────────┐  │
│  │ PDF/DOCX Parser │  │ │  │ Question Engine │  │ │  │ Score Calculator│  │
│  │ Text Extractor  │  │ │  │ Response Eval   │  │ │  │ Insight Engine  │  │
│  │ Section Detector│  │ │  │ Follow-up Gen   │  │ │  │ PDF Generator   │  │
│  └─────────────────┘  │ │  └─────────────────┘  │ │  └─────────────────┘  │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI/LLM SERVICE LAYER                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Model Manager (Pluggable)                         │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │  │ OpenAI  │  │ Claude  │  │ Gemini  │  │ Ollama  │  │ Custom  │   │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     TTS/STT Service Layer                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │  │ ElevenLabs  │  │ OpenAI TTS  │  │ Google TTS  │  │ Azure TTS  │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   SQLite/    │  │    Redis     │  │  File Store  │  │  Session     │    │
│  │  PostgreSQL  │  │   (Cache)    │  │  (Uploads)   │  │   Store      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend Layer

#### Resume Upload Module
- Drag-and-drop file upload
- Supported formats: PDF, DOCX, TXT
- File validation and preview
- Progress indicator

#### Job Description Input
- Rich text editor for JD input
- Optional field (general analysis if empty)
- Job title and company input
- Industry/domain selection

#### Interview Interface
- **Text Mode**: Chat-like interface with typing indicators
- **Voice Mode**: Audio recording with waveform visualization
- Real-time transcription display
- Timer and question counter
- Pause/Resume functionality

#### Reports Dashboard
- Visual score breakdown (charts/graphs)
- Downloadable PDF reports
- Historical session comparison
- Improvement tracking

### 2. Backend API Layer (FastAPI)

#### Endpoints Structure
```
/api/v1/
├── /auth/                    # Authentication (future)
│   ├── POST /register
│   ├── POST /login
│   └── POST /logout
│
├── /resume/
│   ├── POST /upload          # Upload resume file
│   ├── GET /{id}             # Get resume details
│   └── DELETE /{id}          # Delete resume
│
├── /analysis/
│   ├── POST /analyze         # Analyze resume (with optional JD)
│   ├── GET /{id}             # Get analysis results
│   └── POST /compare         # Compare resume with JD
│
├── /interview/
│   ├── POST /start           # Start interview session
│   ├── POST /respond         # Submit answer (text)
│   ├── POST /respond/audio   # Submit answer (audio)
│   ├── GET /question/{id}    # Get current question
│   ├── POST /end             # End interview
│   └── GET /session/{id}     # Get session details
│
├── /report/
│   ├── GET /{session_id}     # Get interview report
│   ├── GET /{session_id}/pdf # Download PDF report
│   └── GET /history          # Get all reports
│
└── /tts/
    ├── POST /synthesize      # Convert text to speech
    └── POST /transcribe      # Convert speech to text
```

### 3. Resume Processor Module

#### Components
1. **File Parser**
   - PDF extraction (PyPDF2, pdfplumber)
   - DOCX extraction (python-docx)
   - Text cleaning and normalization

2. **Section Detector**
   - Contact Information
   - Summary/Objective
   - Work Experience
   - Education
   - Skills
   - Certifications
   - Projects

3. **Content Analyzer**
   - Keyword extraction
   - Action verb analysis
   - Quantifiable achievements detection
   - Gap identification

4. **ATS Compatibility Checker**
   - Format compatibility
   - Keyword density
   - Section headers standardization
   - File format scoring

### 4. Interview Engine Module

#### Question Generation
1. **Question Types**
   - Behavioral (STAR method prompts)
   - Technical (based on resume skills)
   - Situational
   - Role-specific
   - Culture fit

2. **Adaptive Questioning**
   - Difficulty adjustment based on responses
   - Follow-up questions for depth
   - Topic coverage balancing

#### Response Evaluation
1. **Evaluation Criteria**
   - Content relevance (0-10)
   - Communication clarity (0-10)
   - Technical accuracy (0-10)
   - Confidence indicators (0-10)
   - Structure and organization (0-10)

2. **Analysis Metrics**
   - Response length appropriateness
   - Keyword usage
   - Example specificity
   - STAR method adherence

### 5. TTS/STT Integration

#### Text-to-Speech (TTS)
- **Primary**: ElevenLabs API (natural voice)
- **Fallback**: OpenAI TTS
- **Free Option**: Google TTS (gTTS)
- Configurable voice selection
- Speed and pitch control

#### Speech-to-Text (STT)
- **Browser**: Web Speech API
- **Server**: OpenAI Whisper
- **Alternative**: Google Speech-to-Text
- Real-time transcription option

### 6. Report Generator

#### Report Components
1. **Resume Analysis Report**
   - Overall score breakdown
   - Section-by-section analysis
   - Improvement suggestions
   - JD match percentage (if provided)
   - Keyword recommendations

2. **Interview Performance Report**
   - Question-wise performance
   - Skill assessment radar chart
   - Strengths and weaknesses
   - Improvement recommendations
   - Sample better responses

---

## Data Flow

### Resume Analysis Flow
```
User Upload Resume → File Parser → Text Extraction → Section Detection
        ↓
    [Optional: Add JD]
        ↓
    AI Analysis Request
        ↓
    ┌─────────────────────────────────────────┐
    │           LLM Processing                 │
    │  - Content Quality Assessment            │
    │  - Keyword Extraction                    │
    │  - ATS Compatibility Check               │
    │  - JD Matching (if provided)             │
    │  - Improvement Suggestions               │
    └─────────────────────────────────────────┘
        ↓
    Score Calculation → Report Generation → Display Results
```

### Interview Flow
```
User Starts Interview → Load Resume Context + JD
        ↓
    Question Generation (LLM)
        ↓
    ┌─────────────────────────────────────────┐
    │        Interview Loop (5-10 Qs)          │
    │                                          │
    │  Display/Speak Question                  │
    │        ↓                                 │
    │  User Response (Text/Voice)              │
    │        ↓                                 │
    │  [Voice: STT Transcription]              │
    │        ↓                                 │
    │  Response Evaluation (LLM)               │
    │        ↓                                 │
    │  Generate Follow-up/Next Question        │
    │        ↓                                 │
    │  Store Response & Evaluation             │
    └─────────────────────────────────────────┘
        ↓
    Interview Complete → Generate Report → Display/Download
```

---

## Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | FastAPI | Async API server |
| Language | Python 3.10+ | Core development |
| Task Queue | Celery (optional) | Background processing |
| Cache | Redis (optional) | Session & response caching |
| Database | SQLite → PostgreSQL | Data persistence |
| File Storage | Local → S3 | Resume file storage |

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI framework |
| Styling | Tailwind CSS | Modern styling |
| State | Zustand/Redux | State management |
| Charts | Chart.js/Recharts | Visualizations |
| Audio | Web Audio API | Voice recording |
| HTTP | Axios | API communication |

### AI/ML Services
| Service | Options | Purpose |
|---------|---------|---------|
| LLM | OpenAI, Claude, Gemini, Ollama | Text generation & analysis |
| TTS | ElevenLabs, OpenAI TTS, Google TTS | Voice synthesis |
| STT | Whisper, Web Speech API | Voice transcription |
| Embeddings | OpenAI, Sentence Transformers | Semantic matching |

---

## AI/ML Integration

### Model Configuration (config/models.yaml)
```yaml
llm:
  default: "openai"
  providers:
    openai:
      model: "gpt-4"
      api_key_env: "OPENAI_API_KEY"
      temperature: 0.7
    claude:
      model: "claude-3-opus-20240229"
      api_key_env: "ANTHROPIC_API_KEY"
      temperature: 0.7
    ollama:
      model: "llama2"
      base_url: "http://localhost:11434"

tts:
  default: "elevenlabs"
  providers:
    elevenlabs:
      api_key_env: "ELEVENLABS_API_KEY"
      voice_id: "21m00Tcm4TlvDq8ikWAM"
    openai:
      api_key_env: "OPENAI_API_KEY"
      voice: "alloy"

stt:
  default: "whisper"
  providers:
    whisper:
      api_key_env: "OPENAI_API_KEY"
      model: "whisper-1"
```

### Prompt Management
All prompts are stored in `config/prompts/` directory:
- `resume_analysis.yaml` - Resume scoring prompts
- `interview_questions.yaml` - Question generation prompts
- `response_evaluation.yaml` - Answer evaluation prompts
- `report_generation.yaml` - Report creation prompts

---

## Future Enhancements

### Phase 2: Video Interview
```
┌─────────────────────────────────────────────────────────────────┐
│                    VIDEO INTERVIEW MODULE                        │
│                                                                  │
│  ┌────────────────────┐    ┌────────────────────┐              │
│  │   Avatar Engine    │    │   Video Analysis    │              │
│  │  ┌──────────────┐  │    │  ┌──────────────┐  │              │
│  │  │ D-ID API     │  │    │  │ Face Detection│  │              │
│  │  │ HeyGen API   │  │    │  │ Eye Contact   │  │              │
│  │  │ Synthesia    │  │    │  │ Body Language │  │              │
│  │  └──────────────┘  │    │  │ Expression    │  │              │
│  └────────────────────┘    │  └──────────────┘  │              │
│                            └────────────────────┘              │
│                                                                  │
│  Required APIs:                                                  │
│  - D-ID / HeyGen / Synthesia (Avatar generation)                │
│  - MediaPipe / OpenCV (Video analysis)                          │
│  - WebRTC (Real-time video)                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Video Interview Requirements
1. **Avatar Generation Services**
   - D-ID API (https://www.d-id.com/)
   - HeyGen API (https://www.heygen.com/)
   - Synthesia API (https://www.synthesia.io/)

2. **Video Analysis**
   - Eye contact tracking
   - Facial expression analysis
   - Body language assessment
   - Background/environment check

3. **Technical Requirements**
   - WebRTC for real-time video
   - WebSocket for bidirectional communication
   - Video encoding/decoding
   - Bandwidth optimization

---

## Security Considerations

1. **Data Protection**
   - Encrypt resume files at rest
   - Secure file upload handling
   - HTTPS for all communications
   - Session management

2. **API Security**
   - Rate limiting
   - API key management
   - Input validation
   - CORS configuration

3. **Privacy**
   - Data retention policies
   - User consent management
   - GDPR compliance
   - Data anonymization options

---

## Deployment Options

### Development
```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend
cd frontend && npm run dev
```

### Production
- **Option 1**: Docker Compose (included)
- **Option 2**: Cloud deployment (AWS/GCP/Azure)
- **Option 3**: Vercel (frontend) + Railway (backend)

---

## Getting Started

See `docs/SETUP_GUIDE.md` for detailed setup instructions.
