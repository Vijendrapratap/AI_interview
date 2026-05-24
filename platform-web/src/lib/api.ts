import type { ATSCandidate, ATSJob } from "./mockData";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

type RequestOptions = RequestInit & { fallback?: unknown };

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
}

export function getRecruiterDashboard<T>() {
    return requestJson<T>("/api/v1/recruiter/dashboard");
}

export function listRecruiterJobs() {
    return requestJson<ATSJob[]>("/api/v1/recruiter/jobs");
}

export function listRecruiterCandidates() {
    return requestJson<ATSCandidate[]>("/api/v1/recruiter/candidates");
}

export function moveCandidateStage(candidateId: string, stage: string, reason?: string) {
    return requestJson<ATSCandidate>(`/api/v1/recruiter/candidates/${candidateId}/move-stage`, {
        method: "POST",
        body: JSON.stringify({ stage, reason })
    });
}

export function sendInterviewInvite(candidateId: string, templateId: string, message?: string) {
    return requestJson<{ ok: boolean; message: string }>(`/api/v1/recruiter/candidates/${candidateId}/interview-invite`, {
        method: "POST",
        body: JSON.stringify({ template_id: templateId, message })
    });
}
