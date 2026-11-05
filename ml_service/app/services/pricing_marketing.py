import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

class PricingMarketingEngine:
    def __init__(self):
        pass

    def analyze_pricing(self, sales_data: List[Dict[str, Any]], product_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculates historical price elasticity of demand and generates interactive
        pricing simulations with revenue and profit curves.
        """
        if not sales_data:
            return {"error": "No sales data available", "simulation": []}

        df = pd.DataFrame(sales_data)
        col_map = {
            "Product ID": "product_id",
            "Product Name": "product_name",
            "Quantity": "quantity",
            "Selling Price": "selling_price",
            "Cost Price": "cost_price"
        }
        for k, v in col_map.items():
            if k in df.columns and v not in df.columns:
                df[v] = df[k]

        df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(1)
        df["selling_price"] = pd.to_numeric(df["selling_price"], errors="coerce").fillna(0)
        df["cost_price"] = pd.to_numeric(df.get("cost_price", 0), errors="coerce").fillna(df["selling_price"] * 0.6)

        if product_id and "product_id" in df.columns:
            target_df = df[df["product_id"] == product_id]
            if len(target_df) == 0:
                target_df = df
        else:
            target_df = df

        base_price = float(target_df["selling_price"].mean())
        base_cost = float(target_df["cost_price"].mean())
        base_volume = float(target_df["quantity"].sum())
        prod_name = target_df["product_name"].iloc[0] if "product_name" in target_df.columns else "All Products"

        # Check price variance to estimate empirical elasticity
        price_std = target_df["selling_price"].std()
        
        has_empirical_elasticity = False
        elasticity_value = -1.25  # standard retail baseline elasticity

        if price_std > (base_price * 0.05) and len(target_df) >= 20:
            # Group by distinct price points
            price_points = target_df.groupby("selling_price")["quantity"].mean().reset_index()
            if len(price_points) >= 3:
                # Log-log regression for price elasticity: ln(Q) = a + e * ln(P)
                from scipy.stats import linregress
                log_p = np.log(price_points["selling_price"] + 1e-5)
                log_q = np.log(price_points["quantity"] + 1e-5)
                res = linregress(log_p, log_q)
                if not np.isnan(res.slope) and -5.0 < res.slope < 0.0:
                    elasticity_value = round(float(res.slope), 2)
                    has_empirical_elasticity = True

        # Generate Simulation curve from -20% to +20% price adjustment in 5% intervals
        simulation_points = []
        best_profit_point = None
        max_sim_profit = -float("inf")

        price_shifts = [-20, -15, -10, -5, 0, 5, 10, 15, 20]
        for pct in price_shifts:
            sim_price = round(base_price * (1 + pct / 100), 2)
            # % change in Q = Elasticity * % change in P
            pct_q_change = elasticity_value * (pct / 100)
            sim_volume = max(0, round(base_volume * (1 + pct_q_change)))
            sim_revenue = round(sim_volume * sim_price, 2)
            sim_cogs = round(sim_volume * base_cost, 2)
            sim_profit = round(sim_revenue - sim_cogs, 2)
            profit_margin_pct = round((sim_profit / max(1.0, sim_revenue)) * 100, 1)

            sim_point = {
                "price_change_pct": pct,
                "simulated_price": sim_price,
                "simulated_volume": sim_volume,
                "simulated_revenue": sim_revenue,
                "simulated_gross_profit": sim_profit,
                "profit_margin_pct": profit_margin_pct
            }
            simulation_points.append(sim_point)

            if sim_profit > max_sim_profit:
                max_sim_profit = sim_profit
                best_profit_point = sim_point

        limitation_note = (
            "Empirical elasticity estimated from historical discounting variations."
            if has_empirical_elasticity
            else "Notice: Historical price variation is narrow. Simulation utilizes an industry-standard moderate elasticity prior (-1.25). As you vary promotional prices over time, empirical precision will automatically calibrate."
        )

        return {
            "product_id": product_id or "PORTFOLIO_AGGREGATE",
            "product_name": prod_name,
            "base_metrics": {
                "base_price": round(base_price, 2),
                "base_cost": round(base_cost, 2),
                "base_volume": int(base_volume),
                "base_revenue": round(base_volume * base_price, 2),
                "base_profit": round(base_volume * (base_price - base_cost), 2),
                "estimated_elasticity": elasticity_value,
                "has_empirical_elasticity": has_empirical_elasticity
            },
            "best_profit_recommendation": best_profit_point,
            "simulation_curve": simulation_points,
            "elasticity_explanation": limitation_note
        }

    def analyze_marketing(self, sales_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes regional advertising performance, conversion rates, CAC, and ROAS.
        """
        if not sales_data:
            return {"campaigns": [], "regional_roas": []}

        df = pd.DataFrame(sales_data)
        col_map = {
            "Product ID": "product_id",
            "Product Name": "product_name",
            "Product Category": "category",
            "Quantity": "quantity",
            "Selling Price": "selling_price",
            "Advertising Spend": "ad_spend",
            "State": "state"
        }
        for k, v in col_map.items():
            if k in df.columns and v not in df.columns:
                df[v] = df[k]

        df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(1)
        df["selling_price"] = pd.to_numeric(df["selling_price"], errors="coerce").fillna(0)
        df["ad_spend"] = pd.to_numeric(df.get("ad_spend", 0), errors="coerce").fillna(0)
        df["revenue"] = df["quantity"] * df["selling_price"]

        # Auto-enrich state from PIN codes if missing
        from .geo_data import geo_service
        if "state" not in df.columns or df["state"].isnull().all():
            states = []
            for pin in df.get("Delivery PIN Code", df.get("pincode", [])):
                geo = geo_service.lookup_pincode(str(pin))
                states.append(geo["state"] if geo else "Unknown")
            df["state"] = states

        total_ad_spend = float(df["ad_spend"].sum())
        total_revenue = float(df["revenue"].sum())
        total_orders = len(df)

        has_ad_data = total_ad_spend > 0

        if not has_ad_data:
            return {
                "has_ad_data": False,
                "message": "No advertising spend was logged in the uploaded sales data. To unlock regional CAC, ROAS, and marketing allocation intelligence, include the optional 'Advertising Spend' column in your CSV/Excel files.",
                "regional_marketing": []
            }

        # Regional marketing breakdown
        regional_perf = []
        for state_val, group in df.groupby("state" if "state" in df.columns else "category"):
            st_spend = float(group["ad_spend"].sum())
            st_rev = float(group["revenue"].sum())
            st_orders = len(group)
            st_units = int(group["quantity"].sum())

            # ROAS = Revenue / Ad Spend
            roas = round(st_rev / max(1.0, st_spend), 2) if st_spend > 0 else 0.0
            # CAC = Ad Spend / Orders
            cac = round(st_spend / max(1, st_orders), 2)

            # Recommendation
            if roas >= 6.0:
                rec = "High ROAS: Strongly recommend increasing ad budget by 20-30% in this market."
            elif roas >= 3.0:
                rec = "Healthy Yield: Maintain active budget and optimize creatives."
            elif roas > 0:
                rec = "Low Efficiency: Refine audience targeting and lower bids to reduce CAC."
            else:
                rec = "Organic Region: No direct ad spend recorded; high organic demand present."

            regional_perf.append({
                "region": str(state_val),
                "ad_spend": round(st_spend, 2),
                "revenue": round(st_rev, 2),
                "orders": st_orders,
                "units_sold": st_units,
                "roas": roas,
                "cac": cac,
                "action_recommendation": rec
            })

        regional_perf.sort(key=lambda x: x["roas"], reverse=True)

        overall_roas = round(total_revenue / max(1.0, total_ad_spend), 2)
        overall_cac = round(total_ad_spend / max(1, total_orders), 2)

        return {
            "has_ad_data": True,
            "overall_metrics": {
                "total_ad_spend": round(total_ad_spend, 2),
                "total_ad_attributed_revenue": round(total_revenue, 2),
                "portfolio_roas": overall_roas,
                "average_cac": overall_cac
            },
            "regional_marketing": regional_perf
        }

pricing_marketing_engine = PricingMarketingEngine()
