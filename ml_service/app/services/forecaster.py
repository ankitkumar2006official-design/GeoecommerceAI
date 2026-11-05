import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error

class DemandForecaster:
    def __init__(self):
        pass

    def build_time_series_features(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        df = daily_df.copy()
        df = df.sort_values("date").reset_index(drop=True)
        
        # Lag features
        for lag in [1, 2, 7, 14]:
            df[f"lag_{lag}"] = df["quantity"].shift(lag)
            
        # Rolling features (shift by 1 to prevent data leakage)
        df["roll_mean_7"] = df["quantity"].shift(1).rolling(window=7, min_periods=1).mean()
        df["roll_mean_14"] = df["quantity"].shift(1).rolling(window=14, min_periods=1).mean()
        df["roll_std_7"] = df["quantity"].shift(1).rolling(window=7, min_periods=1).std().fillna(0)
        
        # Calendar features
        df["day_of_week"] = df["date"].dt.dayofweek
        df["day_of_month"] = df["date"].dt.day
        df["month"] = df["date"].dt.month
        df["is_weekend"] = df["day_of_week"].apply(lambda x: 1 if x >= 5 else 0)
        # Indian festive season indicator (Diwali/Navratri/Puja surge in Oct-Nov)
        df["is_festive"] = df["month"].apply(lambda m: 1 if m in [10, 11] else 0)
        
        # Drop rows where lag_14 is NaN
        df = df.dropna().reset_index(drop=True)
        return df

    def forecast_product(self, sales_data: List[Dict[str, Any]], product_id: Optional[str] = None, horizon_days: int = 30) -> Dict[str, Any]:
        if not sales_data:
            return {"error": "No sales data provided", "insufficient_data": True}

        raw_df = pd.DataFrame(sales_data)
        
        # Required columns check
        req_cols = ["Order Date", "Quantity"]
        for col in req_cols:
            if col not in raw_df.columns:
                # Try lowercase/underscore equivalents
                alt_col = col.lower().replace(" ", "_")
                if alt_col in raw_df.columns:
                    raw_df[col] = raw_df[alt_col]
                else:
                    return {"error": f"Missing column: {col}", "insufficient_data": True}

        # Filter by product if specified
        if product_id and "Product ID" in raw_df.columns:
            prod_df = raw_df[raw_df["Product ID"] == product_id].copy()
            if len(prod_df) == 0:
                return {"error": f"No data found for product {product_id}", "insufficient_data": True}
        else:
            prod_df = raw_df.copy()

        # Parse dates
        prod_df["date"] = pd.to_datetime(prod_df["Order Date"], errors="coerce")
        prod_df = prod_df.dropna(subset=["date"])
        
        if len(prod_df) < 15:
            return {
                "error": "Insufficient historical data for reliable machine learning forecast. Need at least 15 sales records.",
                "insufficient_data": True,
                "record_count": len(prod_df)
            }

        # Daily demand aggregation
        daily = prod_df.groupby("date")["Quantity"].sum().reset_index()
        daily = daily.rename(columns={"Quantity": "quantity"})
        
        # Ensure full continuous date range by filling missing dates with 0
        min_date = daily["date"].min()
        max_date = daily["date"].max()
        all_dates = pd.date_range(start=min_date, end=max_date, freq="D")
        daily = daily.set_index("date").reindex(all_dates, fill_value=0).reset_index()
        daily = daily.rename(columns={"index": "date"})

        if len(daily) < 15:
            return {
                "error": "Time span of sales data is under 15 days. Insufficient for ML time-series modeling.",
                "insufficient_data": True,
                "days_span": len(daily)
            }

        # Feature engineering
        feat_df = self.build_time_series_features(daily)
        if len(feat_df) < 10:
            return {
                "error": "Not enough data points after lag construction.",
                "insufficient_data": True
            }

        feature_cols = [
            "lag_1", "lag_2", "lag_7", "lag_14",
            "roll_mean_7", "roll_mean_14", "roll_std_7",
            "day_of_week", "day_of_month", "month", "is_weekend", "is_festive"
        ]

        X = feat_df[feature_cols]
        y = feat_df["quantity"]

        # Time-based train-test split (last 20% as test, without shuffling to prevent lookahead)
        split_idx = int(len(feat_df) * 0.8)
        if split_idx < 5:
            split_idx = len(feat_df) - 3

        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Baseline Model: 7-day rolling average persistence
        baseline_preds = X_test["roll_mean_7"].values
        baseline_mae = float(mean_absolute_error(y_test, baseline_preds))
        baseline_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_preds)))

        # Train Gradient Boosting Regressor
        model = GradientBoostingRegressor(n_estimators=60, max_depth=3, random_state=42, learning_rate=0.08)
        model.fit(X_train, y_train)

        test_preds = np.clip(model.predict(X_test), 0, None)
        model_mae = float(mean_absolute_error(y_test, test_preds))
        model_rmse = float(np.sqrt(mean_squared_error(y_test, test_preds)))

        # Feature importances
        importances = dict(zip(feature_cols, [round(float(v), 4) for v in model.feature_importances_]))

        # Retrain on full dataset for future forecasting
        model.fit(X, y)

        # Multi-step autoregressive future forecasting
        future_forecasts = []
        last_known = daily.copy()
        
        current_date = max_date
        confidence_bound = max(1.0, 1.96 * model_rmse)

        for step in range(1, horizon_days + 1):
            next_date = current_date + timedelta(days=step)
            
            # Compute lags from extended series
            lag_1 = last_known.iloc[-1]["quantity"]
            lag_2 = last_known.iloc[-2]["quantity"] if len(last_known) >= 2 else lag_1
            lag_7 = last_known.iloc[-7]["quantity"] if len(last_known) >= 7 else lag_1
            lag_14 = last_known.iloc[-14]["quantity"] if len(last_known) >= 14 else lag_7
            
            tail_7 = last_known.iloc[-7:]["quantity"]
            tail_14 = last_known.iloc[-14:]["quantity"] if len(last_known) >= 14 else tail_7
            
            roll_mean_7 = float(tail_7.mean())
            roll_mean_14 = float(tail_14.mean())
            roll_std_7 = float(tail_7.std()) if len(tail_7) > 1 else 0.0

            row_features = pd.DataFrame([{
                "lag_1": lag_1,
                "lag_2": lag_2,
                "lag_7": lag_7,
                "lag_14": lag_14,
                "roll_mean_7": roll_mean_7,
                "roll_mean_14": roll_mean_14,
                "roll_std_7": roll_std_7,
                "day_of_week": next_date.dayofweek,
                "day_of_month": next_date.day,
                "month": next_date.month,
                "is_weekend": 1 if next_date.dayofweek >= 5 else 0,
                "is_festive": 1 if next_date.month in [10, 11] else 0
            }])

            pred_qty = max(0.0, float(model.predict(row_features)[0]))
            
            # Slight widening confidence band as forecast horizon expands
            horizon_spread = confidence_bound * (1 + 0.015 * step)
            lower_bound = max(0.0, round(pred_qty - horizon_spread, 1))
            upper_bound = round(pred_qty + horizon_spread, 1)

            future_forecasts.append({
                "date": next_date.strftime("%Y-%m-%d"),
                "predicted_quantity": round(pred_qty, 1),
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
                "day_name": next_date.strftime("%a")
            })

            # Append prediction to history for next recursive step
            new_row = pd.DataFrame([{"date": next_date, "quantity": pred_qty}])
            last_known = pd.concat([last_known, new_row], ignore_index=True)

        # Aggregate total forecast summaries
        forecast_total_units = round(sum(f["predicted_quantity"] for f in future_forecasts), 1)
        forecast_7d = round(sum(f["predicted_quantity"] for f in future_forecasts[:7]), 1)
        forecast_30d = round(sum(f["predicted_quantity"] for f in future_forecasts[:30]), 1)
        forecast_90d = round(sum(f["predicted_quantity"] for f in future_forecasts[:min(90, len(future_forecasts))]), 1)

        # Recent historical 30d sum for comparison
        historical_last_30d = float(daily.iloc[-30:]["quantity"].sum()) if len(daily) >= 30 else float(daily["quantity"].sum())
        growth_30d_pct = round(((forecast_30d - historical_last_30d) / max(1.0, historical_last_30d)) * 100, 2)

        # Historical curve (last 45 days) for frontend chart display
        historical_chart_data = [
            {"date": row["date"].strftime("%Y-%m-%d"), "actual_quantity": float(row["quantity"])}
            for _, row in daily.iloc[-45:].iterrows()
        ]

        return {
            "product_id": product_id or "ALL_PRODUCTS",
            "horizon_days": horizon_days,
            "metrics": {
                "model_mae": round(model_mae, 3),
                "model_rmse": round(model_rmse, 3),
                "baseline_mae": round(baseline_mae, 3),
                "baseline_rmse": round(baseline_rmse, 3),
                "accuracy_improvement_pct": round(max(0.0, (baseline_rmse - model_rmse) / max(0.001, baseline_rmse) * 100), 2)
            },
            "feature_importances": importances,
            "aggregates": {
                "forecast_total_units": forecast_total_units,
                "forecast_7d": forecast_7d,
                "forecast_30d": forecast_30d,
                "forecast_90d": forecast_90d,
                "growth_30d_pct": growth_30d_pct,
                "historical_last_30d": round(historical_last_30d, 1)
            },
            "forecasts": future_forecasts,
            "historical_data": historical_chart_data
        }

demand_forecaster = DemandForecaster()

