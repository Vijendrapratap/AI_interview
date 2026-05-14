export type PipelineStage = "Received" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";
export type RiskLevel = "Low" | "Medium" | "High";
export type SLAStatus = "Healthy" | "Watch" | "At Risk";

export type ATSJob = {
    id: string;
    requisition_id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    salary_range: string;
    posted_at: string;
    status: string;
    priority: "High" | "Medium" | "Low";
    hiring_manager: string;
    owner: string;
    days_open: number;
    sla_status: SLAStatus;
    pipeline_health: number;
    applicants_count: number;
    stages: Record<string, number>;
    required_skills: string[];
    next_action: string;
    description: string;
};

export type ATSCandidate = {
    id: string;
    job_id: string;
    name: string;
    email: string;
    role_applied: string;
    applied_at: string;
    status: PipelineStage;
    score: number;
    avatar: string;
    recommendation: string;
    source: string;
    owner: string;
    last_activity: string;
    next_action: string;
    risk_level: RiskLevel;
    compliance_status: "Clear" | "Needs Review" | "Pending";
    stage_age_days: number;
    interview_status: "Not Invited" | "Invited" | "Completed" | "Needs Review";
    screening_summary: string;
    resume_analysis: {
        quality_score: number;
        ats_score: number;
        match_percentage: number;
        experience_score: number;
        education_score: number;
        technical_score: number;
        soft_skills_score: number;
        skills_found: string[];
        skills_missing: string[];
        red_flags: string[];
    };
    interview: null | {
        overall_score: number;
        strengths: string[];
        weaknesses: string[];
        transcript_snippet: string;
    };
    analytics?: {
        gap_analysis?: { has_gaps: boolean; gaps: Array<{ start: string; end: string; duration_months: number; between: string }>; flags: string[] };
        job_stability?: { job_hopping_risk: boolean; short_tenures: Array<{ company: string; duration_months: number }>; average_tenure_years: number; flags: string[] };
        leadership_signals?: string[];
    };
    verification: {
        status: string;
        docs: string[];
        id_data: null | {
            dob: string;
            age_verified: number;
            nationality: string;
            id_type: string;
            ethnicity_check: string;
            face_match: number;
        };
    };
};

