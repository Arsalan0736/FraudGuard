"""LLM explanation layer using Gemini.

Falls back to a template explanation on any network/API failure so the pipeline
is always available offline / without a key.
"""
from __future__ import annotations

import logging
from typing import Iterable

import requests

from ..config import Config

log = logging.getLogger(__name__)

PROMPT_TEMPLATE = (
    "You are a fraud-detection analyst assistant. A transaction was flagged "
    "by our rules + ML model. Write a concise 2-3 sentence plain-English "
    "explanation of why this transaction looks suspicious.\n\n"
    "Transaction details:\n"
    "- Amount: {amount}\n"
    "- Merchant: {merchant}\n"
    "- Location: {location}\n"
    "- Timestamp: {timestamp}\n"
    "- Final risk score: {risk_score}/100\n"
    "- Triggered rules: {rules}\n\n"
    "Be specific, professional, and actionable. Do not mention the prompt."
)

FALLBACK_TEMPLATE = (
    "Transaction flagged with risk score {risk_score}/100. "
    "Amount {amount} at {merchant} ({location}) at {timestamp} "
    "triggered the following rules: {rules}. "
    "Recommend an analyst review before approval."
)


def _format_rules(rules: Iterable[str]) -> str:
    rules = list(rules)
    return ", ".join(rules) if rules else "none reported"


def _fallback(amount, merchant, location, timestamp, risk_score, rules) -> str:
    return FALLBACK_TEMPLATE.format(
        amount=amount, merchant=merchant, location=location,
        timestamp=timestamp, risk_score=risk_score, rules=_format_rules(rules),
    )


def explain(amount, merchant, location, timestamp,
            risk_score: float, rules: list[str]) -> str:
    """Return a 2-3 sentence plain-English explanation, or fallback."""
    if not Config.GEMINI_API_KEY:
        return _fallback(amount, merchant, location, timestamp, risk_score, rules)

    prompt = PROMPT_TEMPLATE.format(
        amount=amount, merchant=merchant, location=location,
        timestamp=timestamp, risk_score=risk_score, rules=_format_rules(rules),
    )

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 220},
    }
    try:
        resp = requests.post(
            f"{Config.GEMINI_URL}?key={Config.GEMINI_API_KEY}",
            json=body, timeout=10,
        )
        if resp.status_code != 200:
            log.warning("Gemini non-200: %s %s", resp.status_code, resp.text[:200])
            return _fallback(amount, merchant, location, timestamp, risk_score, rules)

        data = resp.json()
        text = (
            data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
        )
        if not text:
            return _fallback(amount, merchant, location, timestamp, risk_score, rules)
        return text
    except (requests.RequestException, ValueError, KeyError, IndexError) as exc:
        log.warning("Gemini call failed: %s", exc)
        return _fallback(amount, merchant, location, timestamp, risk_score, rules)
