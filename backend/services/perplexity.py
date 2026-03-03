# Fix research service — uses DeepSeek for fix recommendations
# (Replaces Perplexity Sonar while API key is on hold)

import os
import json
import httpx

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"


async def research_fix(root_cause: str, summary: str) -> dict:
    """
    Query DeepSeek to find verified fixes with documentation references.
    Returns structured list of fixes with commands and sources.
    """
    system_prompt = """You are a senior DevOps/SRE expert helping resolve infrastructure incidents.
Given a root cause diagnosis, recommend verified fixes and remediation steps.

You MUST respond with valid JSON in exactly this format:
{
  "fixes": [
    {
      "title": "Short descriptive title of the fix",
      "command": "The actual CLI command or code to run",
      "language": "bash" or "python" or "yaml" etc,
      "source": "URL to official documentation for this fix",
      "source_type": "external"
    }
  ]
}

Rules:
- Include as many highly-relevant fixes as appropriate for this incident, ordered by priority (quick fix first, then config changes, then long-term). Do NOT output irrelevant filler fixes.
- Commands must be real, production-ready commands.
- Sources must be real URLs from official documentation (redis.io, kubernetes.io, docs.python.org, etc).
- At least one fix should be an "internal" source_type with source "internal://runbooks/incident-response.md" and a command starting with a reasonable local shell command.
- Respond ONLY with the JSON object, no markdown fences or extra text."""

    user_message = f"""Find verified fixes for this infrastructure incident:

**Incident:** {summary}
**Root Cause:** {root_cause}

Recommend CLI commands, configuration changes, and code fixes that resolve this issue.
Reference official documentation sources."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1500,
                },
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        return json.loads(content)

    except Exception as e:
        # No hardcoded fallback — if AI fails, report the error honestly
        raise RuntimeError(f"Fix research failed — DeepSeek error: {e}")

