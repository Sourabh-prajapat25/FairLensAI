import requests
import os


def explain_bias(data):
    API_KEY = os.getenv("GEMINI_API_KEY")  # ✅ moved inside

    print("API KEY:", API_KEY)

    if not API_KEY:
        print("❌ GEMINI_API_KEY not found")
        return fallback_explanation(data)

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
            timeout=10
        )

        if response.status_code != 200:
            print("Gemini API error:", response.text)
            return fallback_explanation(data)

        result = response.json()

        candidates = result.get("candidates")
        if not candidates:
            print("No candidates:", result)
            return fallback_explanation(data)

        return candidates[0]["content"]["parts"][0]["text"]

    except Exception as e:
        print("Gemini Exception:", e)
        return fallback_explanation(data)


# 🔥 fallback (VERY IMPORTANT)
def fallback_explanation(data):
    score = data.get("bias_score", 0)
    g1 = data.get("group1", "Group A")
    g2 = data.get("group2", "Group B")

    if score > 0.2:
        return f"High bias detected between {g1} and {g2}. One group is favored significantly."
    else:
        return f"Low bias detected between {g1} and {g2}. The system appears relatively fair."