export const mockJobs: ATSJob[] = [
    {
        id: "job_1",
        requisition_id: "REQ-ENG-1042",
        title: "Senior Backend Engineer",
        department: "Engineering",
        location: "Remote / SF",
        type: "Full-time",
        salary_range: "$140k - $180k",
        posted_at: "2026-01-15",
        status: "Active",
        priority: "High",
        hiring_manager: "Nina Patel",
        owner: "David Recruiter",
        days_open: 31,
        sla_status: "At Risk",
        pipeline_health: 72,
        applicants_count: 42,
        stages: { received: 20, screening: 15, interview: 6, offer: 1 },
        required_skills: ["Python", "FastAPI", "PostgreSQL", "AWS", "System Design"],
        next_action: "Review 4 high-fit profiles before standup",
        description: "We are looking for a Senior Backend Engineer to lead our API development..."
    },
    {
        id: "job_2",
        requisition_id: "REQ-DES-2031",
        title: "Product Designer",
        department: "Design",
        location: "New York, NY",
        type: "Full-time",
        salary_range: "$110k - $150k",
        posted_at: "2026-01-18",
        status: "Active",
        priority: "Medium",
        hiring_manager: "Maya Chen",
        owner: "David Recruiter",
        days_open: 24,
        sla_status: "Watch",
        pipeline_health: 81,
        applicants_count: 28,
        stages: { received: 12, screening: 8, interview: 5, offer: 3 },
        required_skills: ["Figma", "React", "Prototyping", "UI/UX", "User Research"],
        next_action: "Collect final scorecards for 2 candidates",
        description: "Join our design team to craft beautiful user experiences..."
    },
    {
        id: "job_6",
        requisition_id: "REQ-DATA-1180",
        title: "Lead Data Scientist",
        department: "Data",
        location: "Seattle, WA",
        type: "Full-time",
        salary_range: "$150k - $200k",
        posted_at: "2026-01-12",
        status: "Active",
        priority: "High",
        hiring_manager: "Owen Brooks",
        owner: "Priya Shah",
        days_open: 35,
        sla_status: "At Risk",
        pipeline_health: 66,
        applicants_count: 18,
        stages: { received: 8, screening: 5, interview: 4, offer: 1 },
        required_skills: ["Python", "TensorFlow", "SQL", "Machine Learning", "AWS"],
        next_action: "Send AI interview invite to top candidate",
        description: "Drive our AI initiatives..."
    },
    {
        id: "job_7",
        requisition_id: "REQ-OPS-1414",
        title: "DevOps Engineer",
        department: "Engineering",
        location: "Austin, TX",
        type: "Full-time",
        salary_range: "$130k - $160k",
        posted_at: "2026-01-14",
        status: "Active",
        priority: "Medium",
        hiring_manager: "Liam Carter",
        owner: "David Recruiter",
        days_open: 29,
        sla_status: "Healthy",
        pipeline_health: 88,
        applicants_count: 10,
        stages: { received: 5, screening: 2, interview: 2, offer: 1 },
        required_skills: ["AWS", "Terraform", "Kubernetes", "CICD", "Python"],
        next_action: "Prepare offer packet",
        description: "Manage our cloud infrastructure..."
    },
    {
        id: "job_8",
        requisition_id: "REQ-PEO-0907",
        title: "HR Manager",
        department: "People",
        location: "Chicago, IL",
        type: "Full-time",
        salary_range: "$90k - $120k",
        posted_at: "2026-01-10",
        status: "Active",
        priority: "Low",
        hiring_manager: "Sophia Lewis",
        owner: "Priya Shah",
        days_open: 38,
        sla_status: "Watch",
        pipeline_health: 74,
        applicants_count: 25,
        stages: { received: 15, screening: 8, interview: 2, offer: 0 },
        required_skills: ["Recruiting", "BambooHR", "Employee Relations", "Communication"],
        next_action: "Bulk reject low-match applicants with template",
        description: "Lead our talent acquisition..."
    }
];

