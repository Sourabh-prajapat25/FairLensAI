from fastapi import FastAPI, File, UploadFile
import pandas as pd

from backend.bias import detect_bias
from backend.fix_bias import fix_bias_data
from backend.gemini import explain_bias

from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import FileResponse

app = FastAPI()

df_global = None

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    global df_global
    df_global = pd.read_csv(file.file)
    app.state.file_name = file.filename

    return {"message": "File uploaded successfully"}

@app.get("/analyze")
def analyze():
    global df_global

    result = detect_bias(df_global)

    # ✅ ADD THESE
    result["rows"] = len(df_global)
    result["columns"] = len(df_global.columns)
    result["file_name"] = getattr(app.state, "file_name", "Dataset")

    explanation = explain_bias(result)
    result["explanation"] = explanation

    return result


@app.get("/fix")
def fix():
    global df_global

    result = detect_bias(df_global)

    col = result["best_column"]
    target = result["target_column"]

    df_fixed = fix_bias_data(df_global.copy(), col, target)
    fixed_result = detect_bias(df_fixed)

    # ✅ ADD THESE
    fixed_result["rows"] = len(df_fixed)
    fixed_result["columns"] = len(df_fixed.columns)
    fixed_result["file_name"] = "Fixed Dataset"

    return fixed_result

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





from fastapi.responses import FileResponse
import os

@app.get("/download")
def download():
    global df_global

    if df_global is None:
        return {"error": "No dataset uploaded"}

    from bias import detect_bias
    from fix_bias import fix_bias_data

    result = detect_bias(df_global)

    col = result["best_column"]
    target = result["target_column"]

    df_fixed = fix_bias_data(df_global.copy(), col, target)

    file_path = "fixed_output.csv"
    df_fixed.to_csv(file_path, index=False)

    if not os.path.exists(file_path):
        return {"error": "File not created"}

    return FileResponse(
        path=file_path,
        filename="fixed_dataset.csv",
        media_type="text/csv"
    )
