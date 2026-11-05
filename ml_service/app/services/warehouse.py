import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from .geo_data import geo_service

class WarehouseAdvisor:
    def __init__(self):
        # Default typical warehouse hub locations in India
        self.preset_hubs = {
            "Bhiwandi (Mumbai Hub)": {"lat": 19.2967, "lng": 73.0631, "state": "Maharashtra"},
            "Gurugram (NCR Hub)": {"lat": 28.4595, "lng": 77.0266, "state": "Haryana"},
            "Hosur (Bengaluru Hub)": {"lat": 12.7409, "lng": 77.8253, "state": "Tamil Nadu / Karnataka Border"},
            "Dankuni (Kolkata Hub)": {"lat": 22.6841, "lng": 88.2933, "state": "West Bengal"},
            "Hyderabad Hub": {"lat": 17.3850, "lng": 78.4867, "state": "Telangana"}
        }

    def optimize_locations(self, sales_data: List[Dict[str, Any]], current_warehouses: Optional[List[str]] = None, num_recommended: int = 2) -> Dict[str, Any]:
        """
        Uses demand-weighted geographical centroid and k-means clustering across
        orders to recommend optimal warehouse placement minimizing total delivery ton-km.
        """
        if not sales_data:
            return {"recommended_hubs": [], "metrics": {}}

        df = pd.DataFrame(sales_data)
        pin_col = "Delivery PIN Code" if "Delivery PIN Code" in df.columns else "pincode"
        qty_col = "Quantity" if "Quantity" in df.columns else "quantity"

        if pin_col not in df.columns:
            return {"recommended_hubs": [], "metrics": {}}

        df["qty"] = pd.to_numeric(df[qty_col], errors="coerce").fillna(1)

        # Attach coordinates
        points = []
        for _, row in df.iterrows():
            pin = str(row[pin_col]).strip().split(".")[0].zfill(6)
            geo = geo_service.lookup_pincode(pin)
            if geo:
                points.append({
                    "lat": geo["lat"],
                    "lng": geo["lng"],
                    "city": geo["city"],
                    "state": geo["state"],
                    "qty": row["qty"]
                })

        if not points:
            return {"recommended_hubs": [], "metrics": {}}

        pts_df = pd.DataFrame(points)

        # Weighted centroid of overall demand
        total_weight = pts_df["qty"].sum()
        weighted_lat = (pts_df["lat"] * pts_df["qty"]).sum() / total_weight
        weighted_lng = (pts_df["lng"] * pts_df["qty"]).sum() / total_weight

        # Current default baseline: single warehouse in Gurugram (NCR) if none provided
        current_hubs = current_warehouses or ["Gurugram (NCR Hub)"]
        curr_coords = [self.preset_hubs[h] for h in current_hubs if h in self.preset_hubs]
        if not curr_coords:
            curr_coords = [self.preset_hubs["Gurugram (NCR Hub)"]]

        # Calculate current baseline total delivery distance
        curr_total_dist = 0.0
        for _, pt in pts_df.iterrows():
            # Min distance to any active current warehouse
            dists = [geo_service.haversine_distance(pt["lat"], pt["lng"], c["lat"], c["lng"]) for c in curr_coords]
            curr_total_dist += min(dists) * pt["qty"]

        avg_curr_dist = curr_total_dist / total_weight

        # K-Means clustering (k = num_recommended) to partition orders into optimal regional fulfillment clusters
        from sklearn.cluster import KMeans
        k = max(1, min(num_recommended, len(pts_df)))
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(pts_df[["lat", "lng"]], sample_weight=pts_df["qty"])

        cluster_centers = kmeans.cluster_centers_

        recommended_hubs = []
        for i, center in enumerate(cluster_centers):
            c_lat, c_lng = center[0], center[1]
            # Find closest recognized commercial hub or city
            closest_hub_name = None
            min_h_dist = float("inf")
            for h_name, h_info in self.preset_hubs.items():
                d = geo_service.haversine_distance(c_lat, c_lng, h_info["lat"], h_info["lng"])
                if d < min_h_dist:
                    min_h_dist = d
                    closest_hub_name = h_name

            # Cluster demand share
            cluster_mask = kmeans.labels_ == i
            cluster_orders = int(pts_df[cluster_mask]["qty"].sum())
            cluster_share = round((cluster_orders / total_weight) * 100, 1)

            recommended_hubs.append({
                "cluster_index": i + 1,
                "recommended_location": closest_hub_name or f"Optimized Hub near Lat {round(c_lat, 2)}, Lng {round(c_lng, 2)}",
                "center_lat": round(float(c_lat), 4),
                "center_lng": round(float(c_lng), 4),
                "demand_share_pct": cluster_share,
                "served_units": cluster_orders,
                "regional_focus": self.preset_hubs.get(closest_hub_name, {}).get("state", "Regional Belt")
            })

        # Calculate proposed total delivery distance with recommended hubs
        prop_coords = [{"lat": h["center_lat"], "lng": h["center_lng"]} for h in recommended_hubs]
        prop_total_dist = 0.0
        for _, pt in pts_df.iterrows():
            dists = [geo_service.haversine_distance(pt["lat"], pt["lng"], p["lat"], p["lng"]) for p in prop_coords]
            prop_total_dist += min(dists) * pt["qty"]

        avg_prop_dist = prop_total_dist / total_weight
        distance_reduction_pct = max(0.0, round(((avg_curr_dist - avg_prop_dist) / avg_curr_dist) * 100, 1))

        # Shipping cost estimate (approx ₹0.08 per km per order in India)
        est_cost_savings = round((curr_total_dist - prop_total_dist) * 0.08, 2)

        return {
            "current_configuration": {
                "active_warehouses": current_hubs,
                "avg_delivery_distance_km": round(avg_curr_dist, 1),
                "total_ton_km_estimate": round(curr_total_dist, 1)
            },
            "optimized_recommendation": {
                "recommended_hubs": recommended_hubs,
                "avg_delivery_distance_km": round(avg_prop_dist, 1),
                "distance_reduction_pct": distance_reduction_pct,
                "estimated_shipping_savings_inr": est_cost_savings,
                "speed_to_customer_improvement": f"Estimated ~{int(distance_reduction_pct * 0.45)}% faster last-mile transit"
            },
            "overall_demand_centroid": {
                "lat": round(float(weighted_lat), 4),
                "lng": round(float(weighted_lng), 4)
            },
            "disclaimer": "Logistics estimates are calculated from great-circle distances and regional density weights. Actual road network transit times depend on 3PL carrier contracts."
        }

warehouse_advisor = WarehouseAdvisor()

