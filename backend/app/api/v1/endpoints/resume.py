"""
Resume Upload and Management Endpoints
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
import uuid
from pathlib import Path
import logging

from app.core.config import settings
from app.services.resume.parser import ResumeParser
from app.schemas.resume import ResumeUploadResponse, ResumeDetails

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage (replace with database in production)
resume_storage = {}


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload a resume file for analysis.

    Supported formats: PDF, DOCX, DOC, TXT
    Max size: 10MB
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    # Validate file size
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )

    # Generate unique ID and save file
    resume_id = str(uuid.uuid4())
    file_path = settings.UPLOAD_DIR / f"{resume_id}{file_ext}"

    try:
        with open(file_path, "wb") as f:
            f.write(contents)

        # Parse resume
        parser = ResumeParser()
        parsed_content = await parser.parse(file_path)

        # Store resume data
        resume_storage[resume_id] = {
            "id": resume_id,
            "filename": file.filename,
            "file_path": str(file_path),
            "file_type": file_ext,
            "text_content": parsed_content.get("text", ""),
            "sections": parsed_content.get("sections", {}),
            "status": "uploaded"
        }

        logger.info(f"Resume uploaded successfully: {resume_id}")

        return ResumeUploadResponse(
            id=resume_id,
            filename=file.filename,
            status="uploaded",
            message="Resume uploaded successfully. Ready for analysis.",
            text_preview=parsed_content.get("text", "")[:500] + "..." if len(parsed_content.get("text", "")) > 500 else parsed_content.get("text", "")
        )

    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        # Clean up file if it was created
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing resume: {str(e)}"
        )


@router.get("/{resume_id}", response_model=ResumeDetails)
async def get_resume(resume_id: str):
    """Get resume details by ID"""
    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[resume_id]
    return ResumeDetails(**resume_data)


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str):
    """Delete a resume"""
    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[resume_id]

    # Delete file
    file_path = Path(resume_data["file_path"])
    if file_path.exists():
        file_path.unlink()

    # Remove from storage
    del resume_storage[resume_id]

    return {"message": "Resume deleted successfully"}


@router.get("/")
async def list_resumes():
    """List all uploaded resumes"""
    return {
        "resumes": [
            {
                "id": r["id"],
                "filename": r["filename"],
                "status": r["status"]
            }
            for r in resume_storage.values()
        ]
    }
