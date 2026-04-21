import requests
import os

API_KEY = os.getenv("GEMINI_API_KEY")


def explain_bias(data):
    # ✅ Safety check
    if not API_KEY:
        print("❌ GEMINI_API_KEY not found")
        return "AI explanation not available (API key missing)."

    prompt = f"""
Explain this bias result in simple language:

Sensitive column: {data.get('best_column')}
Groups: {data.get('group1')} vs {data.get('group2')}
Rates: {data.get('group1_rate')} vs {data.get('group2_rate')}
Bias score: {data.get('bias_score')}

Explain in simple, human-friendly terms.
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"

    try:
        response = requests.post(
            url,
            json={
                "contents": [{"parts": [{"text": prompt}]}]
            },
            timeout=10  # ✅ prevent hanging
        )

        # ✅ Handle bad responses
        if response.status_code != 200:
            print("Gemini API error:", response.text)
            return "AI explanation service unavailable."

        result = response.json()

        # ✅ Safe parsing
        candidates = result.get("candidates")
        if not candidates:
            print("No candidates in response:", result)
            return "Could not generate explanation."

        return candidates[0]["content"]["parts"][0]["text"]

    except Exception as e:
        print("Gemini Exception:", e)
        return "AI explanation failed."
