"""
Pluggable LLM Provider Interface for ShelfSense
Supports:
1. Google Gemini (via google-genai SDK, GEMINI_API_KEY)
2. Offline Fallback (extractive template-based explanation grounded strictly in book description)
"""

import os
import re
from typing import Dict, Any, Optional, Tuple
from abc import ABC, abstractmethod
from dotenv import load_dotenv

load_dotenv()


class BaseLLMProvider(ABC):
    @abstractmethod
    def generate_explanation(
        self,
        title: str,
        authors: str,
        description: str,
        query: str,
        matched_snippet: str,
        dominant_emotion: str,
        vibe_summary: str,
    ) -> str:
        """Generate a 1-2 sentence reason grounded ONLY in description and query."""
        pass

    @abstractmethod
    def generate_chat_refinement(
        self,
        messages: list,
        current_state: Dict[str, Any],
    ) -> Tuple[str, Dict[str, Any]]:
        """Process conversational refine request and return (reply, state_updates)."""
        pass


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            from google import genai
            self.client = genai.Client(api_key=api_key)
            self.model_name = "gemini-2.5-flash"
        except Exception as e:
            print(f"Warning: Failed to initialize google-genai Client: {e}. Falling back to generativeai.")
            import google.generativeai as gai
            gai.configure(api_key=api_key)
            self.client = gai.GenerativeModel("gemini-1.5-flash")
            self.model_name = "gemini-1.5-flash-legacy"

    def generate_explanation(
        self,
        title: str,
        authors: str,
        description: str,
        query: str,
        matched_snippet: str,
        dominant_emotion: str,
        vibe_summary: str,
    ) -> str:
        prompt = f"""You are ShelfSense, an expert librarian recommendation engine.
Explain in 1 to 2 engaging, concise sentences why the book "{title}" by {authors} matches the reader's request: "{query}".

CRITICAL CONSTRAINT: Ground your explanation ONLY in the factual book description and key snippet below. Do NOT invent plot points, character names, or facts not mentioned in the description.

Book Description: {description}
Key Matching Snippet: "{matched_snippet}"
Emotional Tone: {dominant_emotion} ({vibe_summary})

Provide ONLY the 1-2 sentence explanation. Do not add introductory fluff."""

        try:
            if hasattr(self.client, "models") and hasattr(self.client.models, "generate_content"):
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )
                return response.text.strip()
            elif hasattr(self.client, "generate_content"):
                response = self.client.generate_content(prompt)
                return response.text.strip()
        except Exception as e:
            print(f"Gemini API error during explanation: {e}. Falling back to template explanation.")
            fallback = OfflineFallbackProvider()
            return fallback.generate_explanation(
                title=title,
                authors=authors,
                description=description,
                query=query,
                matched_snippet=matched_snippet,
                dominant_emotion=dominant_emotion,
                vibe_summary=vibe_summary,
            )

    def generate_chat_refinement(
        self,
        messages: list,
        current_state: Dict[str, Any],
    ) -> Tuple[str, Dict[str, Any]]:
        history_text = "\n".join([f"{m.role.capitalize()}: {m.content}" for m in messages[-6:]])
        last_user_msg = messages[-1].content if messages else ""

        prompt = f"""You are the conversational assistant for ShelfSense, an AI book discovery app.
The user is refining their book recommendations.
Current Search State: {current_state}

Recent Conversation:
{history_text}

Task:
1. Provide a warm, conversational 1-2 sentence response to the user's latest message ("{last_user_msg}").
2. Extract any parameter updates (updated_query, slider adjustments for dark_light, pacing, cerebral_escapist, length_scale in range [-1.0, 1.0], or filter adjustments: max_pages, min_rating, category, tone).

Format your output EXACTLY as JSON with two keys:
{{
  "reply": "Warm 1-2 sentence librarian response acknowledging their preference",
  "updates": {{
    "updated_query": "refined query or null",
    "sliders": {{"dark_light": float or null, "pacing": float or null, "cerebral_escapist": float or null, "length_scale": float or null}},
    "filters": {{"category": str or null, "tone": str or null, "max_pages": int or null, "min_rating": float or null}}
  }}
}}"""

        try:
            text = ""
            if hasattr(self.client, "models") and hasattr(self.client.models, "generate_content"):
                resp = self.client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                text = resp.text.strip()
            elif hasattr(self.client, "generate_content"):
                resp = self.client.generate_content(prompt)
                text = resp.text.strip()

            import json
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                return data.get("reply", "I've updated your recommendations based on your preferences."), data.get("updates", {})
        except Exception as e:
            print(f"Gemini chat parse error: {e}. Using offline fallback parser.")

        fallback = OfflineFallbackProvider()
        return fallback.generate_chat_refinement(messages, current_state)


