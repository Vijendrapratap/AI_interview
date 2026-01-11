from datetime import datetime
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class IdentityService:
    """
    Service for identity verification and document processing.
    Currently mocks OCR capabilities but designed to integrate with AWS Textract/Google DocAI.
    """

    async def verify_document(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract data from an uploaded identity document and verify it.
        
        Real implementation would use AWS Textract or Google Document AI.
        Current implementation returns mock data for testing.
        """
        logger.info(f"Processing identity document: {filename}")
        
        # Mock OCR extraction
        # In verification phase, we will simulate different scenarios based on filename
        
        extracted_data = {
            "document_type": "passport",
            "full_name": "JOHN DOE", # Uppercase common in IDs
            "date_of_birth": "1990-05-15",
            "document_number": "A12345678",
            "expiry_date": "2030-01-01",
            "verification_status": "verified",
            "fraud_indicators": []
        }

        # Simulate fraud scenario if filename contains 'fake'
        if "fake" in filename.lower():
            extracted_data["verification_status"] = "flagged"
            extracted_data["fraud_indicators"].append("Document appears tampered")
            extracted_data["fraud_indicators"].append("Font inconsistencies detected")

        return extracted_data

    async def cross_reference(self, id_data: Dict[str, Any], resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cross reference ID data with resume data to find discrepancies.
        """
        issues = []
        
        # 1. Name Check (Simplistic fuzzy match could be added here)
        id_name = id_data.get("full_name", "").lower()
        # Assuming resume_data has a 'contact_info' -> 'name' or top level 'name'
        resume_name = resume_data.get("candidate_profile", {}).get("name", "").lower()
        
        # 2. Age vs Experience Verification
        dob_str = id_data.get("date_of_birth")
        if dob_str:
            dob = datetime.strptime(dob_str, "%Y-%m-%d")
            age = (datetime.now() - dob).days / 365.25
            
            # Simple heuristic: If experience > age - 18, it's suspicious
            experience_text = resume_data.get("candidate_profile", {}).get("years_experience", "0")
            # Extract number from string like "5 years"
            try:
                import re
                years_exp = float(re.search(r'\d+', str(experience_text)).group())
                
                if years_exp > (age - 16): # Allow working from 16
                    issues.append(f"Suspicious experience duration: {years_exp} years claimed for age {int(age)}")
            except (ValueError, AttributeError):
                pass
                
        return {
            "match_status": "pass" if not issues else "flagged",
            "issues": issues,
            "verified_details": {
                "age_verified": True if dob_str else False,
                "identity_match": True # Mocked
            }
        }

identity_service = IdentityService()