export const mockCandidates: ATSCandidate[] = [
    {
        id: "cand_1",
        job_id: "job_1",
        name: "Arjun Singh",
        email: "arjun@example.com",
        role_applied: "Senior Backend Engineer",
        applied_at: "2026-01-20",
        status: "Interview",
        score: 82,
        avatar: "AS",
        recommendation: "Strong Hire",
        source: "Referral",
        owner: "David Recruiter",
        last_activity: "AI interview completed 2h ago",
        next_action: "Review interview scorecard",
        risk_level: "Low",
        compliance_status: "Clear",
        stage_age_days: 2,
        interview_status: "Needs Review",
        screening_summary: "Strong backend profile with AWS/FastAPI depth. Missing only explicit system design examples.",
        resume_analysis: {
            quality_score: 85,
            ats_score: 90,
            match_percentage: 88,
            experience_score: 85,
            education_score: 80,
            technical_score: 92,
            soft_skills_score: 85,
            skills_found: ["Python", "AWS", "Docker", "FastAPI", "PostgreSQL"],
            skills_missing: ["System Design"],
            red_flags: []
        },
        interview: {
            overall_score: 79,
            strengths: ["System Design", "Communication"],
            weaknesses: ["GraphQL depth"],
            transcript_snippet: "I designed the payment gateway microservice..."
        },
        analytics: {
            gap_analysis: { has_gaps: false, gaps: [], flags: [] },
            job_stability: { job_hopping_risk: false, short_tenures: [], average_tenure_years: 3.5, flags: [] },
            leadership_signals: ["Mentored junior engineers", "Led a team"]
        },
        verification: { status: "Verified", docs: ["Passport", "Degree"], id_data: { dob: "1994-05-12", age_verified: 31, nationality: "Indian", id_type: "Passport", ethnicity_check: "Match", face_match: 99.8 } }
    },
    {
        id: "cand_51",
        job_id: "job_6",
        name: "Alice Wang",
        email: "alice.wang@email.com",
        role_applied: "Lead Data Scientist",
        applied_at: "2026-01-21",
        status: "Screening",
        score: 94,
        avatar: "AW",
        recommendation: "Strong Hire",
        source: "Inbound Application",
        owner: "Priya Shah",
        last_activity: "Resume screened today",
        next_action: "Send AI technical interview",
        risk_level: "Low",
        compliance_status: "Pending",
        stage_age_days: 1,
        interview_status: "Not Invited",
        screening_summary: "Excellent model-building and SQL background with strong match to all must-have skills.",
        resume_analysis: {
            quality_score: 96,
            ats_score: 92,
            match_percentage: 95,
            experience_score: 94,
            education_score: 98,
            technical_score: 96,
            soft_skills_score: 88,
            skills_found: ["Python", "TensorFlow", "SQL", "XGBoost", "AWS"],
            skills_missing: [],
            red_flags: []
        },
        interview: null,
        verification: { status: "Pending", docs: [], id_data: null }
    },
    {
        id: "cand_52",
        job_id: "job_7",
        name: "Robert Garcia",
        email: "robert.garcia@email.com",
        role_applied: "DevOps Engineer",
        applied_at: "2026-01-21",
        status: "Interview",
        score: 88,
        avatar: "RG",
        recommendation: "Hire",
        source: "LinkedIn Sourcing",
        owner: "David Recruiter",
        last_activity: "Hiring manager feedback received yesterday",
        next_action: "Draft offer recommendation",
        risk_level: "Low",
        compliance_status: "Clear",
        stage_age_days: 3,
        interview_status: "Completed",
        screening_summary: "Strong IaC and cloud security experience. Python scripting gap can be covered in follow-up.",
        resume_analysis: {
            quality_score: 85,
            ats_score: 88,
            match_percentage: 90,
            experience_score: 92,
            education_score: 75,
            technical_score: 90,
            soft_skills_score: 80,
            skills_found: ["AWS", "Terraform", "Jenkins", "Kubernetes"],
            skills_missing: ["Python (Scripting)"],
            red_flags: []
        },
        interview: {
            overall_score: 85,
            strengths: ["Infrastructure as Code", "AWS Security"],
            weaknesses: [],
            transcript_snippet: "I migrated our entire stack to EKS using Terraform..."
        },
        verification: { status: "Verified", docs: ["Passport"], id_data: { dob: "1990-08-15", age_verified: 35, nationality: "American", id_type: "Passport", ethnicity_check: "Match", face_match: 99.1 } }
    },
    {
        id: "cand_53",
        job_id: "job_8",
        name: "Jennifer Lopez",
        email: "jen.lopez@email.com",
        role_applied: "HR Manager",
        applied_at: "2026-01-20",
        status: "Received",
        score: 75,
        avatar: "JL",
        recommendation: "Review",
        source: "Indeed",
        owner: "Priya Shah",
        last_activity: "Application received 3d ago",
        next_action: "Review resume and decide screen",
        risk_level: "Medium",
        compliance_status: "Needs Review",
        stage_age_days: 4,
        interview_status: "Not Invited",
        screening_summary: "Good people-ops fit but needs validation on HRIS depth and global HR experience.",
        resume_analysis: {
            quality_score: 78,
            ats_score: 70,
            match_percentage: 75,
            experience_score: 80,
            education_score: 85,
            technical_score: 70,
            soft_skills_score: 90,
            skills_found: ["Recruiting", "BambooHR", "Employee Relations"],
            skills_missing: ["Workday", "Global HR"],
            red_flags: []
        },
        interview: null,
        verification: { status: "Pending", docs: [], id_data: null }
    },
    {
        id: "cand_54",
        job_id: "job_1",
        name: "Michael Scott",
        email: "m.scott@email.com",
        role_applied: "Sales Representative",
        applied_at: "2026-01-19",
        status: "Rejected",
        score: 55,
        avatar: "MS",
        recommendation: "Reject",
        source: "Agency",
        owner: "David Recruiter",
        last_activity: "Rejected with reason saved",
        next_action: "No action needed",
        risk_level: "High",
        compliance_status: "Clear",
        stage_age_days: 0,
        interview_status: "Not Invited",
        screening_summary: "Role mismatch for backend engineering requisition; strong sales background but lacks required technical stack.",
        resume_analysis: {
            quality_score: 60,
            ats_score: 55,
            match_percentage: 40,
            experience_score: 60,
            education_score: 70,
            technical_score: 20,
            soft_skills_score: 95,
            skills_found: ["Salesforce", "Negotiation"],
            skills_missing: ["Python", "FastAPI", "AWS", "SQL"],
            red_flags: ["Mismatched Role"]
        },
        analytics: {
            gap_analysis: {
                has_gaps: true,
                gaps: [{ start: "2024-01", end: "2024-06", duration_months: 5, between: "Paper Co and Staples" }],
                flags: ["Gap of 5 months detected"]
            },
            job_stability: {
                job_hopping_risk: true,
                short_tenures: [
                    { company: "Paper Co", duration_months: 4 },
                    { company: "Staples", duration_months: 3 }
                ],
                average_tenure_years: 0.8,
                flags: ["Job Hopping Risk: 2 roles < 1 year"]
            },
            leadership_signals: ["Managed team"]
        },
        interview: null,
        verification: { status: "Pending", docs: [], id_data: null }
    }
];

