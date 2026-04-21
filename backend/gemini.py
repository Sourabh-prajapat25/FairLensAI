import requests
import os

API_KEY = os.getenv("GEMINI_API_KEY")


def explain_bias(data):
    prompt = f"""
    Explain this bias result in simple language:

    Sensitive column: {data.get('best_column')}
    Groups: {data.get('group1')} vs {data.get('group2')}
    Rates: {data.get('group1_rate')} vs {data.get('group2_rate')}
    Bias score: {data.get('bias_score')}

    Explain like a normal person can understand.
    """

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"

    response = requests.post(url, json={
        "contents": [{"parts": [{"text": prompt}]}]
    })

    result = response.json()

    try:
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except:
        return "Could not generate explanation"
