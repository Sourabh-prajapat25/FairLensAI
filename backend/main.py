from fastapi import FastAPI, File, UploadFile
import pandas as pd
from backend.bias import detect_bias
from backend.fix_bias import fix_bias_data
from backend.gemini import explain_bias
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os

app = FastAPI()

df_global = None
file_name = "dataset.csv"


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    global df_global, file_name

    try:
        df_global = pd.read_csv(file.file)
        file_name = file.filename

        return {"message": "File uploaded successfully"}
    except Exception as e:
        return {"error": str(e)}



@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        df = pd.read_csv(file.file)

        result = detect_bias(df)

        result["rows"] = len(df)
        result["columns"] = len(df.columns)
        result["file_name"] = file.filename

        explanation = explain_bias(result)
        result["explanation"] = explanation

        return result

    except Exception as e:
        return {"error": str(e)}

@app.get("/fix")
def fix():
    global df_global

    if df_global is None:
        return {"error": "No dataset uploaded"}

    try:
        result = detect_bias(df_global)

        col = result["best_column"]
        target = result["target_column"]

        df_fixed = fix_bias_data(df_global.copy(), col, target)
        fixed_result = detect_bias(df_fixed)

        fixed_result["rows"] = len(df_fixed)
        fixed_result["columns"] = len(df_fixed.columns)
        fixed_result["file_name"] = "Fixed Dataset"

        return fixed_result

    except Exception as e:
        return {"error": str(e)}


@app.get("/download")
def download():
    global df_global

    if df_global is None:
        return {"error": "No dataset uploaded"}

    try:
        result = detect_bias(df_global)

        col = result["best_column"]
        target = result["target_column"]

        df_fixed = fix_bias_data(df_global.copy(), col, target)

        file_path = "fixed_output.csv"
        df_fixed.to_csv(file_path, index=False)

        return FileResponse(
            path=file_path,
            filename="fixed_dataset.csv",
            media_type="text/csv"
        )

    except Exception as e:
        return {"error": str(e)}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