export const mockAnalytics = {
    total_candidates: 355,
    active_jobs: 12,
    offers_sent: 18,
    hires_made: 9,
    avg_time_to_hire: "18 days",
    needs_review: 17,
    sla_risks: 4,
    interviews_pending: 9,
    offers_pending: 3,
    feedback_overdue: 6,
    top_bottleneck: "Recruiter Review",
    pipeline_stats: [
        { name: "Received", value: 155 },
        { name: "Screening", value: 95 },
        { name: "Interview", value: 45 },
        { name: "Offer", value: 18 },
        { name: "Hired", value: 9 }
    ],
    source_performance: [
        { source: "Referral", candidates: 42, quality: 91 },
        { source: "LinkedIn Sourcing", candidates: 88, quality: 84 },
        { source: "Inbound Application", candidates: 151, quality: 72 },
        { source: "Agency", candidates: 31, quality: 61 }
    ]
};


export const atsFeatureMatrix = [
    { category: "Core ATS", importantFeatures: ["Jobs", "Pipelines", "Candidate profiles", "Stage movement", "Bulk actions"], alreadyHave: ["Recruiter dashboard", "Candidate list", "Job list"], status: "Expanded in ReCruItAI workspace" },
    { category: "AI Screening", importantFeatures: ["Resume parsing", "AI match score", "Requirement checklist", "Explainable summary", "Human override"], alreadyHave: ["Resume parser", "ATS score", "AI analysis"], status: "Strong foundation" },
    { category: "AI Interview", importantFeatures: ["Async interview", "Adaptive questions", "Transcript", "Competency scoring", "Scorecard"], alreadyHave: ["AI interviewer", "Transcript/report flow"], status: "Core differentiator" },
    { category: "Collaboration", importantFeatures: ["Hiring team feedback", "Scorecards", "Approvals", "Mentions", "Activity timeline"], alreadyHave: ["Candidate report surfaces"], status: "New workflow module" },
    { category: "Communication", importantFeatures: ["Email templates", "Interview invites", "Status updates", "Bulk rejection", "Reminders"], alreadyHave: ["Interview link copy"], status: "New communication center" },
    { category: "Analytics", importantFeatures: ["Time-to-hire", "Source quality", "Stage bottlenecks", "SLA risk", "Offer conversion"], alreadyHave: ["Basic analytics"], status: "Expanded recruiter metrics" },
    { category: "Enterprise", importantFeatures: ["RBAC", "Audit logs", "Consent", "Retention", "Integrations"], alreadyHave: ["Auth stubs"], status: "Roadmapped architecture" }
];

