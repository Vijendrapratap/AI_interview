"""
Experience Extractor Service
- Extract structured experience data from resume text
- Uses regex patterns for common date/company/title formats
- Falls back to LLM for complex/ambiguous cases
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
import re
import logging

from app.services.llm import LLMService
from app.core.config import model_config
from app.services.analytics.industry_classifier import IndustryClassifier

logger = logging.getLogger(__name__)


@dataclass
class ExperienceEntry:
    """Structured representation of a work experience entry."""
    company: str
    title: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]  # None = Present
    duration_months: int
    location: Optional[str] = None
    industry: Optional[str] = None
    responsibilities: List[str] = field(default_factory=list)
    is_current: bool = False

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return {
            "company": self.company,
            "title": self.title,
            "start_date": self.start_date.strftime("%Y-%m") if self.start_date else None,
            "end_date": self.end_date.strftime("%Y-%m") if self.end_date else None,
            "duration_months": self.duration_months,
            "location": self.location,
            "industry": self.industry,
            "responsibilities": self.responsibilities,
            "is_current": self.is_current
        }


class ExperienceExtractor:
    """
    Extract structured experience data from resume text.
    Uses regex patterns for common formats with LLM fallback.
    """

    # Common month patterns
    MONTH_NAMES = {
        "jan": 1, "january": 1,
        "feb": 2, "february": 2,
        "mar": 3, "march": 3,
        "apr": 4, "april": 4,
        "may": 5,
        "jun": 6, "june": 6,
        "jul": 7, "july": 7,
        "aug": 8, "august": 8,
        "sep": 9, "sept": 9, "september": 9,
        "oct": 10, "october": 10,
        "nov": 11, "november": 11,
        "dec": 12, "december": 12
    }

    # Date patterns for extraction
    DATE_PATTERNS = [
        # "Jan 2020 - Present" or "January 2020 - Dec 2021"
        r"(?P<start_month>(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\s*[,.]?\s*(?P<start_year>\d{4})\s*[-–—to]+\s*(?:(?P<end_month>(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\s*[,.]?\s*(?P<end_year>\d{4})|(?P<present>present|current|now|ongoing))",
        # "2020-01 - 2021-12" or "2020/01 - Present"
        r"(?P<start_year>\d{4})[-/](?P<start_month>\d{1,2})\s*[-–—to]+\s*(?:(?P<end_year>\d{4})[-/](?P<end_month>\d{1,2})|(?P<present>present|current|now|ongoing))",
        # "01/2020 - 12/2021" or "01-2020 - Present"
        r"(?P<start_month>\d{1,2})[-/](?P<start_year>\d{4})\s*[-–—to]+\s*(?:(?P<end_month>\d{1,2})[-/](?P<end_year>\d{4})|(?P<present>present|current|now|ongoing))",
        # "2020 - 2021" or "2020 - Present" (year only)
        r"(?P<start_year>\d{4})\s*[-–—to]+\s*(?:(?P<end_year>\d{4})|(?P<present>present|current|now|ongoing))",
        # "(3 years)" or "(2 years 6 months)" - duration instead of dates
        r"\((?P<years>\d+)\s*(?:years?|yrs?)(?:\s*(?:and\s*)?(?P<months>\d+)\s*(?:months?|mos?))?\)",
    ]

    # Job entry patterns - to split experience section into individual jobs
    JOB_ENTRY_PATTERNS = [
        # Company name followed by job title on next line
        r"\n(?=[A-Z][A-Za-z\s&,\.']+(?:\s*\|\s*|\s+-\s+|\s*,\s*)(?:Senior|Junior|Lead|Staff|Principal|Manager|Director|VP|Head|Chief|Engineer|Developer|Analyst|Designer|Specialist|Consultant|Coordinator|Associate|Intern))",
        # Date range at start of line followed by company/title
        r"(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[-–—])",
        # Bullet with company name
        r"(?=\n\s*[•\-\*]\s*[A-Z][A-Za-z\s&,\.]+\s*[-–|])",
    ]

    def __init__(self, use_llm_fallback: bool = True):
        """
        Initialize extractor.

        Args:
            use_llm_fallback: Whether to use LLM for complex cases
        """
        self.use_llm_fallback = use_llm_fallback
        self.industry_classifier = IndustryClassifier()
        self._llm = None

    @property
    def llm(self) -> LLMService:
        """Lazy load LLM service."""
        if self._llm is None:
            self._llm = LLMService(task="experience_extraction")
        return self._llm

    async def extract(self, text: str) -> List[ExperienceEntry]:
        """
        Extract structured experience entries from resume text.

        Args:
            text: Raw resume text

        Returns:
            List of ExperienceEntry objects
        """
        # First, try to extract the experience section
        experience_text = self._extract_experience_section(text)

        # Try regex-based extraction first
        entries = self._extract_with_regex(experience_text)

        # If regex extraction yields poor results, try LLM
        if self.use_llm_fallback and len(entries) < 2:
            try:
                llm_entries = await self._extract_via_llm(experience_text)
                if len(llm_entries) > len(entries):
                    entries = llm_entries
            except Exception as e:
                logger.warning(f"LLM extraction failed, using regex results: {e}")

        # Enhance entries with industry classification
        for entry in entries:
            if not entry.industry:
                entry.industry = self.industry_classifier.classify(
                    entry.company,
                    entry.title,
                    " ".join(entry.responsibilities)
                )
                entry.industry = self.industry_classifier.format_industry_name(entry.industry)

        return entries

    def _extract_experience_section(self, text: str) -> str:
        """Extract the work experience section from full resume text."""
        # Look for experience section headers
        experience_patterns = [
            r"(?i)(?:work\s+)?experience\s*\n",
            r"(?i)employment\s+history\s*\n",
            r"(?i)professional\s+experience\s*\n",
            r"(?i)career\s+history\s*\n",
            r"(?i)work\s+history\s*\n",
        ]

        # Find where experience section starts
        start_idx = 0
        for pattern in experience_patterns:
            match = re.search(pattern, text)
            if match:
                start_idx = match.end()
                break

        # Find where next section starts (education, skills, etc.)
        end_patterns = [
            r"(?i)\n(?:education|skills|technical\s+skills|certifications|projects|awards|languages|interests)\s*\n",
        ]

        end_idx = len(text)
        for pattern in end_patterns:
            match = re.search(pattern, text[start_idx:])
            if match:
                end_idx = start_idx + match.start()
                break

        experience_text = text[start_idx:end_idx].strip()

        # If no section found, return full text
        return experience_text if experience_text else text

    def _extract_with_regex(self, text: str) -> List[ExperienceEntry]:
        """Extract experience entries using regex patterns."""
        entries = []

        # Split into potential job entries
        job_blocks = self._split_into_job_blocks(text)

        for block in job_blocks:
            if len(block.strip()) < 20:  # Skip very short blocks
                continue

            entry = self._parse_job_block(block)
            if entry and entry.company:
                entries.append(entry)

        return entries

    def _split_into_job_blocks(self, text: str) -> List[str]:
        """Split experience text into individual job blocks."""
        # Try to split on common separators
        blocks = []

        # First, try to find date ranges and split on them
        date_pattern = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|Present|Current|Now)"

        # Find all date ranges
        matches = list(re.finditer(date_pattern, text, re.IGNORECASE))

        if matches:
            # Split based on date positions
            for i, match in enumerate(matches):
                # Get text from before this date to before the next date (or end)
                start = 0 if i == 0 else matches[i - 1].end()
                end = match.end()

                # Look for natural break before next entry
                remaining = text[end:]
                next_break = len(remaining)

                # Check for next date or section header
                next_date = re.search(date_pattern, remaining, re.IGNORECASE)
                if next_date:
                    # Find company/title line before the date
                    lines_before = remaining[:next_date.start()].split('\n')
                    for j, line in enumerate(reversed(lines_before)):
                        if line.strip() and len(line.strip()) > 5:
                            # This is likely the company line
                            next_break = next_date.start() - len('\n'.join(lines_before[-j - 1:]))
                            break
                    else:
                        next_break = next_date.start()

                if i < len(matches) - 1:
                    block = text[start:end + next_break]
                else:
                    block = text[start:]

                blocks.append(block.strip())
        else:
            # Fallback: split by double newlines
            blocks = re.split(r'\n\s*\n', text)

        return [b for b in blocks if b.strip()]

    def _parse_job_block(self, block: str) -> Optional[ExperienceEntry]:
        """Parse a single job block into an ExperienceEntry."""
        lines = [l.strip() for l in block.split('\n') if l.strip()]

        if not lines:
            return None

        # Extract date range
        start_date, end_date, is_current = self._extract_dates(block)

        # Calculate duration
        duration_months = self._calculate_duration(start_date, end_date)

        # Extract company and title (usually in first 2-3 lines)
        company = ""
        title = ""
        location = None

        # Try to find company | title pattern
        for line in lines[:3]:
            # Pattern: "Company | Title" or "Company - Title"
            match = re.match(r'^([^|–\-]+)(?:\s*[|–\-]\s*)(.+?)(?:\s*[|–\-]\s*(.+))?$', line)
            if match:
                part1, part2, part3 = match.groups()
                # Determine which is company and which is title
                if self._is_likely_title(part2):
                    company = part1.strip()
                    title = part2.strip()
                    if part3:
                        location = part3.strip()
                else:
                    company = part1.strip()
                    title = part2.strip()
                break

            # Check if line looks like a company name
            if not company and self._is_likely_company(line):
                company = line.strip()
            # Check if line looks like a title
            elif company and not title and self._is_likely_title(line):
                title = line.strip()

        # If still no company/title, use first non-date line
        if not company:
            for line in lines:
                if not re.search(r'\d{4}', line):
                    company = line[:50]  # Limit length
                    break

        # Extract responsibilities (bullet points)
        responsibilities = []
        for line in lines:
            if re.match(r'^[•\-\*]\s+', line):
                resp = re.sub(r'^[•\-\*]\s+', '', line)
                responsibilities.append(resp)
            elif re.match(r'^[a-z]', line) and len(line) > 30:
                # Lower case starting line that's long enough might be a responsibility
                responsibilities.append(line)

        return ExperienceEntry(
            company=company,
            title=title,
            start_date=start_date,
            end_date=end_date,
            duration_months=duration_months,
            location=location,
            industry=None,  # Will be set later
            responsibilities=responsibilities,
            is_current=is_current
        )

    def _extract_dates(self, text: str) -> Tuple[Optional[datetime], Optional[datetime], bool]:
        """Extract start and end dates from text."""
        for pattern in self.DATE_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groupdict()

                # Check for "present"
                is_current = bool(groups.get("present"))

                # Parse start date
                start_year = groups.get("start_year")
                start_month = groups.get("start_month")

                if start_year:
                    start_year = int(start_year)
                    if start_month:
                        if start_month.isdigit():
                            start_month = int(start_month)
                        else:
                            start_month = self.MONTH_NAMES.get(start_month.lower()[:3], 1)
                    else:
                        start_month = 1

                    try:
                        start_date = datetime(start_year, start_month, 1)
                    except ValueError:
                        start_date = None
                else:
                    start_date = None

                # Parse end date
                if is_current:
                    end_date = None
                else:
                    end_year = groups.get("end_year")
                    end_month = groups.get("end_month")

                    if end_year:
                        end_year = int(end_year)
                        if end_month:
                            if end_month.isdigit():
                                end_month = int(end_month)
                            else:
                                end_month = self.MONTH_NAMES.get(end_month.lower()[:3], 12)
                        else:
                            end_month = 12

                        try:
                            end_date = datetime(end_year, end_month, 1)
                        except ValueError:
                            end_date = None
                    else:
                        end_date = None

                return start_date, end_date, is_current

        return None, None, False

    def _calculate_duration(
        self,
        start_date: Optional[datetime],
        end_date: Optional[datetime]
    ) -> int:
        """Calculate duration in months between dates."""
        if not start_date:
            return 0

        if not end_date:
            end_date = datetime.now()

        # Calculate months difference
        months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
        return max(0, months)

    def _is_likely_company(self, text: str) -> bool:
        """Check if text looks like a company name."""
        company_indicators = [
            r"(?i)\b(inc|llc|ltd|corp|corporation|company|co|group|technologies|solutions|systems|consulting|services)\b",
            r"(?i)\b(google|amazon|microsoft|meta|apple|netflix|uber|facebook|linkedin|twitter)\b",
        ]

        for pattern in company_indicators:
            if re.search(pattern, text):
                return True

        # Check for proper noun pattern (capitalized words)
        if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$', text.strip()):
            return True

        return False

    def _is_likely_title(self, text: str) -> bool:
        """Check if text looks like a job title."""
        title_patterns = [
            r"(?i)\b(engineer|developer|manager|director|analyst|designer|architect|consultant|specialist|coordinator|lead|senior|junior|staff|principal|vp|head|chief)\b",
            r"(?i)\b(software|data|product|project|program|technical|business|marketing|sales|operations|hr|finance)\b",
        ]

        for pattern in title_patterns:
            if re.search(pattern, text):
                return True

        return False

    async def _extract_via_llm(self, text: str) -> List[ExperienceEntry]:
        """Use LLM to extract structured experience data."""
        try:
            prompts = model_config.get_prompt("experience_extraction")
        except FileNotFoundError:
            # Use inline prompt if file doesn't exist
            prompts = self._get_default_prompts()

        prompt = prompts.get("extraction_prompt", "").format(text=text)
        system_prompt = prompts.get("system_prompt", "")

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.1
            )

            entries = []

            # Handle both dict and list responses from LLM
            if isinstance(result, list):
                # LLM returned a bare list of experiences
                experiences = result
            else:
                experiences = result.get("experiences", [])

            for exp in experiences:
                if not isinstance(exp, dict):
                    continue
                start_date = self._parse_date_str(exp.get("start_date"))
                end_date = self._parse_date_str(exp.get("end_date"))
                is_current = exp.get("is_current", False) or exp.get("end_date", "").lower() in ["present", "current", "now"]

                if is_current:
                    end_date = None

                entry = ExperienceEntry(
                    company=exp.get("company", ""),
                    title=exp.get("title", ""),
                    start_date=start_date,
                    end_date=end_date,
                    duration_months=self._calculate_duration(start_date, end_date),
                    location=exp.get("location"),
                    industry=exp.get("industry"),
                    responsibilities=exp.get("responsibilities", []),
                    is_current=is_current
                )
                entries.append(entry)

            return entries

        except Exception as e:
            logger.error(f"LLM extraction error: {e}")
            return []

    def _parse_date_str(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse a date string into datetime."""
        if not date_str or date_str.lower() in ["present", "current", "now", "ongoing"]:
            return None

        formats = [
            "%Y-%m",
            "%Y/%m",
            "%m/%Y",
            "%m-%Y",
            "%B %Y",
            "%b %Y",
            "%Y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue

        # Try to extract year and month from text
        match = re.search(r"(\d{4})[-/]?(\d{1,2})?", date_str)
        if match:
            year = int(match.group(1))
            month = int(match.group(2)) if match.group(2) else 1
            try:
                return datetime(year, month, 1)
            except ValueError:
                pass

        return None

    def _get_default_prompts(self) -> Dict:
        """Return default prompts if config file not found."""
        return {
            "system_prompt": """You are an expert at extracting structured work experience data from resumes.
Extract every job/position mentioned with precise dates, company names, titles, and responsibilities.
Be thorough and accurate. Return valid JSON only.""",
            "extraction_prompt": """Extract all work experiences from the following resume text.

RESUME TEXT:
{text}

For each job/position, extract:
1. company: Company name
2. title: Job title
3. start_date: Start date in YYYY-MM format
4. end_date: End date in YYYY-MM format, or "Present" if current
5. location: Location if mentioned
6. industry: Industry/sector
7. responsibilities: List of key responsibilities/achievements
8. is_current: true if this is the current job

OUTPUT FORMAT (JSON):
{{
  "experiences": [
    {{
      "company": "Tech Corp",
      "title": "Senior Software Engineer",
      "start_date": "2021-03",
      "end_date": "Present",
      "location": "San Francisco, CA",
      "industry": "Technology",
      "responsibilities": [
        "Led team of 5 engineers",
        "Architected microservices platform"
      ],
      "is_current": true
    }}
  ]
}}"""
        }
