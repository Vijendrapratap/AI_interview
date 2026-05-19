"""Tests for the pure analyzer response parser.

These exercise the parser without making an LLM call, using fixture files
that mirror the shapes we observe in production.
"""
import json
from pathlib import Path

from app.services.resume.analyzer import _parse_analysis_response

FIX = Path(__file__).parent / "fixtures"


def test_parser_with_ideal_response():
    """LLM returns exactly the schema-shape keys -> every field populates."""
    raw = json.loads((FIX / "analyzer_response_ideal.json").read_text())
    p = _parse_analysis_response(raw)

    assert p["overall_score"] == 87
    assert p["ats_score"] == 80
    assert p["content_score"] == 85
    assert p["format_score"] == 90
    assert p["jd_match_score"] == 72
    assert p["sections"]
    assert "summary" in p["sections"]
    assert p["keywords"]
    assert "languages" in p["keywords"]
    assert p["improvements"]
    assert isinstance(p["improvements"], list)
    assert p["detailed_feedback"]
    assert p["rewrite_examples"]


def test_parser_with_aliased_keys():
    """LLM uses recruiter-shape aliases -> parser still produces every field."""
    raw = json.loads((FIX / "analyzer_response_aliased.json").read_text())
    p = _parse_analysis_response(raw)

    # Scores come via aliases (overall, ats, content, format, jd_match)
    assert p["overall_score"] == 78
    assert p["ats_score"] == 74
    assert p["content_score"] == 80
    assert p["format_score"] == 76
    assert p["jd_match_score"] == 65

    # Sections built from candidate_profile/experience_summary/education/...
    assert p["sections"]
    assert "summary" in p["sections"]
    assert "experience" in p["sections"]
    assert "education" in p["sections"]

    # Keywords pulled from technical_skills
    assert p["keywords"]
    assert "languages" in p["keywords"]
    assert "Python" in p["keywords"]["languages"]

    # Improvements assembled from concerns + verification_needed +
    # gap_analysis.missing_* + red_flags
    assert len(p["improvements"]) >= 3
    joined = " | ".join(str(x) for x in p["improvements"])
    assert "leadership" in joined.lower() or "tenure" in joined.lower()

    # detailed_feedback comes via the `feedback` alias
    assert "data scientist" in p["detailed_feedback"].lower()


def test_parser_strips_markdown_fences():
    """JSON wrapped in ```json fences should still parse and derive ats/content/format."""
    text = (FIX / "analyzer_response_in_fences.txt").read_text()
    p = _parse_analysis_response(text)

    assert p["overall_score"] == 91
    assert p["jd_match_score"] == 88

    # No explicit ats/content/format -> derived from quality/experience
    # quality_score=90 -> ats_score and format_score should be 90
    assert p["ats_score"] == 90
    assert p["format_score"] == 90
    # experience_score=88 -> content_score should be 88
    assert p["content_score"] == 88

    # Sections built from experience_summary/education/technical_skills
    assert "experience" in p["sections"]
    assert "skills" in p["sections"]

    # verdict alias populates detailed_feedback
    assert "staff engineer" in p["detailed_feedback"].lower()


def test_parser_handles_plain_json_string():
    """A string containing raw JSON (no fences) should also parse."""
    raw_str = json.dumps({
        "overall_score": 50,
        "ats_score": 60,
        "content_score": 55,
        "format_score": 65,
        "jd_match_score": 40,
        "detailed_feedback": "Mid-level candidate.",
    })
    p = _parse_analysis_response(raw_str)
    assert p["overall_score"] == 50
    assert p["ats_score"] == 60
    assert p["detailed_feedback"] == "Mid-level candidate."


def test_parser_handles_missing_fields():
    """An empty dict should yield zeros / empties without raising."""
    p = _parse_analysis_response({})
    assert p["overall_score"] == 0.0
    assert p["ats_score"] == 0.0
    assert p["content_score"] == 0.0
    assert p["format_score"] == 0.0
    assert p["jd_match_score"] is None
    assert p["sections"] == {}
    assert p["keywords"] == {}
    assert p["improvements"] == []
    assert p["detailed_feedback"] == ""
    assert p["rewrite_examples"] == []
