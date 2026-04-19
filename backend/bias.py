import pandas as pd

def find_target_column(df):
    keywords = ["hired", "selected", "approved", "target", "label", "outcome", "result"]
    
    for col in df.columns:
        for key in keywords:
            if key in col.lower():
                return col

    # fallback → last column
    return df.columns[-1]


def find_sensitive_columns(df):
    keywords = ["gender", "sex", "caste", "race", "age", "group"]

    sensitive_cols = []

    for col in df.columns:
        for key in keywords:
            if key in col.lower():
                sensitive_cols.append(col)

    # fallback → categorical columns
    if not sensitive_cols:
        for col in df.columns:
            if df[col].dtype == "object" and df[col].nunique() <= 10:
                sensitive_cols.append(col)

    return sensitive_cols


def convert_target(df, target):
    # convert yes/no, true/false to 1/0
    if df[target].dtype == "object":
        df[target] = df[target].str.lower()

        df[target] = df[target].map({
            "yes": 1, "no": 0,
            "true": 1, "false": 0,
            "selected": 1, "rejected": 0,
            "pass": 1, "fail": 0
        }).fillna(0)

    return df


def analyze_column_bias(df, sensitive, target):
    groups = df[sensitive].dropna().unique()

    if len(groups) < 2:
        return None

    results = []

    for g in groups:
        group_df = df[df[sensitive] == g]
        rate = group_df[target].mean()
        results.append((g, rate))

    # sort by rate
    results.sort(key=lambda x: x[1], reverse=True)

    g1, r1 = results[0]
    g2, r2 = results[-1]

    bias_score = abs(r1 - r2)
    di = r2 / r1 if r1 != 0 else 0

    return {
        "column": sensitive,
        "group1": str(g1),
        "group2": str(g2),
        "group1_rate": round(r1, 2),
        "group2_rate": round(r2, 2),
        "bias_score": round(bias_score, 2),
        "disparate_impact": round(di, 2)
    }


def detect_bias(df):
    target = find_target_column(df)
    sensitive_cols = find_sensitive_columns(df)

    df = convert_target(df, target)

    all_results = []

    for col in sensitive_cols:
        res = analyze_column_bias(df, col, target)
        if res:
            all_results.append(res)

    if not all_results:
        return {"error": "No bias detected"}

    # pick worst bias
    worst = max(all_results, key=lambda x: x["bias_score"])

    return {
        "target_column": target,
        "sensitive_columns": sensitive_cols,
        "best_column": worst["column"],
        "group1": worst["group1"],
        "group2": worst["group2"],
        "group1_rate": worst["group1_rate"],
        "group2_rate": worst["group2_rate"],
        "bias_score": worst["bias_score"],
        "disparate_impact": worst["disparate_impact"],
        "all_bias": all_results,
        "message": "Bias detected"
    }