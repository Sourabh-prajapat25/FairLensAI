import pandas as pd

def fix_bias_data(df, column, target):
    groups = df[column].unique()

    # get overall rate
    overall = df[target].mean()

    df_fixed = df.copy()

    for g in groups:
        group_df = df_fixed[df_fixed[column] == g]
        current_rate = group_df[target].mean()

        # only adjust slightly toward overall
        adjustment = (overall - current_rate) * 0.5

        df_fixed.loc[df_fixed[column] == g, target] = (
            df_fixed.loc[df_fixed[column] == g, target] + adjustment
        ).clip(0, 1)

    return df_fixed