class OfflineFallbackProvider(BaseLLMProvider):
    """Reliable deterministic fallback requiring zero external API keys."""

    def generate_explanation(
        self,
        title: str,
        authors: str,
        description: str,
        query: str,
        matched_snippet: str,
        dominant_emotion: str,
        vibe_summary: str,
    ) -> str:
        snippet_clean = matched_snippet.rstrip(".")
        if len(snippet_clean) > 160:
            snippet_clean = snippet_clean[:157] + "..."

        # Editorial templates
        if dominant_emotion in ["sadness", "melancholy"]:
            return f'Captures your interest in deeper emotional resonance: {title} evokes a melancholic atmosphere ("{snippet_clean}"), paired with a {vibe_summary.lower()} pacing.'
        elif dominant_emotion in ["joy", "optimism"]:
            return f'Matches your desire for an uplifting reading experience: {title} delivers an inspiring tone highlighted by "{snippet_clean}".'
        elif dominant_emotion in ["fear", "suspense"]:
            return f'Reflects your call for suspense and tension: {title} explores an intense narrative where "{snippet_clean}".'
        else:
            return f'Directly aligns with your search for "{query}": {title} explores compelling themes centered on "{snippet_clean}", offering a distinctive {vibe_summary.lower()} journey.'

    def generate_chat_refinement(
        self,
        messages: list,
        current_state: Dict[str, Any],
    ) -> Tuple[str, Dict[str, Any]]:
        last_msg = messages[-1].content.lower() if messages else ""
        updates: Dict[str, Any] = {"sliders": {}, "filters": {}}
        reply_parts = []

        # Pacing
        if "fast" in last_msg or "thrill" in last_msg or "quicker" in last_msg:
            updates["sliders"]["pacing"] = -0.8
            reply_parts.append("dialed up the pacing for a brisk, page-turning tempo")
        elif "slow" in last_msg or "contemplative" in last_msg or "atmospheric" in last_msg:
            updates["sliders"]["pacing"] = 0.8
            reply_parts.append("shifted toward a slower, more atmospheric burn")

        # Tone / Darkness
        if "dark" in last_msg or "bleak" in last_msg or "gritty" in last_msg or "creepy" in last_msg:
            updates["sliders"]["dark_light"] = -0.8
            reply_parts.append("leaned into darker, more intense tones")
        elif "light" in last_msg or "happy" in last_msg or "wholesome" in last_msg or "uplifting" in last_msg or "cozy" in last_msg:
            updates["sliders"]["dark_light"] = 0.8
            reply_parts.append("brightened the mood with lighter, heartwarming selections")

        # Length / Pages
        if "short" in last_msg or "less pages" in last_msg or "quick read" in last_msg:
            updates["sliders"]["length_scale"] = -0.8
            updates["filters"]["max_pages"] = 300
            reply_parts.append("focused on concise books under 300 pages")
        elif "epic" in last_msg or "long" in last_msg or "thick" in last_msg:
            updates["sliders"]["length_scale"] = 0.8
            reply_parts.append("expanded toward rich, expansive epic volumes")

        # Intellect / Escapism
        if "smart" in last_msg or "philosophical" in last_msg or "cerebral" in last_msg or "deep" in last_msg:
            updates["sliders"]["cerebral_escapist"] = -0.8
            reply_parts.append("highlighted thoughtful, intellectually stimulating books")
        elif "fun" in last_msg or "escapist" in last_msg or "easy" in last_msg:
            updates["sliders"]["cerebral_escapist"] = 0.8
            reply_parts.append("steered toward fun, breezy escapist reads")

        # Combine query
        cur_q = current_state.get("query", "")
        clean_user_keywords = re.sub(r"\b(more|less|something|like|make|it|can|you|please|want|book|books)\b", "", last_msg).strip()
        if clean_user_keywords:
            updates["updated_query"] = f"{cur_q} {clean_user_keywords}".strip()

        if reply_parts:
            reply = f"I've refined your shelf: {' and '.join(reply_parts)}."
        else:
            reply = f"I've adjusted the library catalog to incorporate: \"{last_msg}\"."

        return reply, updates


def get_llm_provider() -> Tuple[BaseLLMProvider, str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key and api_key != "your_gemini_api_key_here":
        try:
            return GeminiProvider(api_key=api_key), "Google Gemini (gemini-2.5-flash)"
        except Exception as e:
            print(f"Failed to initialize GeminiProvider: {e}. Using Offline Fallback.")
    return OfflineFallbackProvider(), "Offline Fallback (Semantic Grounding Engine)"
