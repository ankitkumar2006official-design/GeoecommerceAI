import numpy as np
import pandas as pd
from typing import Dict, Any, List
from datetime import datetime, timedelta

class OpportunityScorer:
    def __init__(self):
        # Explainable factor weights summing to 1.0
        self.weights = {
            "demand_volume": 0.25,
            "demand_growth": 0.20,
            "profit_margin": 0.20,
            "sales_consistency": 0.15,
            "inventory_coverage": 0.10,
            "low_return_bonus": 0.05,
            "low_cancellation_bonus": 0.05
        }

    def calculate_scores(self, sales_data: List[Dict[str, Any]], group_by: str = "state") -> List[Dict[str, Any]]:
        """
        Calculates explainable regional opportunity scores for product x location pairs.
        group_by can be 'state', 'city', or 'pincode'.
        """
        if not sales_data:
            return []

        df = pd.DataFrame(sales_data)
        
        # Standardize column names
        col_map = {
            "Order Date": "order_date",
            "Product ID": "product_id",
            "Product Name": "product_name",
            "Product Category": "category",
            "Quantity": "quantity",
            "Selling Price": "selling_price",
            "Cost Price": "cost_price",
            "Return Status": "return_status",
            "Cancellation Status": "cancellation_status",
            "Inventory Quantity": "inventory",
            "Delivery PIN Code": "pincode",
            "State": "state",
            "City": "city"
        }
        for k, v in col_map.items():
            if k in df.columns and v not in df.columns:
                df[v] = df[k]

        df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(1)
        df["selling_price"] = pd.to_numeric(df["selling_price"], errors="coerce").fillna(0)
        df["cost_price"] = pd.to_numeric(df.get("cost_price", 0), errors="coerce").fillna(df["selling_price"] * 0.6)
        df["inventory"] = pd.to_numeric(df.get("inventory", 50), errors="coerce").fillna(50)
        df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")

        # Auto-enrich state and city from PIN codes if missing
        from .geo_data import geo_service
        if "state" not in df.columns or df["state"].isnull().all():
            states, cities = [], []
            for pin in df.get("pincode", []):
                geo = geo_service.lookup_pincode(str(pin))
                states.append(geo["state"] if geo else "Unknown")
                cities.append(geo["city"] if geo else "Unknown")
            df["state"] = states
            df["city"] = cities

        # Determine location column
        loc_col = group_by if group_by in df.columns else "state"
        if loc_col not in df.columns:
            loc_col = "pincode" if "pincode" in df.columns else "product_id"

        # Time split for growth calculation (most recent 60 days vs prior 60 days)
        max_date = df["order_date"].max()
        cutoff_date = max_date - timedelta(days=60)
        prior_cutoff = cutoff_date - timedelta(days=60)

        # Group by product x location
        grouped = df.groupby(["product_id", "product_name", "category", loc_col])

        scored_results = []

        max_volume = 1
        # Pre-pass to find global max volume for normalization
        for _, group in grouped:
            v = group["quantity"].sum()
            if v > max_volume:
                max_volume = v

        for (prod_id, prod_name, cat, loc_val), group in grouped:
            total_orders = len(group)
            total_qty = group["quantity"].sum()
            total_revenue = (group["quantity"] * group["selling_price"]).sum()
            avg_cost = group["cost_price"].mean()
            avg_price = group["selling_price"].mean()
            current_inventory = group["inventory"].iloc[-1] if "inventory" in group.columns else 50

            # 1. Demand Volume factor (0-100)
            f_volume = min(100.0, (total_qty / max(1.0, max_volume)) * 100.0)

            # 2. Demand Growth factor (0-100)
            recent_qty = group[group["order_date"] >= cutoff_date]["quantity"].sum()
            prior_qty = group[(group["order_date"] >= prior_cutoff) & (group["order_date"] < cutoff_date)]["quantity"].sum()
            
            if prior_qty > 0:
                growth_rate = (recent_qty - prior_qty) / prior_qty
                f_growth = min(100.0, max(0.0, (growth_rate + 0.5) * 66.6))  # 0% growth gives ~33.3, 100% growth gives 100
            else:
                f_growth = 75.0 if recent_qty > 0 else 30.0

            # 3. Profit Margin factor (0-100)
            margin = (avg_price - avg_cost) / max(1.0, avg_price) if avg_price > 0 else 0.4
            margin_pct = round(margin * 100, 1)
            f_margin = min(100.0, max(0.0, margin * 166.6)) # 60% margin = 100 score

            # 4. Sales Consistency factor (0-100)
            weekly_counts = group.set_index("order_date").resample("W")["quantity"].sum().fillna(0)
            if len(weekly_counts) > 2 and weekly_counts.mean() > 0:
                cv = weekly_counts.std() / weekly_counts.mean() # lower CV is more consistent
                f_consistency = min(100.0, max(10.0, 100.0 - (cv * 30.0)))
            else:
                f_consistency = 50.0

            # 5. Inventory Coverage (0-100)
            # High score if inventory adequately covers forecasted 30-day run rate without stockout
            monthly_run_rate = max(1.0, recent_qty * 0.5) if recent_qty > 0 else max(1.0, total_qty / 3.0)
            coverage_ratio = current_inventory / monthly_run_rate
            if coverage_ratio >= 1.0 and coverage_ratio <= 2.5:
                f_inventory = 100.0 # optimal coverage
            elif coverage_ratio < 1.0:
                f_inventory = max(10.0, coverage_ratio * 90.0) # stockout danger
            else:
                f_inventory = max(30.0, 100.0 - (coverage_ratio - 2.5) * 15.0) # overstocked penalty

            # 6. Returns and Cancellations penalties
            returns = group["return_status"].astype(str).str.lower().isin(["returned", "yes", "true"]).sum()
            return_rate = returns / max(1, total_orders)
            f_return = max(0.0, 100.0 - (return_rate * 400.0)) # 10% return rate gives 60

            cancels = group["cancellation_status"].astype(str).str.lower().isin(["cancelled", "yes", "true"]).sum()
            cancel_rate = cancels / max(1, total_orders)
            f_cancel = max(0.0, 100.0 - (cancel_rate * 500.0))

            # Weighted Aggregate Opportunity Score (0-100)
            opp_score = (
                self.weights["demand_volume"] * f_volume +
                self.weights["demand_growth"] * f_growth +
                self.weights["profit_margin"] * f_margin +
                self.weights["sales_consistency"] * f_consistency +
                self.weights["inventory_coverage"] * f_inventory +
                self.weights["low_return_bonus"] * f_return +
                self.weights["low_cancellation_bonus"] * f_cancel
            )
            opp_score = round(float(np.clip(opp_score, 0, 100)), 1)

            # Confidence Level
            if total_orders >= 20:
                confidence = "High"
            elif total_orders >= 8:
                confidence = "Moderate"
            else:
                confidence = "Speculative"

            # Recommended Action determination
            if opp_score >= 80 and coverage_ratio < 1.2:
                action = f"Prime Growth Hotspot: Expedite inventory restock by {int(monthly_run_rate * 1.5)} units to prevent stockouts."
            elif opp_score >= 80:
                action = "High Yield Region: Boost targeted regional ad campaigns to capture surging demand."
            elif opp_score >= 65 and margin_pct > 40:
                action = "Profitable Opportunity: Test a 5% promotional discount or regional bundle to lift volume."
            elif coverage_ratio > 3.5:
                action = "Overstocked Notice: Implement flash discount or initiate inter-warehouse transfer to higher demand cluster."
            elif return_rate > 0.15:
                action = "Quality Audit Warning: High return rate in this region; inspect courier damage and sizing guidelines."
            else:
                action = "Maintain Baseline: Monitor weekly demand velocity before committing additional warehouse capital."

            contributing_factors = [
                {"factor": "Historical Demand Volume", "score": round(f_volume, 1), "weight": self.weights["demand_volume"]},
                {"factor": "Recent Demand Growth", "score": round(f_growth, 1), "weight": self.weights["demand_growth"]},
                {"factor": "Profit Margin", "score": round(f_margin, 1), "weight": self.weights["profit_margin"]},
                {"factor": "Sales Consistency", "score": round(f_consistency, 1), "weight": self.weights["sales_consistency"]},
                {"factor": "Inventory Coverage", "score": round(f_inventory, 1), "weight": self.weights["inventory_coverage"]},
                {"factor": "Low Return Quality", "score": round(f_return, 1), "weight": self.weights["low_return_bonus"]},
                {"factor": "Order Fulfillment Integrity", "score": round(f_cancel, 1), "weight": self.weights["low_cancellation_bonus"]}
            ]

            scored_results.append({
                "product_id": prod_id,
                "product_name": prod_name,
                "category": cat,
                "location_type": loc_col,
                "location": str(loc_val),
                "opportunity_score": opp_score,
                "confidence": confidence,
                "total_orders": int(total_orders),
                "units_sold": int(total_qty),
                "revenue": round(float(total_revenue), 2),
                "profit_margin_pct": margin_pct,
                "return_rate_pct": round(return_rate * 100, 1),
                "cancellation_rate_pct": round(cancel_rate * 100, 1),
                "current_inventory": int(current_inventory),
                "recommended_action": action,
                "contributing_factors": contributing_factors
            })

        # Sort descending by opportunity score
        scored_results.sort(key=lambda x: x["opportunity_score"], reverse=True)
        return scored_results

opportunity_scorer = OpportunityScorer()
