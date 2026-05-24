"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard/pipeline");
}

export async function loadSampleData(): Promise<{
  jobs: number;
  candidates: number;
  applications: number;
}> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization — cannot load sample data.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // ---- 1. Rename Organization to Codesstellar ----
  const { error: orgError } = await supabase
    .from("organizations")
    .update({ name: "Codesstellar", slug: "codesstellar" })
    .eq("id", orgId);
  if (orgError) {
    console.warn("Failed to rename organization to Codesstellar:", orgError.message);
  }

  // ---- 2. Insert 8 Job Postings ----
  const jobRows = [
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Senior Backend Developer",
      department: "Engineering",
      location: "Remote / Bengaluru",
      employment_type: "Full-time",
      salary_min: 2400000,
      salary_max: 3800000,
      currency: "INR",
      status: "open",
      description: "Design and scale modern backend microservices, robust API gateways, and Kafka message brokers for our core applicant tracking platform. Optimize PostgreSQL queries and Redis caches to achieve sub-50ms API latencies.",
      requirements: ["__sample-data__", "Python / Go", "FastAPI / Gin", "PostgreSQL", "Kafka / RabbitMQ", "System Design", "AWS / Docker"]
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Mobile App Developer - Android",
      department: "Engineering",
      location: "Bengaluru, India",
      employment_type: "Full-time",
      salary_min: 1800000,
      salary_max: 2800000,
      currency: "INR",
      status: "open",
      description: "Build premium Android native applications using Kotlin and Jetpack Compose. Implement clean architecture, reactive coroutines, and custom animations while optimizing background services and offline SQLite sync systems.",
      requirements: ["__sample-data__", "Kotlin", "Jetpack Compose", "Coroutines & Flow", "Dagger Hilt", "SQLite / Room", "MVVM / Clean Architecture"]
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Mobile App Developer - iOS",
      department: "Engineering",
      location: "Mumbai / Hybrid",
      employment_type: "Full-time",
      salary_min: 2000000,
      salary_max: 3000000,
      currency: "INR",
      status: "open",
      description: "Architect beautiful, responsive iOS native applications using Swift and SwiftUI. Focus on memory safety, offline synchronization, Swift Concurrency (Async/Await), and smooth transitions matching high-end design specifications.",
      requirements: ["__sample-data__", "Swift", "SwiftUI / UIKit", "Swift Concurrency", "CoreData / SwiftData", "Combine Framework", "Instruments / Memory Profile"]
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Mobile App Developer - Hybrid",
      department: "Engineering",
      location: "Remote / India",
      employment_type: "Full-time",
      salary_min: 1600000,
      salary_max: 2400000,
      currency: "INR",
      status: "open",
      description: "Develop cross-platform mobile apps using React Native. Focus on writing clean TypeScript, custom native bridge integrations (iOS/Android), fast app startup times, and seamless push notification handling.",
      requirements: ["__sample-data__", "React Native", "TypeScript", "Redux Toolkit / Zustand", "Native Bridges (Swift/Kotlin)", "App Store / Play Store Deployment", "Performance Tuning"]
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "ML Engineer",
      department: "Engineering",
      location: "Remote / Bengaluru",
      employment_type: "Full-time",
      salary_min: 2800000,
      salary_max: 4500000,
      currency: "INR",
      status: "open",
      description: "Fine-tune and deploy deep learning models and large language models for resume parsing, candidate scoring, and adaptive interview generation. Optimize model inference using quantization and Triton server hosting.",
      requirements: ["__sample-data__", "Python", "PyTorch / TensorFlow", "Transformers / Hugging Face", "Triton / ONNX", "Docker / Kubernetes", "Vector Databases"]
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Data Scientist",
      department: "Engineering",
      location: "Bengaluru, India",
      employment_type: "Full-time",
      salary_min: 2200000,
      salary_max: 3500000,
      currency: "INR",
      status: "open",
      description: "Extract insights from complex candidate sourcing and interview data to optimize hiring velocities and SLA compliance. Build regression and classification models to predict sourcing quality and candidate offer acceptance rates.",
      requirements: ["__sample-data__", "Python / R", "Pandas / NumPy / Scikit-Learn", "SQL (PostgreSQL)", "Statistical Modeling", "Tableau / BI Tools", "Data Wrangling"]
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Automation Engineer",
      department: "Engineering",
      location: "Hybrid / Pune",
      employment_type: "Full-time",
      salary_min: 1200000,
      salary_max: 1800000,
      currency: "INR",
      status: "open",
      description: "Own the end-to-end automation suite for ReCruItAI. Develop parallel, maintainable UI and API test frameworks using Cypress and Playwright, integrated directly into our AWS CI/CD deployment pipelines.",
      requirements: ["__sample-data__", "JavaScript / TypeScript", "Cypress / Playwright", "API Testing", "CI/CD Pipelines (GitHub Actions)", "Docker", "Agile QA practices"]
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Blockchain Developer",
      department: "Engineering",
      location: "Remote / Bangalore",
      employment_type: "Full-time",
      salary_min: 3000000,
      salary_max: 5000000,
      currency: "INR",
      status: "open",
      description: "Build secure Ethereum and EVM-compatible smart contracts for verifying candidate identity, work history credentials, and storing secure, immutable interview reports. Conduct gas optimization and security audit workflows.",
      requirements: ["__sample-data__", "Solidity", "Hardhat / Foundry", "Ethers.js / Web3.js", "Gas Optimization", "Smart Contract Security (Reentrancy)", "Cryptography basics"]
    }
  ];

  const { data: insertedJobs, error: jobsError } = await supabase
    .from("jobs")
    .insert(jobRows)
    .select("id, title");
  if (jobsError) throw new Error(`Sample jobs insert failed: ${jobsError.message}`);

  const jobsMap = (insertedJobs ?? []).reduce((acc, j) => {
    acc[j.title] = j.id;
    return acc;
  }, {} as Record<string, string>);

  // ---- 3. Create 16 High-Fidelity Mock Candidates ----
  const candidatesData = [
    // Backend
    { full_name: "Arjun Singh", email: "arjun.singh@codesstellar-demo.com", phone: "+91 98765 43210", current_role: "Senior Backend Developer", current_company: "CloudScale Labs", source: "LinkedIn", jobTitle: "Senior Backend Developer", stage: "interview", score: 89 },
    { full_name: "Priya Nair", email: "priya.nair@codesstellar-demo.com", phone: "+91 98765 43211", current_role: "Backend Engineer", current_company: "Fintech Startup", source: "GitHub", jobTitle: "Senior Backend Developer", stage: "new", score: 72 },
    
    // Android
    { full_name: "Rohan Verma", email: "rohan.verma@codesstellar-demo.com", phone: "+91 98765 43212", current_role: "Android Developer", current_company: "HyperApp Tech", source: "LinkedIn", jobTitle: "Mobile App Developer - Android", stage: "interview", score: 86 },
    { full_name: "Ananya Iyer", email: "ananya.iyer@codesstellar-demo.com", phone: "+91 98765 43213", current_role: "Mobile UI Engineer", current_company: "SaaS Studio", source: "Referral", jobTitle: "Mobile App Developer - Android", stage: "screening", score: 78 },
    
    // iOS
    { full_name: "Marcus Thompson", email: "marcus.thompson@codesstellar-demo.com", phone: "+91 98765 43214", current_role: "Senior iOS Developer", current_company: "Fruit Co.", source: "Indeed", jobTitle: "Mobile App Developer - iOS", stage: "offer", score: 92 },
    { full_name: "Aisha Rahman", email: "aisha.rahman@codesstellar-demo.com", phone: "+91 98765 43215", current_role: "iOS Developer", current_company: "Creative Labs", source: "AngelList", jobTitle: "Mobile App Developer - iOS", stage: "new", score: 68 },
    
    // Hybrid
    { full_name: "Sofia Mendez", email: "sofia.mendez@codesstellar-demo.com", phone: "+91 98765 43216", current_role: "React Native Lead", current_company: "FlexMedia Co.", source: "Referral", jobTitle: "Mobile App Developer - Hybrid", stage: "hired", score: 94 },
    { full_name: "Vikram Seth", email: "vikram.seth@codesstellar-demo.com", phone: "+91 98765 43217", current_role: "Mobile App Engineer", current_company: "AppStorey Ltd", source: "Naukri", jobTitle: "Mobile App Developer - Hybrid", stage: "new", score: 70 },
    
    // ML Engineer
    { full_name: "Anya Petrova", email: "anya.petrova@codesstellar-demo.com", phone: "+91 98765 43218", current_role: "Machine Learning Engineer", current_company: "Cortex AI", source: "GitHub", jobTitle: "ML Engineer", stage: "interview", score: 90 },
    { full_name: "Kabir Mehta", email: "kabir.mehta@codesstellar-demo.com", phone: "+91 98765 43219", current_role: "AI Researcher", current_company: "Quantum Research", source: "LinkedIn", jobTitle: "ML Engineer", stage: "screening", score: 75 },
    
    // Data Scientist
    { full_name: "Jamal Carter", email: "jamal.carter@codesstellar-demo.com", phone: "+91 98765 43220", current_role: "Senior Data Scientist", current_company: "Metrics Corp", source: "Referral", jobTitle: "Data Scientist", stage: "offer", score: 93 },
    { full_name: "Elena Rostova", email: "elena.rostova@codesstellar-demo.com", phone: "+91 98765 43221", current_role: "Data Analyst", current_company: "Logistics Pro", source: "Naukri", jobTitle: "Data Scientist", stage: "screening", score: 74 },
    
    // Automation Engineer
    { full_name: "David Kim", email: "david.kim@codesstellar-demo.com", phone: "+91 98765 43222", current_role: "Automation QA Lead", current_company: "BugFree Co.", source: "Indeed", jobTitle: "Automation Engineer", stage: "hired", score: 95 },
    { full_name: "Sanya Gupta", email: "sanya.gupta@codesstellar-demo.com", phone: "+91 98765 43223", current_role: "Test Engineer", current_company: "DevOps Solutions", source: "Naukri", jobTitle: "Automation Engineer", stage: "new", score: 65 },
    
    // Blockchain
    { full_name: "Robert Garcia", email: "robert.garcia@codesstellar-demo.com", phone: "+91 98765 43224", current_role: "Solidity Developer", current_company: "EthLabs Inc.", source: "GitHub", jobTitle: "Blockchain Developer", stage: "interview", score: 88 },
    { full_name: "Karan Johar", email: "karan.johar@codesstellar-demo.com", phone: "+91 98765 43225", current_role: "Web3 Developer", current_company: "DeFi Protocol", source: "LinkedIn", jobTitle: "Blockchain Developer", stage: "rejected", score: 54 }
  ];

  let candidateCount = 0;
  let applicationCount = 0;

  for (const cData of candidatesData) {
    const jobId = jobsMap[cData.jobTitle];
    if (!jobId) continue;

    // A. Insert Candidate
    const { data: candRes, error: candErr } = await supabase
      .from("candidates")
      .insert({
        organization_id: orgId,
        full_name: cData.full_name,
        email: cData.email,
        phone: cData.phone,
        current_role: cData.current_role,
        current_company: cData.current_company,
        source: cData.source
      })
      .select("id")
      .single();

    if (candErr) {
      console.error(`Candidate ${cData.full_name} insert failed: ${candErr.message}`);
      continue;
    }
    const candidateId = candRes.id as string;
    candidateCount++;

    // B. Insert Resume File Mock
    const safeName = cData.full_name.replace(/[^A-Za-z]/g, "") + "_Resume.pdf";
    const storagePath = `${orgId}/${candidateId}/1779140000-${safeName}`;
    
    const { data: resumeRes, error: resumeErr } = await supabase
      .from("resumes")
      .insert({
        organization_id: orgId,
        candidate_id: candidateId,
        storage_path: storagePath,
        file_name: safeName,
        mime_type: "application/pdf",
        byte_size: 145000 + Math.floor(Math.random() * 50000)
      })
      .select("id")
      .single();

    if (resumeErr) {
      console.error(`Resume for ${cData.full_name} failed: ${resumeErr.message}`);
      continue;
    }
    const resumeId = resumeRes.id as string;

    // C. Create Matching Resume Analysis
    const baseScore = cData.score;
    const breakdown = {
      "Role fit": Math.max(50, Math.min(100, baseScore + Math.floor(Math.random() * 6 - 3))),
      "Technical depth": Math.max(50, Math.min(100, baseScore + Math.floor(Math.random() * 8 - 4))),
      "Communication": Math.max(50, Math.min(100, baseScore + Math.floor(Math.random() * 10 - 5))),
      "Problem solving": Math.max(50, Math.min(100, baseScore + Math.floor(Math.random() * 6 - 3))),
      "Culture contribution": Math.max(50, Math.min(100, baseScore + Math.floor(Math.random() * 8 - 4)))
    };

    const redFlags = baseScore < 60 ? ["Insufficient technical testing depth", "No advanced Vector / Gas tuning experience"] : [];
    const skillsFound = cData.jobTitle.includes("Backend") ? ["Python", "FastAPI", "PostgreSQL", "Kafka", "Redis", "Docker"] :
                        cData.jobTitle.includes("Android") ? ["Kotlin", "Jetpack Compose", "Coroutines", "Dagger Hilt", "SQLite"] :
                        cData.jobTitle.includes("iOS") ? ["Swift", "SwiftUI", "Swift Concurrency", "CoreData", "Combine"] :
                        cData.jobTitle.includes("Hybrid") ? ["React Native", "TypeScript", "Redux", "Native Bridges", "Zustand"] :
                        cData.jobTitle.includes("ML") ? ["Python", "PyTorch", "Transformers", "LLMs", "Docker", "Triton"] :
                        cData.jobTitle.includes("Data Scientist") ? ["Python", "Pandas", "Scikit-Learn", "SQL", "Statistics"] :
                        cData.jobTitle.includes("Automation") ? ["JavaScript", "Cypress", "Playwright", "GitHub Actions", "CI/CD"] :
                        ["Solidity", "Hardhat", "Foundry", "Ethers.js", "Gas Tuning", "Cryptography"];

    const skillsMissing = baseScore < 85 ? ["Kubernetes", "Solidity Gas Optimization", "System Architecture Scales"].slice(0, Math.floor(Math.random() * 2 + 1)) : [];

    const { error: analysisErr } = await supabase
      .from("resume_analyses")
      .insert({
        organization_id: orgId,
        resume_id: resumeId,
        job_id: jobId,
        overall_score: baseScore,
        ats_score: Math.max(50, Math.min(100, baseScore + Math.floor(Math.random() * 6 - 2))),
        breakdown,
        red_flags: redFlags,
        skills_found: skillsFound,
        skills_missing: skillsMissing
      });

    if (analysisErr) {
      console.error(`Analysis for ${cData.full_name} failed: ${analysisErr.message}`);
    }

    // D. Insert Application with matching stage & score
    const recommendationText = baseScore >= 85 ? "Excellent technical match. High-fidelity skills identified. Move immediately to tech reviews." :
                                 baseScore >= 70 ? "Adequate baseline experience. Good communication scores. Worth reviewing in detail." :
                                 "Significant gaps in mandatory requirements. Attention required regarding red flags.";

    const { data: appRes, error: appErr } = await supabase
      .from("applications")
      .insert({
        organization_id: orgId,
        candidate_id: candidateId,
        job_id: jobId,
        stage: cData.stage,
        ai_score: baseScore,
        analysis_status: "complete",
        recommendation: recommendationText
      })
      .select("id")
      .single();

    if (appErr) {
      console.error(`Application for ${cData.full_name} failed: ${appErr.message}`);
      continue;
    }
    const applicationId = appRes.id as string;
    applicationCount++;

    // E. For Interview, Offer, and Hired stages -> Insert structured interview transcripts & reports!
    if (cData.stage === "interview" || cData.stage === "offer" || cData.stage === "hired") {
      let transcript = [];
      let summary = "";
      
      if (cData.jobTitle.includes("Backend")) {
        transcript = [
          { role: "ai", text: "Welcome Arjun. Let's start with system architecture. How do you design a reliable resume screening pipeline with explainable AI scoring?", type: "question" },
          { role: "user", text: "I would decouple it. Resumes are uploaded to S3, which triggers a message in Kafka. A consumer pool reads the job description and parses the text using a lightweight parser. Then, a vector embedding computes the ATS score, and we feed sections into LLMs for scoring key requirements. Using structured schema output guarantees explainable details.", type: "response" },
          { role: "ai", text: "That is solid. How would you handle a production API outage during a recruiter demo?", type: "question" },
          { role: "user", text: "First, the system should failover gracefully by servingcached matching data from Redis. On the backend, we run circuit breakers on API calls to avoid cascading failures. We alert the engineering team automatically via PagerDuty and keep a queue of unprocessed uploads in Postgres to retry automatically once healthy.", type: "response" }
        ];
        summary = "Arjun demonstrated remarkable system design depth. He thoroughly explained decoupling strategies using Kafka and S3, alongside clear failover patterns involving Redis and Postgres queues. His API performance knowledge is strong.";
      } else if (cData.jobTitle.includes("Android")) {
        transcript = [
          { role: "ai", text: "Welcome Rohan. Let's talk about background operations. How do you manage long-running tasks in Kotlin coroutines without causing memory leaks?", type: "question" },
          { role: "user", text: "I bind long-running coroutines directly to structured concurrency lifecycle scopes like viewModelScope or lifecycleScope. I never launch in GlobalScope. For background work, I use WorkManager which integrates natively with custom worker factories, making it robust against app terminations.", type: "response" },
          { role: "ai", text: "Excellent. How do you handle Jetpack Compose state updates across complex nested UI components?", type: "question" },
          { role: "user", text: "I practice state hoisting by passing state variables down and events up. For state management, I use ViewModel holding StateFlow, which is collected in Compose using collectAsStateWithLifecycle to prevent thread overhead when the app goes background.", type: "response" }
        ];
        summary = "Rohan showed deep expertise in structured concurrency and state hoisting. His solutions to Android background architecture and Jetpack Compose lifecycle constraints are completely sound and state of the art.";
      } else if (cData.jobTitle.includes("iOS")) {
        transcript = [
          { role: "ai", text: "Welcome Marcus. Can you describe Swift Concurrency and how it prevents data races compared to legacy GCD queues?", type: "question" },
          { role: "user", text: "Swift concurrency uses Actors, which isolate mutable state and permit only one task to modify it at a time. Using async/await ensures compiler-enforced data safety. GCD was manual, which constantly led to thread pool saturation and complex lock mechanisms.", type: "response" },
          { role: "ai", text: "Perfect. How do you identify memory leaks and avoid retain cycles in SwiftUI with SwiftData?", type: "question" },
          { role: "user", text: "Retain cycles usually occur in closures capturing self strongly. I systematically declare weak or unowned captures like [weak self] inside async blocks. To diagnose, I run Xcode Instruments Allocations or Memory Graph to inspect circular references.", type: "response" }
        ];
        summary = "Marcus is a top-tier iOS developer. He gave extremely articulate explanations of Actors in Swift Concurrency and memory leak profiles inside nested closures. Highly recommended for senior technical roles.";
      } else if (cData.jobTitle.includes("Hybrid")) {
        transcript = [
          { role: "ai", text: "Welcome Sofia. React Native vs Flutter performance is a common trade-off. How do you optimize React Native render speeds?", type: "question" },
          { role: "user", text: "I systematically use memoization with useMemo and useCallback to avoid redundant re-renders. For lists, I prioritize FlashList over standard FlatList. In terms of bridge optimization, I leverage JSI for direct C++ references instead of JSON bridge serialization.", type: "response" },
          { role: "ai", text: "Excellent. How do you bridge native platform modules when React Native doesn't support them?", type: "question" },
          { role: "user", text: "I write a native module in Swift for iOS and Kotlin for Android. I expose them through RCTBridgeModule in objective-C and ReactContextBaseJavaModule in Java. The typescript side queries them directly using NativeModules.", type: "response" }
        ];
        summary = "Sofia possesses outstanding knowledge of React Native runtime optimization. Her mastery of JSI and native modules bridging is exemplary. Solid hybrid developer fit.";
      } else if (cData.jobTitle.includes("ML")) {
        transcript = [
          { role: "ai", text: "Welcome Anya. Let's start with model architecture. How do you optimize inference latency for Transformer-based screening models?", type: "question" },
          { role: "user", text: "I apply Post-Training Quantization (PTQ) to convert weights to INT8, which slashes memory footprint and speeds up matrix multiplication. I also host models on a Triton server with dynamic batching and compile using TensorRT for massive performance gains.", type: "response" },
          { role: "ai", text: "Excellent. How do you handle fine-tuning on highly imbalanced resume screening datasets?", type: "question" },
          { role: "user", text: "I leverage LoRA or QLoRA adapters to freeze main weights and optimize small parameters, preventing overfitting. I apply focal loss or class weights in cross-entropy to punish misclassifications of rare key skills.", type: "response" }
        ];
        summary = "Anya gave master-class answers on transformer quantization and fine-tuning adapters (QLoRA). Her practical experience with Triton deployment and dynamically batched inference pipelines is extremely impressive.";
      } else if (cData.jobTitle.includes("Data Scientist")) {
        transcript = [
          { role: "ai", text: "Welcome Jamal. How do you address statistical overfitting in candidate conversion prediction models?", type: "question" },
          { role: "user", text: "First, I perform robust feature selection using L1 regularization (Lasso) to prune redundant variables. I systematically run K-fold cross-validation and apply early stopping on gradient boosting models to avoid capturing training noise.", type: "response" },
          { role: "ai", text: "Great. What metrics do you track to prove hiring velocity and sourcing quality are improving?", type: "question" },
          { role: "user", text: "I track Time-to-Offer, AI shortlist pass rate, SLA bottlenecks, and Source Quality conversion (percentage of inbound applicants reaching the interview stage per platform). Tracking these shows exactly where the bottlenecks occur.", type: "response" }
        ];
        summary = "Jamal is an exceptional, data-driven professional. He is highly capable in statistical validation and has a clear grasp of recruitment analytics and SLA metrics. Outstanding fit.";
      } else if (cData.jobTitle.includes("Automation")) {
        transcript = [
          { role: "ai", text: "Welcome David. Flaky tests are a major blocker in CI/CD pipelines. How do you systematic diagnose and eliminate them?", type: "question" },
          { role: "user", text: "Flakiness is usually caused by race conditions or dynamic DOM transitions. I never use static wait(3000) calls. I implement explicit waiting for target DOM elements. I also isolate test DB states using dynamic API seeding rather than relying on previous test executions.", type: "response" },
          { role: "ai", text: "Excellent. What are the key benefits of Playwright over Selenium for ReCruItAI?", type: "question" },
          { role: "user", text: "Playwright has native WebSocket connections, meaning it is auto-waiting and handles single-page apps (SPAs) much faster. It executes tests in parallel out of the box using browser contexts, which saves enormous time in Github Actions execution.", type: "response" }
        ];
        summary = "David is highly skilled in test architecture. His explicit waiting methods and test DB isolation strategies successfully resolve the classic flakiness problems. Perfect QA Lead candidate.";
      } else {
        transcript = [
          { role: "ai", text: "Welcome Robert. Let's discuss Solidity. How do you optimize smart contract code to minimize Gas fees?", type: "question" },
          { role: "user", text: "I optimize storage slots by grouping variables tightly (e.g. uint128 and uint128 in one slot). I use calldata instead of memory for read-only arrays, leverage unchecked blocks for arithmetic operations that cannot overflow, and avoid state modifications in loops.", type: "response" },
          { role: "ai", text: "Outstanding. How do you prevent classic Reentrancy attacks on blockchain payouts?", type: "question" },
          { role: "user", text: "I strictly follow the Checks-Effects-Interactions pattern. I modify contract states (effects) *before* making any external calls (interactions). I also systematically inherit OpenZeppelin's ReentrancyGuard and apply the nonReentrant modifier to sensitive methods.", type: "response" }
        ];
        summary = "Robert gave top-notch answers on solidity gas optimization and reentrancy security models. His experience auditing DeFi smart contracts makes him an incredible asset.";
      }

      // 1. Insert Interview Session
      const { data: sessionRes, error: sessionErr } = await supabase
        .from("interview_sessions")
        .insert({
          organization_id: orgId,
          candidate_id: candidateId,
          job_id: jobId,
          status: "completed",
          mode: "text",
          transcript: transcript,
          scores: breakdown,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          ended_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (sessionErr) {
        console.error(`Session for ${cData.full_name} failed: ${sessionErr.message}`);
        continue;
      }
      const sessionId = sessionRes.id as string;

      // 2. Insert Interview Report
      const { error: reportErr } = await supabase
        .from("interview_reports")
        .insert({
          session_id: sessionId,
          summary: summary,
          scorecard: breakdown,
          recommendation: baseScore >= 80 ? "Strong Hire" : "Hire"
        });

      if (reportErr) {
        console.error(`Report for ${cData.full_name} failed: ${reportErr.message}`);
      }
    }
  }

  revalidateAll();

  return {
    jobs: insertedJobs?.length ?? 0,
    candidates: candidateCount,
    applications: applicationCount
  };
}

export async function clearSampleData(): Promise<void> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization — cannot clear sample data.");

  // Reset Organization name to a default if it was Codesstellar
  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();
  if (org?.name === "Codesstellar") {
    await supabase.from("organizations").update({ name: "Acme Corp", slug: "acme-corp" }).eq("id", orgId);
  }

  // --- Find sample candidate ids ---
  const { data: sampleCandidates } = await supabase
    .from("candidates")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("email", "%codesstellar-demo.com%");
  const sampleCandidateIds = (sampleCandidates ?? []).map((c) => c.id as string);

  // --- Find sample job ids ---
  const { data: sampleJobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("organization_id", orgId)
    .filter("requirements", "cs", '{"__sample-data__"}');
  const sampleJobIds = (sampleJobs ?? []).map((j) => j.id as string);

  // 1. Delete platform connections and publications associated with the org
  await supabase.from("job_publications").delete().eq("organization_id", orgId);
  await supabase.from("platform_connections").delete().eq("organization_id", orgId);

  // 2. Delete applications linked to sample candidates OR sample jobs
  if (sampleCandidateIds.length > 0 || sampleJobIds.length > 0) {
    if (sampleCandidateIds.length > 0) {
      await supabase.from("applications").delete().in("candidate_id", sampleCandidateIds);
      
      // Delete interview reports linked to candidate's sessions
      const { data: sessions } = await supabase
        .from("interview_sessions")
        .select("id")
        .in("candidate_id", sampleCandidateIds);
      const sessionIds = (sessions ?? []).map(s => s.id as string);
      if (sessionIds.length > 0) {
        await supabase.from("interview_reports").delete().in("session_id", sessionIds);
        await supabase.from("interview_sessions").delete().in("id", sessionIds);
      }
    }
    if (sampleJobIds.length > 0) {
      await supabase.from("applications").delete().in("job_id", sampleJobIds);
    }
  }

  // 3. Delete resumes for sample candidates
  if (sampleCandidateIds.length > 0) {
    await supabase.from("resumes").delete().in("candidate_id", sampleCandidateIds);
  }

  // 4. Delete sample candidates
  if (sampleCandidateIds.length > 0) {
    await supabase.from("candidates").delete().in("id", sampleCandidateIds);
  }

  // 5. Delete sample jobs
  if (sampleJobIds.length > 0) {
    await supabase.from("jobs").delete().in("id", sampleJobIds);
  }

  revalidateAll();
}
