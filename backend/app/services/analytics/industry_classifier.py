"""
Industry Classifier Service
- Classify companies and roles into industries
- Detect industry transitions in career history
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import re
import logging

logger = logging.getLogger(__name__)


@dataclass
class IndustryTransition:
    """Represents an industry transition in career history."""
    from_industry: str
    to_industry: str
    year: Optional[int]
    from_company: str
    to_company: str


# Industry keywords for classification
INDUSTRY_KEYWORDS: Dict[str, List[str]] = {
    "fintech": [
        "bank", "banking", "payment", "payments", "finance", "financial",
        "trading", "investment", "wealth", "insurance", "lending", "credit",
        "crypto", "blockchain", "defi", "fintech", "capital", "securities",
        "brokerage", "hedge fund", "asset management", "treasury", "mortgage"
    ],
    "healthcare": [
        "health", "medical", "hospital", "pharma", "pharmaceutical", "biotech",
        "biotechnology", "clinical", "patient", "healthcare", "life sciences",
        "genomics", "diagnostics", "therapeutic", "wellness", "telemedicine",
        "healthtech", "medtech", "drug", "vaccine", "oncology"
    ],
    "ecommerce": [
        "retail", "commerce", "ecommerce", "e-commerce", "shopping", "marketplace",
        "store", "merchant", "checkout", "cart", "fulfillment", "logistics",
        "delivery", "supply chain", "inventory", "wholesale", "consumer goods"
    ],
    "saas": [
        "software", "cloud", "platform", "subscription", "saas", "b2b",
        "enterprise software", "crm", "erp", "hris", "collaboration",
        "productivity", "workflow", "automation", "integration"
    ],
    "tech": [
        "technology", "tech", "digital", "internet", "web", "mobile",
        "app", "startup", "innovation", "engineering", "developer",
        "computing", "information technology", "it services"
    ],
    "ai_ml": [
        "artificial intelligence", "machine learning", "ai", "ml", "deep learning",
        "neural network", "nlp", "natural language", "computer vision",
        "data science", "predictive", "analytics", "algorithms"
    ],
    "cybersecurity": [
        "security", "cybersecurity", "infosec", "encryption", "firewall",
        "threat", "vulnerability", "penetration", "compliance", "identity",
        "authentication", "authorization", "zero trust"
    ],
    "gaming": [
        "game", "gaming", "esports", "video game", "mobile game",
        "game development", "game studio", "entertainment", "interactive"
    ],
    "media": [
        "media", "entertainment", "streaming", "content", "publishing",
        "news", "broadcast", "television", "film", "music", "podcast",
        "advertising", "adtech", "marketing", "digital media"
    ],
    "education": [
        "education", "edtech", "learning", "school", "university", "college",
        "training", "course", "curriculum", "student", "teacher", "academic",
        "e-learning", "lms", "tutoring"
    ],
    "real_estate": [
        "real estate", "property", "housing", "proptech", "rental",
        "mortgage", "construction", "building", "development", "realty",
        "commercial property", "residential"
    ],
    "automotive": [
        "automotive", "automobile", "car", "vehicle", "electric vehicle", "ev",
        "autonomous", "self-driving", "mobility", "transportation",
        "fleet", "auto", "motor"
    ],
    "telecom": [
        "telecom", "telecommunications", "network", "wireless", "5g",
        "mobile network", "carrier", "broadband", "fiber", "satellite"
    ],
    "manufacturing": [
        "manufacturing", "industrial", "factory", "production", "assembly",
        "supply chain", "logistics", "warehouse", "robotics", "iot"
    ],
    "energy": [
        "energy", "oil", "gas", "renewable", "solar", "wind", "power",
        "utility", "electric", "grid", "clean energy", "sustainability"
    ],
    "consulting": [
        "consulting", "advisory", "strategy", "management consulting",
        "professional services", "business services", "transformation"
    ],
    "government": [
        "government", "federal", "state", "public sector", "defense",
        "military", "civic", "municipal", "agency"
    ],
    "nonprofit": [
        "nonprofit", "non-profit", "ngo", "charity", "foundation",
        "social impact", "humanitarian"
    ],
    "travel": [
        "travel", "hospitality", "hotel", "airline", "tourism",
        "booking", "vacation", "resort", "transportation"
    ],
    "food": [
        "food", "restaurant", "foodtech", "delivery", "catering",
        "beverage", "grocery", "meal", "kitchen"
    ]
}

# Known company to industry mapping
COMPANY_INDUSTRY_MAP: Dict[str, str] = {
    # Big Tech
    "google": "tech",
    "alphabet": "tech",
    "meta": "tech",
    "facebook": "tech",
    "amazon": "ecommerce",
    "apple": "tech",
    "microsoft": "tech",
    "netflix": "media",
    "uber": "tech",
    "lyft": "tech",
    "airbnb": "travel",
    "twitter": "tech",
    "x corp": "tech",
    "linkedin": "tech",
    "salesforce": "saas",
    "oracle": "tech",
    "ibm": "tech",
    "intel": "tech",
    "nvidia": "tech",
    "amd": "tech",
    "cisco": "tech",
    "adobe": "saas",
    "zoom": "saas",
    "slack": "saas",
    "atlassian": "saas",
    "shopify": "ecommerce",
    "stripe": "fintech",
    "square": "fintech",
    "block": "fintech",
    "paypal": "fintech",
    "robinhood": "fintech",
    "coinbase": "fintech",
    "plaid": "fintech",
    "chime": "fintech",
    "affirm": "fintech",
    "klarna": "fintech",
    # Finance
    "jpmorgan": "fintech",
    "jp morgan": "fintech",
    "goldman sachs": "fintech",
    "morgan stanley": "fintech",
    "bank of america": "fintech",
    "wells fargo": "fintech",
    "citibank": "fintech",
    "citi": "fintech",
    "capital one": "fintech",
    "american express": "fintech",
    "amex": "fintech",
    "visa": "fintech",
    "mastercard": "fintech",
    "blackrock": "fintech",
    "fidelity": "fintech",
    "vanguard": "fintech",
    "charles schwab": "fintech",
    # Healthcare
    "pfizer": "healthcare",
    "johnson & johnson": "healthcare",
    "j&j": "healthcare",
    "unitedhealth": "healthcare",
    "cvs health": "healthcare",
    "anthem": "healthcare",
    "cigna": "healthcare",
    "humana": "healthcare",
    "abbott": "healthcare",
    "merck": "healthcare",
    "moderna": "healthcare",
    "biontech": "healthcare",
    # Consulting
    "mckinsey": "consulting",
    "boston consulting": "consulting",
    "bcg": "consulting",
    "bain": "consulting",
    "deloitte": "consulting",
    "accenture": "consulting",
    "kpmg": "consulting",
    "ey": "consulting",
    "ernst & young": "consulting",
    "pwc": "consulting",
    # Other
    "tesla": "automotive",
    "spacex": "tech",
    "openai": "ai_ml",
    "anthropic": "ai_ml",
    "deepmind": "ai_ml",
    "databricks": "ai_ml",
    "palantir": "ai_ml",
    "snowflake": "saas",
    "datadog": "saas",
    "crowdstrike": "cybersecurity",
    "palo alto networks": "cybersecurity",
    "okta": "cybersecurity",
    "doordash": "food",
    "instacart": "ecommerce",
    "walmart": "ecommerce",
    "target": "ecommerce",
    "costco": "ecommerce",
    "disney": "media",
    "warner bros": "media",
    "spotify": "media",
    "tiktok": "media",
    "bytedance": "tech",
}

# Seniority keywords for title analysis
SENIORITY_KEYWORDS = {
    "executive": ["ceo", "cto", "cfo", "coo", "cio", "chief", "president", "vp", "vice president", "evp", "svp"],
    "director": ["director", "head of", "head", "general manager"],
    "staff_principal": ["staff", "principal", "distinguished", "fellow", "architect"],
    "senior": ["senior", "sr.", "sr ", "lead", "tech lead", "team lead"],
    "mid": ["engineer", "developer", "analyst", "specialist", "associate"],
    "junior": ["junior", "jr.", "jr ", "entry", "intern", "graduate", "trainee", "apprentice"]
}


class IndustryClassifier:
    """
    Classify companies and roles into industries.
    Detect industry transitions in career history.
    """

    def __init__(self):
        self.industry_keywords = INDUSTRY_KEYWORDS
        self.company_map = COMPANY_INDUSTRY_MAP
        self.seniority_keywords = SENIORITY_KEYWORDS

    def classify(
        self,
        company: str,
        title: str = "",
        responsibilities: str = ""
    ) -> str:
        """
        Classify a company/role into an industry.

        Args:
            company: Company name
            title: Job title
            responsibilities: Job responsibilities text

        Returns:
            Industry classification string
        """
        # First, check known companies
        company_lower = company.lower().strip()

        # Direct lookup
        for known_company, industry in self.company_map.items():
            if known_company in company_lower or company_lower in known_company:
                return industry

        # Combine all text for keyword analysis
        combined_text = f"{company} {title} {responsibilities}".lower()

        # Score each industry based on keyword matches
        industry_scores: Dict[str, int] = {}

        for industry, keywords in self.industry_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in combined_text:
                    # Weight company name matches higher
                    if keyword in company_lower:
                        score += 3
                    # Title matches
                    elif keyword in title.lower():
                        score += 2
                    # Responsibilities matches
                    else:
                        score += 1

            if score > 0:
                industry_scores[industry] = score

        if industry_scores:
            # Return the industry with the highest score
            return max(industry_scores, key=industry_scores.get)

        # Default to "tech" for software-related roles
        tech_indicators = [
            "software", "developer", "engineer", "programmer", "coding",
            "development", "devops", "backend", "frontend", "fullstack",
            "full-stack", "web", "mobile", "data"
        ]
        if any(indicator in combined_text for indicator in tech_indicators):
            return "tech"

        return "other"

    def detect_transitions(
        self,
        experiences: List[Dict]
    ) -> List[IndustryTransition]:
        """
        Detect industry transitions from experience history.

        Args:
            experiences: List of experience entries with company, title, etc.

        Returns:
            List of industry transitions
        """
        transitions: List[IndustryTransition] = []

        if len(experiences) < 2:
            return transitions

        # Sort by start date (most recent first)
        sorted_exp = sorted(
            experiences,
            key=lambda x: x.get("start_date") or "",
            reverse=True
        )

        previous_industry = None
        previous_company = None

        for i, exp in enumerate(sorted_exp):
            company = exp.get("company", "")
            title = exp.get("title", "")
            responsibilities = " ".join(exp.get("responsibilities", []))

            current_industry = self.classify(company, title, responsibilities)

            if previous_industry and current_industry != previous_industry:
                # Extract year from start_date
                year = None
                start_date = exp.get("start_date", "")
                if start_date:
                    year_match = re.search(r"(\d{4})", str(start_date))
                    if year_match:
                        year = int(year_match.group(1))

                transitions.append(IndustryTransition(
                    from_industry=current_industry,  # Earlier role
                    to_industry=previous_industry,   # Later role (career progression)
                    year=year,
                    from_company=company,
                    to_company=previous_company or ""
                ))

            previous_industry = current_industry
            previous_company = company

        return transitions

    def get_primary_industry(
        self,
        experiences: List[Dict]
    ) -> Tuple[str, float]:
        """
        Determine the primary industry from career history.

        Args:
            experiences: List of experience entries

        Returns:
            Tuple of (primary_industry, percentage_of_career)
        """
        if not experiences:
            return ("unknown", 0.0)

        industry_durations: Dict[str, float] = {}
        total_months = 0

        for exp in experiences:
            company = exp.get("company", "")
            title = exp.get("title", "")
            responsibilities = " ".join(exp.get("responsibilities", []))
            duration_months = exp.get("duration_months", 12)  # Default to 1 year

            industry = self.classify(company, title, responsibilities)

            industry_durations[industry] = industry_durations.get(industry, 0) + duration_months
            total_months += duration_months

        if not industry_durations or total_months == 0:
            return ("unknown", 0.0)

        primary = max(industry_durations, key=industry_durations.get)
        percentage = (industry_durations[primary] / total_months) * 100

        return (primary, round(percentage, 1))

    def get_all_industries(
        self,
        experiences: List[Dict]
    ) -> List[str]:
        """
        Get all industries worked in.

        Args:
            experiences: List of experience entries

        Returns:
            List of unique industries
        """
        industries = set()

        for exp in experiences:
            company = exp.get("company", "")
            title = exp.get("title", "")
            responsibilities = " ".join(exp.get("responsibilities", []))

            industry = self.classify(company, title, responsibilities)
            industries.add(industry)

        return list(industries)

    def classify_seniority(self, title: str) -> str:
        """
        Classify job title seniority level.

        Args:
            title: Job title

        Returns:
            Seniority level: "executive", "director", "staff_principal", "senior", "mid", "junior"
        """
        title_lower = title.lower()

        # Check in order of seniority (highest first)
        for level in ["executive", "director", "staff_principal", "senior", "mid", "junior"]:
            for keyword in self.seniority_keywords[level]:
                if keyword in title_lower:
                    return level

        # Default to mid-level
        return "mid"

    def is_industry_hopper(
        self,
        experiences: List[Dict],
        threshold: int = 3
    ) -> bool:
        """
        Determine if candidate is an industry hopper.

        Args:
            experiences: List of experience entries
            threshold: Number of unique industries to be considered a hopper

        Returns:
            True if worked in >= threshold industries
        """
        industries = self.get_all_industries(experiences)
        return len(industries) >= threshold

    def format_industry_name(self, industry_code: str) -> str:
        """
        Format industry code to display name.

        Args:
            industry_code: Internal industry code (e.g., "ai_ml")

        Returns:
            Formatted display name (e.g., "AI/ML")
        """
        display_names = {
            "fintech": "Fintech",
            "healthcare": "Healthcare",
            "ecommerce": "E-commerce",
            "saas": "SaaS",
            "tech": "Technology",
            "ai_ml": "AI/ML",
            "cybersecurity": "Cybersecurity",
            "gaming": "Gaming",
            "media": "Media & Entertainment",
            "education": "Education",
            "real_estate": "Real Estate",
            "automotive": "Automotive",
            "telecom": "Telecommunications",
            "manufacturing": "Manufacturing",
            "energy": "Energy",
            "consulting": "Consulting",
            "government": "Government",
            "nonprofit": "Nonprofit",
            "travel": "Travel & Hospitality",
            "food": "Food & Beverage",
            "other": "Other"
        }

        return display_names.get(industry_code, industry_code.replace("_", " ").title())
