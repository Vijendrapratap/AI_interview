from app.services.analysis_persistence import build_analysis_row

def test_build_analysis_row_maps_score_fields():
    analyzer_output = {
        "overall_score": 88.5, "ats_score": 91.0,
        "breakdown": {"skills": 90}, "red_flags": [],
        "skills_found": ["python"], "skills_missing": ["kafka"],
        "recommendation": "Strong fit",
    }
    row = build_analysis_row(
        analyzer_output, organization_id="org-1", resume_id="r-1", job_id="j-1"
    )
    assert row["organization_id"] == "org-1"
    assert row["resume_id"] == "r-1"
    assert row["overall_score"] == 88.5
    assert row["skills_found"] == ["python"]
