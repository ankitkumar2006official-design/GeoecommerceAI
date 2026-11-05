import json
import math
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

class GeoService:
    def __init__(self, geo_file_path: Optional[str] = None):
        if not geo_file_path:
            # Look in parent data directory
            p = Path(__file__).resolve().parent.parent.parent.parent / "data" / "pincode_india_directory.json"
            if not p.exists():
                p = Path("data/pincode_india_directory.json")
            geo_file_path = str(p)
            
        try:
            with open(geo_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.pincodes: Dict[str, Dict[str, Any]] = data.get("pincodes", {})
                self.state_centroids: Dict[str, Dict[str, Any]] = data.get("state_centroids", {})
        except Exception as e:
            self.pincodes = {}
            self.state_centroids = {}
            print(f"Warning: could not load geo_data from {geo_file_path}: {e}")

    def lookup_pincode(self, pincode: str) -> Optional[Dict[str, Any]]:
        clean_pin = str(pincode).strip().split(".")[0].zfill(6)
        if clean_pin in self.pincodes:
            res = dict(self.pincodes[clean_pin])
            res["pincode"] = clean_pin
            return res
        return None

    def get_state_centroid(self, state: str) -> Optional[Dict[str, float]]:
        return self.state_centroids.get(state)

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance in kilometers between two points on Earth."""
        R = 6371.0  # Earth radius in kilometers
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0)**2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

geo_service = GeoService()

