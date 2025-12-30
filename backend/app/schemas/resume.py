"""
Resume-related Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List


class ResumeUploadResponse(BaseModel):
    """Response after resume upload"""
    id: str = Field(..., description="Unique resume ID")
    filename: str = Field(..., description="Original filename")
    status: str = Field(..., description="Upload status")
    message: str = Field(..., description="Status message")
    text_preview: Optional[str] = Field(None, description="Preview of extracted text")


class ResumeDetails(BaseModel):
    """Detailed resume information"""
    id: str
    filename: str
    file_path: str
    file_type: str
    text_content: str
    sections: Dict = Field(default_factory=dict)
    status: str
    analysis_id: Optional[str] = None


class ResumeSection(BaseModel):
    """Individual resume section"""
    name: str
    content: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    score: Optional[float] = None


class ParsedResume(BaseModel):
    """Parsed resume structure"""
    raw_text: str
    sections: List[ResumeSection]
    contact_info: Optional[Dict] = None
    word_count: int
    estimated_years_experience: Optional[int] = None
