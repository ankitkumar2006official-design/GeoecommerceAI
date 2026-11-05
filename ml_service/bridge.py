import sys
import json
import os

# Add ml_service root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.forecaster import demand_forecaster
from app.services.scoring import opportunity_scorer
from app.services.inventory import inventory_optimizer
from app.services.apriori import apriori_engine
from app.services.warehouse import warehouse_advisor
from app.services.pricing_marketing import pricing_marketing_engine

def handle_request(req_type, payload):
    sales_data = payload.get("sales_data", [])

    if req_type == "forecast":
        prod_id = payload.get("product_id")
        horizon = payload.get("horizon_days", 30)
        return demand_forecaster.forecast_product(sales_data, product_id=prod_id, horizon_days=horizon)

    elif req_type == "opportunity":
        group_by = payload.get("group_by", "state")
        results = opportunity_scorer.calculate_scores(sales_data, group_by=group_by)
        return {"results": results, "total_scored": len(results)}

    elif req_type == "inventory":
        lead_time = payload.get("lead_time_days", 7)
        return inventory_optimizer.optimize_inventory(sales_data, lead_time_days=lead_time)

    elif req_type == "bundles":
        return apriori_engine.mine_bundles(sales_data)

    elif req_type == "warehouse":
        curr_wh = payload.get("current_warehouses")
        num_rec = payload.get("num_recommended", 2)
        return warehouse_advisor.optimize_locations(sales_data, current_warehouses=curr_wh, num_recommended=num_rec)

    elif req_type == "pricing":
        prod_id = payload.get("product_id")
        return pricing_marketing_engine.analyze_pricing(sales_data, product_id=prod_id)

    elif req_type == "marketing":
        return pricing_marketing_engine.analyze_marketing(sales_data)

    else:
        return {"error": f"Unknown request type: {req_type}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}))
        sys.exit(1)

    action = sys.argv[1]
    try:
        input_data = sys.stdin.read()
        payload = json.loads(input_data) if input_data.strip() else {}
        result = handle_request(action, payload)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

