from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional
from app.services.identity import identity_service
from app.api.v1.endpoints.resume import resume_storage
from app.services.resume.analyzer import ResumeAnalyzer

router = APIRouter()

@router.post("/verify-identity")
async def verify_identity(
    file: UploadFile = File(...),
    resume_id: str = Form(...)
):
    """
    Upload an ID document and verify it against basic checks and the provided resume.
    """
    if resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found. Please upload resume first.")
        
    resume_data = resume_storage[resume_id]
    
    # 1. Verify the Document (OCR)
    content = await file.read()
    id_data = await identity_service.verify_document(content, file.filename)
    
    # 2. Cross Reference with Resume
    # We need the analyzed resume data to compare experience dates
    # If not analyzed, we might need to trigger a quick extraction or just use raw text? 
    # Ideally reuse existing analysis if available.
    
    cross_reference_results = {}
    if "analysis_id" in resume_data:
        # Fetch analysis result if available... 
        # For now, let's just pass the raw text or the stored analysis result if we can get it.
        # This part requires access to analysis_storage which is in endpoints/analysis.py
        # Ideally storage should be a service or db.
        # For simplicity in this non-DB mock, we'll skip deep cross-ref if analysis is missing.
        pass
        
    # Trigger Gap Analysis as part of "Verification"
    analyzer = ResumeAnalyzer()
    gap_analysis = await analyzer.analyze_gaps(resume_data["text_content"])
    
    # Combine results
    verification_result = {
        "identity_verification": id_data,
        "gap_analysis": gap_analysis,
        "overall_status": "verified" if id_data.get("verification_status") == "verified" and not gap_analysis.get("discrepancy_flag") else "flagged"
    }
    
    return verification_result
