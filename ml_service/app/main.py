from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from .services.geo_data import geo_service
from .services.forecaster import demand_forecaster
from .services.scoring import opportunity_scorer
from .services.inventory import inventory_optimizer
from .services.apriori import apriori_engine
from .services.warehouse import warehouse_advisor
from .services.pricing_marketing import pricing_marketing_engine

app = FastAPI(
    title="GeoCommerce AI - Machine Learning & Regional Intelligence Service",
    description="Time-series demand forecasting, explainable opportunity scoring, inventory optimization, and logistics analytics.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Request Models
class ForecastRequest(BaseModel):
    sales_data: List[Dict[str, Any]]
    product_id: Optional[str] = None
    horizon_days: Optional[int] = 30

class OpportunityRequest(BaseModel):
    sales_data: List[Dict[str, Any]]
    group_by: Optional[str] = "state"

class InventoryRequest(BaseModel):
    sales_data: List[Dict[str, Any]]
    lead_time_days: Optional[int] = 7

class BundleRequest(BaseModel):
    sales_data: List[Dict[str, Any]]

class WarehouseRequest(BaseModel):
    sales_data: List[Dict[str, Any]]
    current_warehouses: Optional[List[str]] = None
    num_recommended: Optional[int] = 2

class PricingRequest(BaseModel):
    sales_data: List[Dict[str, Any]]
    product_id: Optional[str] = None

class MarketingRequest(BaseModel):
    sales_data: List[Dict[str, Any]]

class PincodeBatchRequest(BaseModel):
    pincodes: List[str]


@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GeoCommerce AI - ML Service",
        "python_modules": {
            "forecaster": "ready",
            "scoring": "ready",
            "inventory": "ready",
            "apriori": "ready",
            "warehouse": "ready",
            "geo_pincodes_loaded": len(geo_service.pincodes)
        }
    }


@app.post("/api/ml/forecast")
def get_forecast(req: ForecastRequest):
    try:
        res = demand_forecaster.forecast_product(
            sales_data=req.sales_data,
            product_id=req.product_id,
            horizon_days=req.horizon_days or 30
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/opportunity")
@app.post("/api/ml/opportunity-score")
def get_opportunity_scores(req: OpportunityRequest):
    try:
        res = opportunity_scorer.calculate_scores(
            sales_data=req.sales_data,
            group_by=req.group_by or "state"
        )
        return {"results": res, "total_scored": len(res)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/inventory")
@app.post("/api/ml/inventory-optimizer")
def get_inventory_recommendations(req: InventoryRequest):
    try:
        res = inventory_optimizer.optimize_inventory(
            sales_data=req.sales_data,
            lead_time_days=req.lead_time_days or 7
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/bundles")
def get_product_bundles(req: BundleRequest):
    try:
        res = apriori_engine.mine_bundles(sales_data=req.sales_data)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/warehouse-optimizer")
def get_warehouse_recommendations(req: WarehouseRequest):
    try:
        res = warehouse_advisor.optimize_locations(
            sales_data=req.sales_data,
            current_warehouses=req.current_warehouses,
            num_recommended=req.num_recommended or 2
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/pricing")
def get_pricing_intelligence(req: PricingRequest):
    try:
        res = pricing_marketing_engine.analyze_pricing(
            sales_data=req.sales_data,
            product_id=req.product_id
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/marketing")
def get_marketing_intelligence(req: MarketingRequest):
    try:
        res = pricing_marketing_engine.analyze_marketing(sales_data=req.sales_data)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/pincode-lookup")
def lookup_pincodes(req: PincodeBatchRequest):
    results = {}
    for pin in req.pincodes:
        results[pin] = geo_service.lookup_pincode(pin)
    return {"pincodes": results}

