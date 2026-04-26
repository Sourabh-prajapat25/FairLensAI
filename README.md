# 🚀 FairLens AI

### Detect & Fix Bias in AI Systems

> “Before AI makes decisions about people, FairLens ensures those decisions are fair.”

---

## 🧠 Overview

FairLens AI is a full-stack web application that helps detect, explain, and reduce bias in datasets used for AI systems.

Many real-world AI systems (hiring, loans, healthcare) unknowingly learn biased patterns from historical data. FairLens AI provides a simple, accessible way to audit and improve fairness — even for non-experts.

---

## 🔴 Problem

AI systems today suffer from:

* Hidden bias in datasets
* Unfair outcomes across groups (gender, race, etc.)
* Lack of simple tools to detect and fix bias

👉 This leads to **discrimination at scale**

---

## 🟢 Solution

FairLens AI provides:

* 📤 Upload dataset (CSV)
* 🔍 Automatic bias detection
* 🧠 AI-powered explanation (Gemini)
* 🛠 Bias correction (reweighting)
* 📊 Before vs After comparison
* 📄 Downloadable report

---

## ⚙️ How It Works

### 1. Upload Dataset

User uploads a CSV file.

### 2. Bias Detection

System automatically:

* Detects target column
* Identifies sensitive attributes
* Calculates fairness metrics

Metrics include:

* Demographic Parity
* Equal Opportunity
* Disparate Impact

---

### 3. AI Explanation

Using Gemini API:

Example output:

> “Group A is significantly more likely to be selected than Group B, indicating bias.”

---

### 4. Bias Fix

System applies:

* Reweighting logic
* Balanced adjustments

---

### 5. Comparison

Shows:

* Before vs After bias score
* Improvement percentage
* Visual charts

---

### 6. Report Generation

Download a professional PDF report including:

* Dataset summary
* Bias metrics
* AI explanation
* Fix summary

---

## 🧱 Tech Stack

### Frontend

* HTML, CSS, JavaScript (Vanilla)
* Chart.js
* jsPDF

### Backend

* FastAPI (Python)
* Pandas

### AI

* Google Gemini API (for explanations)

### Deployment

* Frontend → Vercel
* Backend → Render

---

## 🧩 System Architecture

Frontend → FastAPI Backend → Bias Engine → Gemini API → Response

Based on modular architecture described in the system design 

---

## 📁 Project Structure

```
FairLens/
│
├── backend/
│   ├── main.py
│   ├── bias.py
│   ├── fix_bias.py
│   ├── gemini.py
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   ├── styles.css
│
└── requirements.txt
```

---

## 🚀 Live Demo

👉 https://fairlensai.vercel.app/

---

## 💻 Run Locally

### 1. Clone repo

```bash
git clone https://github.com/Sourabh-prajapat25/FairLensAI.git
cd fairlens-ai
```

---

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

---

### 3. Add Gemini API Key

Create `.env` OR set environment variable:

```
GEMINI_API_KEY=your_api_key_here
```

---

### 4. Run Backend

```bash
uvicorn backend.main:app --reload
```

---

### 5. Run Frontend

Open:

```
frontend/index.html
```

Or use Live Server

---

## 🎯 Demo Flow (For Judges)

1. Upload dataset
2. Click Analyze
3. Show bias detection
4. Click Fix Bias
5. Show improvement

👉 Simple, fast, impactful

---

## 📊 Example Output

```json
{
  "bias_score": 0.45,
  "group1": "Male",
  "group2": "Female",
  "disparate_impact": 0.65
}
```

---

## 🔥 Key Features

* ✅ Automatic bias detection
* ✅ AI explanation (human-readable)
* ✅ Bias correction system
* ✅ Before vs After comparison
* ✅ PDF report generation
* ✅ Clean SaaS-style UI

---

## ⚠️ Limitations (Current MVP)

* No user authentication
* Single dataset processing
* In-memory processing (no database)

---

## 🚀 Future Improvements

* Multi-user dashboard
* Dataset history
* Advanced bias mitigation algorithms
* Model-based bias detection
* Cloud storage integration

---

## 💡 Why This Project Stands Out

✔ Real-world problem
✔ AI + Explainability
✔ End-to-end system
✔ Clean UI + working demo
✔ Practical and scalable idea

As described in project concept 

---

## 👨‍💻 Author

**Sourabh Prajapat**

---

## ⭐ Final Note

FairLens AI is not just a tool — it’s a step toward **ethical AI systems**.

