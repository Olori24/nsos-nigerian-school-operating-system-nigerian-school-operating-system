#!/usr/bin/env python3
"""One-shot, public-page-only NSOS outreach pilot using local Skyvern inference.

Never print or persist extracted contact values. The GitHub Actions runner is
ephemeral; only a redacted verification summary is written to the run summary.
"""
from __future__ import annotations

import asyncio
import ipaddress
import json
import logging
import os
import socket
import sys
from urllib.parse import urlparse

logging.disable(logging.CRITICAL)

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "organisation_name": {"type": ["string", "null"]},
        "official_website": {"type": ["string", "null"]},
        "country": {"type": ["string", "null"]},
        "organisation_type": {"type": ["string", "null"]},
        "public_contact_email": {"type": ["string", "null"]},
        "public_phone": {"type": ["string", "null"]},
        "contact_page_url": {"type": ["string", "null"]},
        "admissions_page_url": {"type": ["string", "null"]},
        "evidence_urls": {"type": "array", "items": {"type": "string"}},
        "evidence_notes": {"type": ["string", "null"]},
        "confidence": {"type": ["string", "null"], "enum": ["high", "medium", "low", None]},
        "review_required": {"type": "boolean"},
    },
    "required": [
        "organisation_name", "official_website", "country", "organisation_type",
        "public_contact_email", "public_phone", "contact_page_url",
        "admissions_page_url", "evidence_urls", "evidence_notes",
        "confidence", "review_required",
    ],
}


def validate_public_https_url(raw: str) -> str:
    parsed = urlparse(raw.strip())
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Target must be an HTTPS URL with a hostname")
    if parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Credentials and non-standard ports are not permitted")
    host = parsed.hostname.lower().rstrip(".")
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
        raise ValueError("Private and local hostnames are not permitted")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("IP-literal targets are not permitted")
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("Target hostname did not resolve") from exc
    if not addresses:
        raise ValueError("Target hostname did not resolve")
    for item in addresses:
        address = ipaddress.ip_address(item[4][0])
        if not address.is_global:
            raise ValueError("Target resolves to a non-public IP address")
    return host


def find_payload(value):
    if isinstance(value, dict):
        if "organisation_name" in value and "evidence_urls" in value:
            return value
        for nested in value.values():
            found = find_payload(nested)
            if found is not None:
                return found
    elif isinstance(value, str):
        candidate = value.strip()
        if candidate.startswith("{") and candidate.endswith("}"):
            try:
                return find_payload(json.loads(candidate))
            except json.JSONDecodeError:
                return None
    return None


def same_host(raw: str | None, expected_host: str) -> bool:
    if not raw:
        return False
    parsed = urlparse(raw)
    return parsed.scheme == "https" and parsed.hostname == expected_host


async def main() -> int:
    target = os.environ.get("NSOS_TARGET_URL", "")
    kind = os.environ.get("NSOS_TARGET_KIND", "")
    host = validate_public_https_url(target)
    if kind not in {"school", "business"}:
        raise ValueError("Target kind must be school or business")

    from skyvern import Skyvern

    client = Skyvern.local(use_in_memory_db=True)
    try:
        prompt = f"""
You are the NSOS public-website verification worker. Organisation type: {kind}.
The ONLY permitted hostname is {host}. Start at the supplied official URL.
Inspect only the homepage and normal public About, Contact, Admissions or
equivalent pages on this same hostname. Do not follow links to other hosts.
Extract only information visibly published for the organisation itself:
organisation name, country, organisation type, a generic institutional
contact email, a main office phone number, and exact URLs of pages supporting
each extracted value. Never infer, guess, enrich or manufacture a contact.
Do not identify private individuals or collect personal email addresses.
If a value is absent or ambiguous, return null. Include only pages actually
visited in evidence_urls. Set review_required to true.
Never log in, register, download files, accept payments, submit a form, send
messages, change website data, bypass a CAPTCHA, or interact with a private
area. Stop immediately if a CAPTCHA, login wall, unexpected redirect, or
request to access another hostname appears.
Return only data matching the supplied JSON schema.
"""
        result = await client.run_task(
            prompt=prompt,
            url=target,
            title="NSOS public organisation contact verification pilot",
            data_extraction_schema=SCHEMA,
            max_steps=10,
            wait_for_completion=True,
            timeout=600,
        )
        raw_status = getattr(result, "status", "unknown")
        status = str(getattr(raw_status, "value", raw_status))
        payload = find_payload(getattr(result, "output", None))
        if status != "completed" or payload is None:
            print(f"NSOS_SKYVERN_RESULT status={status} schema_valid=false")
            return 2

        evidence = payload.get("evidence_urls") or []
        if not isinstance(evidence, list):
            evidence = []
        evidence = [url for url in evidence if same_host(url, host)]
        official = payload.get("official_website")
        organisation_name = payload.get("organisation_name")
        name_ok = isinstance(organisation_name, str) and bool(organisation_name.strip())
        country = str(payload.get("country") or "").strip().lower()
        country_ok = kind != "school" or "nigeria" in country
        website_ok = same_host(official, host)
        email = payload.get("public_contact_email")
        phone = payload.get("public_phone")
        email_ok = isinstance(email, str) and "@" in email and len(email) <= 254
        phone_ok = isinstance(phone, str) and len(phone.strip()) >= 7
        review_required_ok = payload.get("review_required") is True
        contact_page_ok = payload.get("contact_page_url") is None or same_host(payload.get("contact_page_url"), host)
        admissions_page_ok = payload.get("admissions_page_url") is None or same_host(payload.get("admissions_page_url"), host)
        passed = name_ok and country_ok and website_ok and bool(evidence) and review_required_ok and contact_page_ok and admissions_page_ok

        summary = {
            "status": "passed" if passed else "needs_review",
            "target_kind": kind,
            "target_host": host,
            "skyvern_status": status,
            "organisation_name_verified": name_ok,
            "nigerian_school_country_verified": country_ok,
            "official_website_matches_target": website_ok,
            "review_required_flag_verified": review_required_ok,
            "contact_page_matches_target": contact_page_ok,
            "admissions_page_matches_target": admissions_page_ok,
            "evidence_pages_on_target_host": len(evidence),
            "public_email_found": email_ok,
            "public_phone_found": phone_ok,
            "human_review_required": True,
            "external_actions": "none",
            "contact_values_persisted": False,
        }
        print("NSOS_SKYVERN_RESULT " + json.dumps(summary, sort_keys=True))
        summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary_path:
            with open(summary_path, "a", encoding="utf-8") as handle:
                handle.write("## NSOS Skyvern pilot result\n\n")
                handle.write("| Check | Result |\n|---|---|\n")
                for key, value in summary.items():
                    handle.write(f"| {key.replace('_', ' ')} | {value} |\n")
                handle.write("\nContact values are intentionally not printed or stored by this public-repository pilot.\n")
        return 0 if passed else 3
    finally:
        await client.aclose()


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as exc:
        # Exception text can contain URLs or page data; report only the class.
        print(f"NSOS_SKYVERN_RESULT status=failed error_type={type(exc).__name__}")
        sys.exit(1)
