import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

class InventoryOptimizer:
    def __init__(self, service_level_z: float = 1.645, default_lead_time_days: int = 7):
        """
        service_level_z: 1.645 corresponds to 95% cycle service level
        default_lead_time_days: average supplier restock turnaround time in India (7 days)
        """
        self.z = service_level_z
        self.default_lead_time = default_lead_time_days

    def optimize_inventory(self, sales_data: List[Dict[str, Any]], lead_time_days: Optional[int] = None) -> Dict[str, Any]:
        if not sales_data:
            return {"items": [], "summary": {}}

        L = lead_time_days or self.default_lead_time
        df = pd.DataFrame(sales_data)

        # Standardize column mappings
        col_map = {
            "Order Date": "order_date",
            "Product ID": "product_id",
            "Product Name": "product_name",
            "Product Category": "category",
            "Quantity": "quantity",
            "Selling Price": "selling_price",
            "Cost Price": "cost_price",
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

        max_date = df["order_date"].max()
        days_span = max(1, (max_date - df["order_date"].min()).days)

        # Group by Product
        prod_groups = df.groupby(["product_id", "product_name", "category"])
        
        inventory_items = []
        dead_stock_items = []
        market_gap_items = []

        total_capital_at_risk = 0.0
        stockout_warning_count = 0

        for (prod_id, prod_name, cat), group in prod_groups:
            total_qty = group["quantity"].sum()
            current_stock = int(group["inventory"].iloc[-1] if "inventory" in group.columns else 50)
            unit_cost = float(group["cost_price"].mean())
            unit_price = float(group["selling_price"].mean())
            
            # Daily sales time series
            daily_sales = group.set_index("order_date").resample("D")["quantity"].sum().fillna(0)
            mean_daily_demand = float(daily_sales.mean())
            std_daily_demand = float(daily_sales.std()) if len(daily_sales) > 1 else 0.5

            # Safety Stock: SS = Z * sigma_d * sqrt(L)
            safety_stock = int(np.ceil(self.z * std_daily_demand * np.sqrt(L)))
            # Reorder Point: ROP = (d_avg * L) + SS
            reorder_point = int(np.ceil((mean_daily_demand * L) + safety_stock))

            # Days of Inventory Remaining (DOIR)
            days_of_stock = round(current_stock / max(0.05, mean_daily_demand), 1)

            # Stockout Risk Probability
            stockout_risk = "Low"
            if current_stock <= safety_stock:
                stockout_risk = "Critical"
                stockout_warning_count += 1
            elif current_stock <= reorder_point:
                stockout_risk = "Moderate"

            # Recommended Replenishment Quantity (EOQ / Target Stock)
            # Aim for 30-day coverage plus safety stock
            target_stock = int(np.ceil((mean_daily_demand * 30) + safety_stock))
            suggested_reorder_qty = max(0, target_stock - current_stock)

            # Dead Stock Risk Calculation
            last_sold_date = group["order_date"].max()
            days_inactive = (max_date - last_sold_date).days
            
            # Trend calculation (last 30d vs prior 30d)
            cutoff_30 = max_date - timedelta(days=30)
            prior_30 = cutoff_30 - timedelta(days=30)
            recent_sales = group[group["order_date"] >= cutoff_30]["quantity"].sum()
            prev_sales = group[(group["order_date"] >= prior_30) & (group["order_date"] < cutoff_30)]["quantity"].sum()
            
            # Dead Stock Score (0-100)
            inactivity_factor = min(50.0, days_inactive * 1.5)
            overstock_factor = min(30.0, (days_of_stock / 90.0) * 30.0) if days_of_stock > 60 else 0.0
            decline_factor = 20.0 if (prev_sales > recent_sales * 2) else 5.0
            
            dead_stock_score = round(min(100.0, inactivity_factor + overstock_factor + decline_factor), 1)
            is_dead_stock = dead_stock_score >= 65 and current_stock > 10

            item_capital_at_risk = round(current_stock * unit_cost, 2)
            if is_dead_stock:
                total_capital_at_risk += item_capital_at_risk
                
                reasons = []
                if days_inactive > 21:
                    reasons.append(f"Zero sales logged in the past {days_inactive} days")
                if days_of_stock > 90:
                    reasons.append(f"Current inventory exceeds {int(days_of_stock)} days of forward demand")
                if recent_sales < prev_sales:
                    reasons.append(f"Sales velocity declined from {prev_sales} to {recent_sales} units")

                actions = []
                if days_of_stock > 120:
                    actions.append("Initiate 20-30% clearance discount or flash bundle sale")
                if len(group["state"].unique()) < 3:
                    actions.append("Expand regional distribution to other states with higher category affinity")
                actions.append("Reallocate warehouse space to high-velocity SKUs")

                dead_stock_items.append({
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "category": cat,
                    "current_stock": current_stock,
                    "unit_cost": unit_cost,
                    "capital_at_risk": item_capital_at_risk,
                    "days_inactive": days_inactive,
                    "dead_stock_score": dead_stock_score,
                    "possible_reasons": reasons,
                    "recommended_actions": actions
                })

            # Check Regional Supply Gaps (Market Gap Detector)
            # Look at regional demand concentration vs local stock availability
            state_breakdown = group.groupby("state")["quantity"].sum().to_dict()
            for st, st_qty in state_breakdown.items():
                st_demand_share = st_qty / max(1, total_qty)
                # If a state accounts for > 25% of demand and overall stock is low
                if st_demand_share >= 0.25 and current_stock < reorder_point:
                    market_gap_items.append({
                        "product_id": prod_id,
                        "product_name": prod_name,
                        "category": cat,
                        "location": st,
                        "regional_demand_units": int(st_qty),
                        "demand_share_pct": round(st_demand_share * 100, 1),
                        "available_inventory": current_stock,
                        "stockout_danger": "High",
                        "opportunity_score": min(95.0, round(70 + st_demand_share * 30, 1)),
                        "gap_type": "Seller Inventory Gap (Demand outstripping available seller stock)",
                        "suggested_action": f"Prioritize regional fulfillment hub in {st} with at least {int(st_qty * 1.5)} units."
                    })

            inventory_items.append({
                "product_id": prod_id,
                "product_name": prod_name,
                "category": cat,
                "current_stock": current_stock,
                "mean_daily_demand": round(mean_daily_demand, 2),
                "demand_std": round(std_daily_demand, 2),
                "safety_stock": safety_stock,
                "reorder_point": reorder_point,
                "days_of_stock": days_of_stock,
                "stockout_risk": stockout_risk,
                "suggested_reorder_qty": suggested_reorder_qty,
                "unit_cost": unit_cost,
                "unit_price": unit_price,
                "total_stock_value": round(current_stock * unit_price, 2),
                "lead_time_days": L
            })

        # Calculate Regional Inventory Transfer Recommendations
        transfers = self.calculate_inventory_transfers(df)

        return {
            "inventory_items": sorted(inventory_items, key=lambda x: x["days_of_stock"]),
            "dead_stock_items": sorted(dead_stock_items, key=lambda x: x["dead_stock_score"], reverse=True),
            "market_gaps": sorted(market_gap_items, key=lambda x: x["opportunity_score"], reverse=True),
            "transfer_recommendations": transfers,
            "recommended_transfers": transfers,
            "summary": {
                "total_skus": len(inventory_items),
                "critical_stockouts": stockout_warning_count,
                "dead_stock_count": len(dead_stock_items),
                "total_capital_at_risk": round(total_capital_at_risk, 2),
                "lead_time_days": L
            }
        }

    def calculate_inventory_transfers(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Recommends smart stock transfers from overstocked/low-demand states to high-demand/undersupplied states.
        """
        if "state" not in df.columns or "product_id" not in df.columns:
            return []

        transfers = []
        prod_states = df.groupby(["product_id", "product_name", "state"])["quantity"].sum().reset_index()

        for prod_id, group in prod_states.groupby("product_id"):
            prod_name = group["product_name"].iloc[0]
            if len(group) < 2:
                continue

            sorted_states = group.sort_values("quantity", ascending=False)
            highest_demand = sorted_states.iloc[0]
            lowest_demand = sorted_states.iloc[-1]

            qty_diff = highest_demand["quantity"] - lowest_demand["quantity"]
            if qty_diff >= 15 and lowest_demand["quantity"] <= 5:
                transfer_qty = int(qty_diff * 0.4)
                transfers.append({
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "source_region": lowest_demand["state"],
                    "destination_region": highest_demand["state"],
                    "recommended_units": transfer_qty,
                    "reason": f"Demand in {highest_demand['state']} ({int(highest_demand['quantity'])} units) significantly outpaces {lowest_demand['state']} ({int(lowest_demand['quantity'])} units).",
                    "estimated_stockout_reduction": "High"
                })

        return transfers[:6]

inventory_optimizer = InventoryOptimizer()
