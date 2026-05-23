"""Pure mapping from analyzer output to a resume_analyses row (kept pure for testing)."""


def build_analysis_row(analyzer_output: dict, *, organization_id: str,
                        resume_id: str, job_id: str | None) -> dict:
    return {
        "organization_id": organization_id,
        "resume_id": resume_id,
        "job_id": job_id,
        "overall_score": analyzer_output.get("overall_score"),
        "ats_score": analyzer_output.get("ats_score"),
        "breakdown": analyzer_output.get("breakdown", {}),
        "red_flags": analyzer_output.get("red_flags", []),
        "skills_found": analyzer_output.get("skills_found", []),
        "skills_missing": analyzer_output.get("skills_missing", []),
    }
