"""
LLM Benchmark Harness
=====================

Run a fixed 3-turn dummy interview through ``LLMService`` for each candidate
OpenRouter model and capture latency / output / qualitative quality. Used to
pick the best default model for the interview engine (Task 7.4).

Usage:
    cd backend && set -a && . ./.env && set +a && \
        ./venv/bin/python -m app.services.llm.benchmark \
            google/gemini-2.5-flash \
            deepseek/deepseek-v3.2-exp \
            moonshotai/kimi-k2-0905 \
            anthropic/claude-haiku-4.5 \
            openai/gpt-5-mini

Results are written to ``backend/benchmarks/llm_<timestamp>.json``.

Implementation note
-------------------
``LLMService`` looks up provider config from YAML at construction time and
does not expose a per-call ``model`` override. To benchmark arbitrary
OpenRouter model IDs without touching ``service.py`` or ``providers.py``,
we drive OpenRouter directly via the same ``OpenRouterProvider`` class the
service uses -- so we still test the production code path (OpenAI-compatible
chat completions through the same provider class), just with the model ID
swapped per iteration.
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

from app.services.llm.providers import OpenRouterProvider


# Three turns simulating an interview engine call sequence:
#   1. icebreaker  -- open with a specific question grounded in resume detail
#   2. follow_up   -- drill into a technical trade-off from the candidate's answer
#   3. scoring     -- emit STRICT JSON for the response evaluator
PROMPTS: Dict[str, str] = {
    "icebreaker": (
        "You are an AI interviewer. The candidate's resume mentions building a "
        "high-throughput payment processing service handling $5M+/day at TechCorp "
        "with Kafka, PostgreSQL logical replication, and idempotency keys. "
        "Generate a warm, specific opening question that references this experience. "
        "Reply with ONLY the question, no preamble."
    ),
    "follow_up": (
        "Previous question: 'Tell me about the journey of architecting that payment "
        "processing service.' Candidate replied: 'We chose Kafka over RabbitMQ for "
        "horizontal scaling. PostgreSQL logical replication ran active-active across "
        "three AZs. Idempotency keys prevented duplicate processing.' "
        "Generate a probing follow-up that drills into a specific technical trade-off. "
        "Reply with ONLY the question."
    ),
    "scoring": (
        'Score this interview response on a 0-10 scale for technical_depth, '
        'communication, and STAR-method usage. Reply with ONLY valid JSON: '
        '{"technical_depth": <0-10>, "communication": <0-10>, "star_method": <0-10>, '
        '"one_line_feedback": "..."}\n\nResponse: "We chose Kafka because we needed '
        'partition-level ordering and replay capability. Trade-off was operational '
        'complexity vs RabbitMQ. I led the design after benchmarking both at 50k events/s."'
    ),
}

# Quality signals (substring match, case-insensitive). Used to flag obviously
# off-topic / generic completions. Not authoritative -- a human eyeball still
# wins, but useful for fast triage of N models.
EXPECTED_SIGNALS: Dict[str, List[str]] = {
    "icebreaker": ["payment", "kafka", "techcorp", "$5m", "idempot", "replication"],
    "follow_up": ["kafka", "rabbit", "replication", "idempot", "trade", "az"],
    "scoring": ["technical_depth", "communication", "star_method"],
}


def _qualitative_check(case: str, text: str) -> Dict[str, Any]:
    """Cheap quality heuristics -- not a judge, just a triage signal."""
    lower = text.lower()
    hits = [s for s in EXPECTED_SIGNALS.get(case, []) if s in lower]

    parsed_json = None
    json_ok = False
    if case == "scoring":
        # Tolerate fenced code blocks the way the response_evaluator does.
        candidate = text.strip()
        if candidate.startswith("```"):
            # strip first fence line + trailing fence
            parts = candidate.split("```")
            for p in parts:
                p = p.strip()
                if p.startswith("{"):
                    candidate = p
                    break
                if p.startswith("json"):
                    candidate = p[4:].strip()
                    break
        try:
            parsed_json = json.loads(candidate)
            json_ok = all(
                k in parsed_json
                for k in ("technical_depth", "communication", "star_method")
            )
        except Exception:
            json_ok = False

    return {
        "signal_hits": hits,
        "signal_hit_count": len(hits),
        "json_parse_ok": json_ok if case == "scoring" else None,
        "parsed_json": parsed_json if (case == "scoring" and json_ok) else None,
    }


async def benchmark_one(model_id: str) -> Dict[str, Any]:
    """Run the 3-turn benchmark for a single OpenRouter model ID."""
    provider = OpenRouterProvider(model=model_id)
    rows: List[Dict[str, Any]] = []
    total_latency = 0.0
    successes = 0

    for label, prompt in PROMPTS.items():
        t0 = time.time()
        try:
            json_mode = label == "scoring"
            out = await provider.generate(
                prompt=prompt,
                temperature=0.7,
                max_tokens=512,
                json_mode=json_mode,
            )
            latency = round(time.time() - t0, 2)
            total_latency += latency
            successes += 1
            quality = _qualitative_check(label, out)
            rows.append({
                "case": label,
                "latency_s": latency,
                "chars": len(out),
                "preview": out[:400],
                **quality,
            })
        except Exception as e:
            rows.append({
                "case": label,
                "latency_s": round(time.time() - t0, 2),
                "error": f"{type(e).__name__}: {str(e)[:300]}",
            })
        # Gentle pacing to avoid OpenRouter per-key bursts.
        await asyncio.sleep(1.0)

    avg_latency = round(total_latency / successes, 2) if successes else None
    return {
        "model": model_id,
        "cases_passed": successes,
        "cases_total": len(PROMPTS),
        "avg_latency_s": avg_latency,
        "results": rows,
    }


def _summarize(report: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """One-line per model -- handy for picking the winner from terminal output."""
    summary = []
    for r in report:
        scoring = next((c for c in r["results"] if c["case"] == "scoring"), {})
        icebreak = next((c for c in r["results"] if c["case"] == "icebreaker"), {})
        followup = next((c for c in r["results"] if c["case"] == "follow_up"), {})
        summary.append({
            "model": r["model"],
            "passed": f"{r['cases_passed']}/{r['cases_total']}",
            "avg_latency_s": r["avg_latency_s"],
            "json_ok": scoring.get("json_parse_ok"),
            "icebreaker_signals": icebreak.get("signal_hit_count"),
            "followup_signals": followup.get("signal_hit_count"),
        })
    return summary


async def main(models: List[str]) -> None:
    if not models:
        print("usage: python -m app.services.llm.benchmark <model-id> [<model-id> ...]")
        sys.exit(2)

    print(f"Benchmarking {len(models)} model(s) on a 3-turn interview sequence.\n")
    report: List[Dict[str, Any]] = []
    for m in models:
        print(f"--- {m}", flush=True)
        result = await benchmark_one(m)
        report.append(result)
        passed = f"{result['cases_passed']}/{result['cases_total']}"
        print(f"    passed={passed}  avg_latency={result['avg_latency_s']}s", flush=True)

    out_dir = Path(__file__).resolve().parents[3] / "benchmarks"
    out_dir.mkdir(parents=True, exist_ok=True)
    fp = out_dir / f"llm_{int(time.time())}.json"
    payload = {
        "generated_at": int(time.time()),
        "models": models,
        "summary": _summarize(report),
        "detail": report,
    }
    fp.write_text(json.dumps(payload, indent=2))

    print(f"\nWrote {fp}\n")
    print("Summary:")
    print(json.dumps(_summarize(report), indent=2))


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
