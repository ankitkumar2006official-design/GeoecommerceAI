import csv
import random
from datetime import datetime, timedelta
import json
import os

# Set seed for reproducible generation
random.seed(42)

with open("data/pincode_india_directory.json", "r", encoding="utf-8") as f:
    geo_data = json.load(f)

pincodes = list(geo_data["pincodes"].keys())

PRODUCTS = [
    # Electronics
    {"id": "PROD-E101", "name": "AcousticBass Wireless Earbuds", "category": "Electronics", "cost": 750, "price": 1499, "stock": 180, "weight": 0.2},
    {"id": "PROD-E102", "name": "PowerCore 20000mAh Fast Power Bank", "category": "Electronics", "cost": 890, "price": 1799, "stock": 95, "weight": 0.45},
    {"id": "PROD-E103", "name": "PulseFit Pro Smartwatch (AMOLED)", "category": "Electronics", "cost": 1250, "price": 2499, "stock": 60, "weight": 0.15},
    {"id": "PROD-E104", "name": "KeyTech RGB Mechanical Keyboard", "category": "Electronics", "cost": 1600, "price": 2999, "stock": 40, "weight": 0.85},
    {"id": "PROD-E105", "name": "HyperSync 7-in-1 USB-C Hub", "category": "Electronics", "cost": 950, "price": 1899, "stock": 25, "weight": 0.25},

    # Fashion
    {"id": "PROD-F201", "name": "UrbanCraft Men's Slim Fit Chinos", "category": "Fashion", "cost": 420, "price": 999, "stock": 140, "weight": 0.5},
    {"id": "PROD-F202", "name": "VedicWeave Embroidered Cotton Kurti", "category": "Fashion", "cost": 340, "price": 849, "stock": 210, "weight": 0.3},
    {"id": "PROD-F203", "name": "AeroStride Breathable Running Shoes", "category": "Fashion", "cost": 850, "price": 1899, "stock": 85, "weight": 0.75},
    {"id": "PROD-F204", "name": "StreetStyle Unisex Oversized Hoodie", "category": "Fashion", "cost": 580, "price": 1299, "stock": 70, "weight": 0.6},
    {"id": "PROD-F205", "name": "Tuscan Tan Genuine Leather Belt", "category": "Fashion", "cost": 210, "price": 599, "stock": 160, "weight": 0.25},

    # Home & Kitchen
    {"id": "PROD-H301", "name": "CrispWave Digital Air Fryer 4.5L", "category": "Home & Kitchen", "cost": 2100, "price": 4299, "stock": 35, "weight": 3.8},
    {"id": "PROD-H302", "name": "ChefPro Granite Non-Stick Pan 28cm", "category": "Home & Kitchen", "cost": 550, "price": 1199, "stock": 110, "weight": 1.1},
    {"id": "PROD-H303", "name": "OrthoSnooze Contour Memory Foam Pillow", "category": "Home & Kitchen", "cost": 620, "price": 1399, "stock": 80, "weight": 0.9},
    {"id": "PROD-H304", "name": "AuraGleam Cordless Electric Kettle 1.8L", "category": "Home & Kitchen", "cost": 480, "price": 999, "stock": 130, "weight": 1.0},
    {"id": "PROD-H305", "name": "SilkCloud 400TC Egyptian Cotton Bedsheet", "category": "Home & Kitchen", "cost": 750, "price": 1699, "stock": 50, "weight": 1.2},

    # Beauty & Personal Care
    {"id": "PROD-B401", "name": "GlowMatrix 10% Vitamin C Radiance Serum", "category": "Beauty", "cost": 180, "price": 549, "stock": 260, "weight": 0.15},
    {"id": "PROD-B402", "name": "SunShield Matte Gel Sunscreen SPF 50", "category": "Beauty", "cost": 160, "price": 449, "stock": 320, "weight": 0.12},
    {"id": "PROD-B403", "name": "RootPure Ayurvedic Bhringraj Hair Oil", "category": "Beauty", "cost": 140, "price": 399, "stock": 190, "weight": 0.25},
    {"id": "PROD-B404", "name": "PurePore Activated Charcoal Scrub", "category": "Beauty", "cost": 110, "price": 329, "stock": 175, "weight": 0.18},

    # Groceries & Gourmet
    {"id": "PROD-G501", "name": "Himalayan Harvest Organic Green Tea 250g", "category": "Groceries", "cost": 150, "price": 379, "stock": 240, "weight": 0.3},
    {"id": "PROD-G502", "name": "NatureVeda Cold-Pressed Mustard Oil 1L", "category": "Groceries", "cost": 160, "price": 289, "stock": 150, "weight": 1.0},
    {"id": "PROD-G503", "name": "NutriCrunch California Jumbo Almonds 500g", "category": "Groceries", "cost": 380, "price": 649, "stock": 90, "weight": 0.52},
    {"id": "PROD-G504", "name": "ArtisanRoast Dark Chocolate Granola 400g", "category": "Groceries", "cost": 190, "price": 429, "stock": 115, "weight": 0.45}
]

