

# Plan: Rebuild Lead Enrichment Pipeline with Real Web Search

## Status: ✅ Implemented

## What Changed

### Problem
AI (Gemini) was guessing/hallucinating URLs for websites and Instagram handles because it has no internet access.

### Solution
Replaced AI URL guessing with **Firecrawl Search API** for real web searches.

### New Architecture
1. **enrich-lead** → AI provides title, linkedin_url, am only (no more website/ig guessing)
2. **search-lead-socials** (NEW) → Firecrawl searches for real IG profiles and websites
3. **qa-websites** → Simplified to only validate URLs (no more AI "find correct website")
4. **lookup-company-info** → Now uses Firecrawl instead of AI for manual lookups

### Orchestration Flow
Sync → Enrich (AI: titles/AM) → Search Socials (Firecrawl: real URLs) → QA Websites (validate)