export const competitorInsights = [
    { player: "Workable", lesson: "Fast setup, AI screening, one-way video interviews, and anonymized screening." },
    { player: "Greenhouse", lesson: "Structured hiring, interview kits, consistent scorecards, and enterprise analytics." },
    { player: "Manatal", lesson: "AI scoring, social enrichment, sourcing CRM, and AI interviewer workflows." },
    { player: "Zoho Recruit", lesson: "Agency-ready candidate/client portals, assessments, and AI matching." },
    { player: "BambooHR", lesson: "ATS-to-HR handoff, offer letters, and employee record continuity." },
    { player: "Pinpoint", lesson: "Branded careers site, candidate surveys, blind recruitment, and internal TA workflows." },
    { player: "Lever / Ashby", lesson: "ATS + CRM + scheduling + analytics in one operating workspace." }
];

export const mockCommunicationTemplates = [
    { id: "tmpl_invite", name: "AI interview invite", channel: "Email", use: "Send role-specific AI interview link", status: "Ready" },
    { id: "tmpl_screen", name: "Recruiter screen request", channel: "Email", use: "Ask candidate for availability", status: "Ready" },
    { id: "tmpl_reject", name: "Respectful rejection", channel: "Email", use: "Bulk rejection with reason logging", status: "Draft" },
    { id: "tmpl_feedback", name: "Feedback reminder", channel: "Slack/Email", use: "Nudge hiring team for overdue scorecard", status: "Ready" }
];

export const mockAutomations = [
    { id: "auto_high_fit", name: "High-fit candidate fast lane", trigger: "AI score above 85", action: "Create recruiter review task and suggest interview invite", risk: "Human approval required" },
    { id: "auto_feedback", name: "Feedback overdue reminder", trigger: "Scorecard pending over 24h", action: "Notify interviewer and recruiter", risk: "Low" },
    { id: "auto_reject", name: "Low-fit bulk rejection draft", trigger: "AI score below 60", action: "Draft rejection email without sending", risk: "Recruiter must approve" },
    { id: "auto_sla", name: "SLA risk alert", trigger: "Candidate stage age over SLA", action: "Flag in command center", risk: "Low" }
];

export const mockCollaborationQueue = [
    { id: "fb_1", candidate: "Arjun Singh", role: "Senior Backend Engineer", reviewer: "Nina Patel", status: "Overdue", due: "Yesterday", action: "Send reminder" },
    { id: "fb_2", candidate: "Robert Garcia", role: "DevOps Engineer", reviewer: "Liam Carter", status: "Submitted", due: "Today", action: "Review scorecard" },
    { id: "fb_3", candidate: "Alice Wang", role: "Lead Data Scientist", reviewer: "Owen Brooks", status: "Pending", due: "Tomorrow", action: "Wait" }
];

export const mockSourcingChannels = [
    { source: "Referral", volume: 42, quality: 91, cost: "$0", recommendation: "Increase referral campaign for engineering roles" },
    { source: "LinkedIn Sourcing", volume: 88, quality: 84, cost: "$1,900", recommendation: "Best for senior technical roles" },
    { source: "Inbound Application", volume: 151, quality: 72, cost: "$450", recommendation: "Add knockout questions to reduce review load" },
    { source: "Agency", volume: 31, quality: 61, cost: "$8,200", recommendation: "Use only for hard-to-fill requisitions" }
];