prod_dict = {p["id"]: p for p in PRODUCTS}

COMMON_PAIRS = [
    ("PROD-E101", "PROD-E102"),
    ("PROD-F202", "PROD-F205"),
    ("PROD-B403", "PROD-B404"),
    ("PROD-H302", "PROD-H304"),
    ("PROD-G503", "PROD-G504"),
]

REGIONAL_PREFS = {
    "West": {"Electronics": 1.2, "Fashion": 1.1, "Home & Kitchen": 1.3, "Beauty": 1.15, "Groceries": 1.0},
    "South": {"Electronics": 1.4, "Fashion": 1.0, "Home & Kitchen": 1.2, "Beauty": 1.1, "Groceries": 1.2},
    "North": {"Electronics": 1.1, "Fashion": 1.35, "Home & Kitchen": 1.0, "Beauty": 1.2, "Groceries": 1.15},
    "East": {"Electronics": 0.9, "Fashion": 1.3, "Home & Kitchen": 1.1, "Beauty": 1.25, "Groceries": 1.3},
    "North-East": {"Electronics": 0.85, "Fashion": 1.2, "Home & Kitchen": 0.95, "Beauty": 1.1, "Groceries": 1.1},
    "Central": {"Electronics": 0.95, "Fashion": 1.1, "Home & Kitchen": 1.0, "Beauty": 1.0, "Groceries": 1.1}
}

start_date = datetime(2026, 1, 1)
end_date = datetime(2026, 10, 31)
date_range_days = (end_date - start_date).days

records = []
order_seq = 10000

while len(records) < 800:
    order_seq += 1
    order_id = f"ORD-{order_seq}"
    day_offset = random.randint(0, date_range_days)
    curr_date = start_date + timedelta(days=day_offset)

    pincode = random.choice(pincodes)
    geo_info = geo_data["pincodes"][pincode]
    region = geo_info["region"]

    # 35% probability of multi-item basket
    is_multi_item = random.random() < 0.35 and (800 - len(records)) >= 2
    if is_multi_item:
        pair = random.choice(COMMON_PAIRS)
        selected_prods = [prod_dict[pair[0]], prod_dict[pair[1]]]
    else:
        weights = [REGIONAL_PREFS.get(region, {}).get(p["category"], 1.0) for p in PRODUCTS]
        selected_prods = [random.choices(PRODUCTS, weights=weights, k=1)[0]]

    for prod in selected_prods:
        if len(records) >= 800:
            break
        qty = random.choices([1, 2, 3], weights=[0.82, 0.15, 0.03])[0]
        discount_pct = random.choices([0, 5, 10, 15, 20], weights=[0.4, 0.25, 0.2, 0.1, 0.05])[0]
        selling_price = round(prod["price"] * (1 - discount_pct / 100))
        cost_price = prod["cost"]

        ret_rate = {"Fashion": 0.12, "Electronics": 0.04, "Home & Kitchen": 0.03, "Beauty": 0.015, "Groceries": 0.01}.get(prod["category"], 0.03)
        is_returned = random.random() < ret_rate
        is_cancelled = random.random() < 0.02

        return_status = "Returned" if is_returned else "No"
        cancellation_status = "Cancelled" if is_cancelled else "No"

        shipping_cost = round(40 + prod["weight"] * 25 + (15 if region in ["East", "North-East"] else 0))
        ad_spend = round(random.uniform(15, 65), 2) if random.random() > 0.45 else 0.0

        records.append({
            "Order ID": order_id,
            "Product ID": prod["id"],
            "Product Name": prod["name"],
            "Product Category": prod["category"],
            "Order Date": curr_date.strftime("%Y-%m-%d"),
            "Delivery PIN Code": pincode,
            "Quantity": qty,
            "Selling Price": selling_price,
            "Cost Price": cost_price,
            "Return Status": return_status,
            "Cancellation Status": cancellation_status,
            "Discount": discount_pct,
            "Inventory Quantity": prod["stock"],
            "Shipping Cost": shipping_cost,
            "Advertising Spend": ad_spend
        })

fieldnames = [
    "Order ID", "Product ID", "Product Name", "Product Category", "Order Date",
    "Delivery PIN Code", "Quantity", "Selling Price", "Cost Price", "Return Status",
    "Cancellation Status", "Discount", "Inventory Quantity", "Shipping Cost", "Advertising Spend"
]

with open("data/sample_sales_data_800.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(records)

print(f"Successfully generated {len(records)} records in data/sample_sales_data_800.csv")
