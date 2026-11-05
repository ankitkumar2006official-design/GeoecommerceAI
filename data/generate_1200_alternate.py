import csv
import random
from datetime import datetime, timedelta

random.seed(42)

# 15 distinct products (distinct from AeroStride, ArtisanRoast, UrbanCraft)
PRODUCTS = [
    {"id": "PROD-A101", "name": "ZenSound Active Noise-Cancelling Headphones", "category": "Electronics", "price": 3499, "cost": 1750, "weight": 9},
    {"id": "PROD-A102", "name": "SmartPulse Fitness Band", "category": "Electronics", "price": 1899, "cost": 950, "weight": 11},
    {"id": "PROD-A103", "name": "UltraSpeed 65W GaN Fast Charger", "category": "Electronics", "price": 1299, "cost": 600, "weight": 8},
    {"id": "PROD-A104", "name": "AuraGlow Smart LED Desk Lamp", "category": "Home & Kitchen", "price": 1599, "cost": 750, "weight": 7},
    {"id": "PROD-A105", "name": "HydroPure Insulated Steel Bottle 1L", "category": "Home & Kitchen", "price": 699, "cost": 320, "weight": 10},
    {"id": "PROD-A106", "name": "AirBreeze Cool Mist Humidifier", "category": "Home & Kitchen", "price": 1799, "cost": 850, "weight": 6},
    {"id": "PROD-A107", "name": "NatureGlow Botanical Day Cream 50g", "category": "Beauty", "price": 849, "cost": 380, "weight": 8},
    {"id": "PROD-A108", "name": "DermaCleanse Foaming Face Cleanser", "category": "Beauty", "price": 499, "cost": 210, "weight": 9},
    {"id": "PROD-A109", "name": "RevitaSilk Herbal Argan Hair Oil", "category": "Beauty", "price": 649, "cost": 280, "weight": 7},
    {"id": "PROD-A110", "name": "FitFlex Stretch Cotton Polo", "category": "Fashion", "price": 899, "cost": 410, "weight": 8},
    {"id": "PROD-A111", "name": "UrbanDenim Comfort Fit Jeans", "category": "Fashion", "price": 1699, "cost": 790, "weight": 7},
    {"id": "PROD-A112", "name": "ClassicWeave Linen Casual Shirt", "category": "Fashion", "price": 1450, "cost": 650, "weight": 6},
    {"id": "PROD-A113", "name": "OrganicBliss Green Tea 250g", "category": "Groceries", "price": 399, "cost": 170, "weight": 8},
    {"id": "PROD-A114", "name": "NutriBite Jumbo Roasted Cashews 500g", "category": "Groceries", "price": 799, "cost": 390, "weight": 7},
    {"id": "PROD-A115", "name": "GoldenGrains Organic Quinoa 1kg", "category": "Groceries", "price": 549, "cost": 240, "weight": 6}
]

# The user's exact 18 specified cities (NO Kolkata)
LOCATIONS = [
    {"city": "Siliguri", "pincode": "734001"},
    {"city": "Asansol", "pincode": "713301"},
    {"city": "Gaya", "pincode": "823001"},
    {"city": "Muzaffarpur", "pincode": "842001"},
    {"city": "Jamshedpur", "pincode": "831001"},
    {"city": "Bokaro", "pincode": "827001"},
    {"city": "Indore", "pincode": "452001"},
    {"city": "Bhopal", "pincode": "462001"},
    {"city": "Surat", "pincode": "395001"},
    {"city": "Ahmedabad", "pincode": "380001"},
    {"city": "Kochi", "pincode": "682001"},
    {"city": "Thiruvananthapuram", "pincode": "695001"},
    {"city": "Nagpur", "pincode": "440001"},
    {"city": "Nashik", "pincode": "422001"},
    {"city": "Noida", "pincode": "201301"},
    {"city": "Kanpur", "pincode": "208001"},
    {"city": "Mysuru", "pincode": "570001"},
    {"city": "Visakhapatnam", "pincode": "530001"}
]

start_date = datetime(2026, 5, 1)
end_date = datetime(2026, 10, 31)
date_range_days = (end_date - start_date).days

product_weights = [p["weight"] for p in PRODUCTS]

rows = []
for order_num in range(1, 1201):
    order_id = f"ORD-ALT-{order_num:05d}"
    order_days = random.randint(0, date_range_days)
    order_date = (start_date + timedelta(days=order_days)).strftime("%Y-%m-%d")
    
    loc = random.choice(LOCATIONS)
    pincode = loc["pincode"]
    
    # Pick product based on popularity weight
    prod = random.choices(PRODUCTS, weights=product_weights, k=1)[0]
    
    quantity = random.choices([1, 2, 3], weights=[80, 16, 4], k=1)[0]
    unit_price = prod["price"]
    unit_cost = prod["cost"]
    
    # Return status: ~4.5% returns
    is_returned = random.random() < 0.045
    return_status = "Returned" if is_returned else "No"
    
    # Cancellation: ~2% cancellations
    is_cancelled = random.random() < 0.02
    cancellation_status = "Cancelled" if is_cancelled else "No"
    
    discount = random.choice([0, 5, 10, 15])
    inventory = random.randint(30, 150)
    shipping_cost = random.choice([40, 50, 60])
    ad_spend = round(random.uniform(20.0, 75.0), 2)
    
    rows.append({
        "Order ID": order_id,
        "Product ID": prod["id"],
        "Product Name": prod["name"],
        "Product Category": prod["category"],
        "Order Date": order_date,
        "Delivery PIN Code": pincode,
        "Quantity": quantity,
        "Selling Price": unit_price,
        "Cost Price": unit_cost,
        "Return Status": return_status,
        "Cancellation Status": cancellation_status,
        "Discount": discount,
        "Inventory Quantity": inventory,
        "Shipping Cost": shipping_cost,
        "Advertising Spend": ad_spend
    })

csv_file = "data/sample_sales_data_1200_alternate.csv"
fieldnames = [
    "Order ID", "Product ID", "Product Name", "Product Category",
    "Order Date", "Delivery PIN Code", "Quantity", "Selling Price",
    "Cost Price", "Return Status", "Cancellation Status", "Discount",
    "Inventory Quantity", "Shipping Cost", "Advertising Spend"
]

with open(csv_file, "w", newline="", encoding="utf8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Generated {len(rows)} records in {csv_file}")

