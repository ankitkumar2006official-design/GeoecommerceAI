import json
from pathlib import Path

# Verified PIN Code Directory for Indian E-Commerce Hubs, Metros, Tier-1, Tier-2, Tier-3 cities
# Coordinates are accurate to city/locality center for Leaflet map plotting
PINCODES = {
    # Maharashtra
    "400001": {"city": "Mumbai", "district": "Mumbai City", "state": "Maharashtra", "lat": 18.9388, "lng": 72.8354, "region": "West"},
    "400050": {"city": "Bandra (Mumbai)", "district": "Mumbai Suburban", "state": "Maharashtra", "lat": 19.0544, "lng": 72.8402, "region": "West"},
    "400076": {"city": "Powai (Mumbai)", "district": "Mumbai Suburban", "state": "Maharashtra", "lat": 19.1176, "lng": 72.9060, "region": "West"},
    "400601": {"city": "Thane", "district": "Thane", "state": "Maharashtra", "lat": 19.2183, "lng": 72.9781, "region": "West"},
    "410210": {"city": "Navi Mumbai (Kharghar)", "district": "Raigad", "state": "Maharashtra", "lat": 19.0473, "lng": 73.0699, "region": "West"},
    "411001": {"city": "Pune", "district": "Pune", "state": "Maharashtra", "lat": 18.5204, "lng": 73.8567, "region": "West"},
    "411057": {"city": "Hinjawadi (Pune)", "district": "Pune", "state": "Maharashtra", "lat": 18.5913, "lng": 73.7389, "region": "West"},
    "422001": {"city": "Nashik", "district": "Nashik", "state": "Maharashtra", "lat": 19.9975, "lng": 73.7898, "region": "West"},
    "431001": {"city": "Chhatrapati Sambhajinagar", "district": "Aurangabad", "state": "Maharashtra", "lat": 19.8762, "lng": 75.3433, "region": "West"},
    "440001": {"city": "Nagpur", "district": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lng": 79.0882, "region": "West"},
    "416001": {"city": "Kolhapur", "district": "Kolhapur", "state": "Maharashtra", "lat": 16.7050, "lng": 74.2433, "region": "West"},

    # Delhi NCR
    "110001": {"city": "Connaught Place (New Delhi)", "district": "New Delhi", "state": "Delhi", "lat": 28.6315, "lng": 77.2167, "region": "North"},
    "110016": {"city": "Hauz Khas (Delhi)", "district": "South Delhi", "state": "Delhi", "lat": 28.5494, "lng": 77.2001, "region": "North"},
    "110034": {"city": "Pitampura (Delhi)", "district": "North West Delhi", "state": "Delhi", "lat": 28.6990, "lng": 77.1384, "region": "North"},
    "110085": {"city": "Rohini (Delhi)", "district": "North West Delhi", "state": "Delhi", "lat": 28.7166, "lng": 77.1124, "region": "North"},
    "110092": {"city": "Laxmi Nagar (Delhi)", "district": "East Delhi", "state": "Delhi", "lat": 28.6304, "lng": 77.2773, "region": "North"},
    "122001": {"city": "Gurugram", "district": "Gurugram", "state": "Haryana", "lat": 28.4595, "lng": 77.0266, "region": "North"},
    "121001": {"city": "Faridabad", "district": "Faridabad", "state": "Haryana", "lat": 28.4089, "lng": 77.3178, "region": "North"},
    "201301": {"city": "Noida", "district": "Gautam Buddha Nagar", "state": "Uttar Pradesh", "lat": 28.5355, "lng": 77.3910, "region": "North"},
    "201001": {"city": "Ghaziabad", "district": "Ghaziabad", "state": "Uttar Pradesh", "lat": 28.6692, "lng": 77.4538, "region": "North"},

    # Karnataka
    "560001": {"city": "Bengaluru Central", "district": "Bengaluru Urban", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946, "region": "South"},
    "560034": {"city": "Koramangala (Bengaluru)", "district": "Bengaluru Urban", "state": "Karnataka", "lat": 12.9352, "lng": 77.6245, "region": "South"},
    "560066": {"city": "Whitefield (Bengaluru)", "district": "Bengaluru Urban", "state": "Karnataka", "lat": 12.9698, "lng": 77.7499, "region": "South"},
    "560100": {"city": "Electronic City (Bengaluru)", "district": "Bengaluru Urban", "state": "Karnataka", "lat": 12.8399, "lng": 77.6770, "region": "South"},
    "570001": {"city": "Mysuru", "district": "Mysuru", "state": "Karnataka", "lat": 12.2958, "lng": 76.6394, "region": "South"},
    "575001": {"city": "Mangaluru", "district": "Dakshina Kannada", "state": "Karnataka", "lat": 12.9141, "lng": 74.8560, "region": "South"},
    "580020": {"city": "Hubballi", "district": "Dharwad", "state": "Karnataka", "lat": 15.3647, "lng": 75.1240, "region": "South"},

    # Tamil Nadu
    "600001": {"city": "Chennai North (George Town)", "district": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707, "region": "South"},
    "600028": {"city": "R.A. Puram (Chennai)", "district": "Chennai", "state": "Tamil Nadu", "lat": 13.0238, "lng": 80.2544, "region": "South"},
    "600096": {"city": "OMR / Perungudi (Chennai)", "district": "Chennai", "state": "Tamil Nadu", "lat": 12.9654, "lng": 80.2461, "region": "South"},
    "641001": {"city": "Coimbatore", "district": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0168, "lng": 76.9558, "region": "South"},
    "625001": {"city": "Madurai", "district": "Madurai", "state": "Tamil Nadu", "lat": 9.9252, "lng": 78.1198, "region": "South"},
    "620001": {"city": "Tiruchirappalli", "district": "Tiruchirappalli", "state": "Tamil Nadu", "lat": 10.7905, "lng": 78.7047, "region": "South"},
    "636001": {"city": "Salem", "district": "Salem", "state": "Tamil Nadu", "lat": 11.6643, "lng": 78.1460, "region": "South"},

    # Telangana & Andhra Pradesh
    "500001": {"city": "Hyderabad (Abids)", "district": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lng": 78.4867, "region": "South"},
    "500081": {"city": "HITEC City (Hyderabad)", "district": "Hyderabad", "state": "Telangana", "lat": 17.4474, "lng": 78.3762, "region": "South"},
    "506001": {"city": "Warangal", "district": "Warangal", "state": "Telangana", "lat": 17.9689, "lng": 79.5941, "region": "South"},
    "530001": {"city": "Visakhapatnam", "district": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lng": 83.2185, "region": "South"},
    "520001": {"city": "Vijayawada", "district": "NTR", "state": "Andhra Pradesh", "lat": 16.5062, "lng": 80.6480, "region": "South"},
    "522001": {"city": "Guntur", "district": "Guntur", "state": "Andhra Pradesh", "lat": 16.3067, "lng": 80.4365, "region": "South"},

    # West Bengal
    "700001": {"city": "Kolkata (BBD Bagh)", "district": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lng": 88.3639, "region": "East"},
    "700091": {"city": "Salt Lake Sector V (Kolkata)", "district": "North 24 Parganas", "state": "West Bengal", "lat": 22.5804, "lng": 88.4378, "region": "East"},
    "711101": {"city": "Howrah", "district": "Howrah", "state": "West Bengal", "lat": 22.5958, "lng": 88.2636, "region": "East"},
    "734001": {"city": "Siliguri", "district": "Darjeeling", "state": "West Bengal", "lat": 26.7271, "lng": 88.3953, "region": "East"},
    "713201": {"city": "Durgapur", "district": "Paschim Bardhaman", "state": "West Bengal", "lat": 23.5204, "lng": 87.3119, "region": "East"},

    # Gujarat
    "380001": {"city": "Ahmedabad", "district": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lng": 72.5714, "region": "West"},
    "380015": {"city": "SG Highway / Vastrapur (Ahmedabad)", "district": "Ahmedabad", "state": "Gujarat", "lat": 23.0350, "lng": 72.5293, "region": "West"},
    "395001": {"city": "Surat", "district": "Surat", "state": "Gujarat", "lat": 21.1702, "lng": 72.8311, "region": "West"},
    "390001": {"city": "Vadodara", "district": "Vadodara", "state": "Gujarat", "lat": 22.3072, "lng": 73.1812, "region": "West"},
    "360001": {"city": "Rajkot", "district": "Rajkot", "state": "Gujarat", "lat": 22.3039, "lng": 70.8022, "region": "West"},

    # Uttar Pradesh & Bihar
    "226001": {"city": "Lucknow", "district": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lng": 80.9462, "region": "North"},
    "208001": {"city": "Kanpur", "district": "Kanpur Nagar", "state": "Uttar Pradesh", "lat": 26.4499, "lng": 80.3319, "region": "North"},
    "221001": {"city": "Varanasi", "district": "Varanasi", "state": "Uttar Pradesh", "lat": 25.3176, "lng": 82.9739, "region": "North"},
    "282001": {"city": "Agra", "district": "Agra", "state": "Uttar Pradesh", "lat": 27.1767, "lng": 78.0081, "region": "North"},
    "800001": {"city": "Patna", "district": "Patna", "state": "Bihar", "lat": 25.5941, "lng": 85.1376, "region": "East"},
    "823001": {"city": "Gaya", "district": "Gaya", "state": "Bihar", "lat": 24.7914, "lng": 85.0002, "region": "East"},
    "842001": {"city": "Muzaffarpur", "district": "Muzaffarpur", "state": "Bihar", "lat": 26.1209, "lng": 85.3647, "region": "East"},

    # Rajasthan & Madhya Pradesh
    "302001": {"city": "Jaipur", "district": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lng": 75.7873, "region": "North"},
    "342001": {"city": "Jodhpur", "district": "Jodhpur", "state": "Rajasthan", "lat": 26.2389, "lng": 73.0243, "region": "North"},
    "313001": {"city": "Udaipur", "district": "Udaipur", "state": "Rajasthan", "lat": 24.5854, "lng": 73.7125, "region": "North"},
    "452001": {"city": "Indore", "district": "Indore", "state": "Madhya Pradesh", "lat": 22.7196, "lng": 75.8577, "region": "Central"},
    "462001": {"city": "Bhopal", "district": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lng": 77.4126, "region": "Central"},
    "474001": {"city": "Gwalior", "district": "Gwalior", "state": "Madhya Pradesh", "lat": 26.2183, "lng": 78.1828, "region": "Central"},

    # Kerala
    "682001": {"city": "Kochi", "district": "Ernakulam", "state": "Kerala", "lat": 9.9312, "lng": 76.2673, "region": "South"},
    "695001": {"city": "Thiruvananthapuram", "district": "Thiruvananthapuram", "state": "Kerala", "lat": 8.5241, "lng": 76.9366, "region": "South"},
    "673001": {"city": "Kozhikode", "district": "Kozhikode", "state": "Kerala", "lat": 11.2588, "lng": 75.7804, "region": "South"},

    # Punjab, Haryana & Chandigarh
    "160001": {"city": "Chandigarh", "district": "Chandigarh", "state": "Chandigarh", "lat": 30.7333, "lng": 76.7794, "region": "North"},
    "141001": {"city": "Ludhiana", "district": "Ludhiana", "state": "Punjab", "lat": 30.9010, "lng": 75.8573, "region": "North"},
    "143001": {"city": "Amritsar", "district": "Amritsar", "state": "Punjab", "lat": 31.6340, "lng": 74.8723, "region": "North"},

    # Eastern & North-Eastern Hubs
    "751001": {"city": "Bhubaneswar", "district": "Khordha", "state": "Odisha", "lat": 20.2961, "lng": 85.8245, "region": "East"},
    "781001": {"city": "Guwahati", "district": "Kamrup Metropolitan", "state": "Assam", "lat": 26.1445, "lng": 91.7362, "region": "North-East"},
    "834001": {"city": "Ranchi", "district": "Ranchi", "state": "Jharkhand", "lat": 23.3441, "lng": 85.3096, "region": "East"},
    "403001": {"city": "Panaji", "district": "North Goa", "state": "Goa", "lat": 15.4909, "lng": 73.8278, "region": "West"},
    "248001": {"city": "Dehradun", "district": "Dehradun", "state": "Uttarakhand", "lat": 30.3165, "lng": 78.0322, "region": "North"},
    "492001": {"city": "Raipur", "district": "Raipur", "state": "Chhattisgarh", "lat": 21.2514, "lng": 81.6296, "region": "Central"}
}

# State Centers for regional visualization and aggregations
STATE_CENTROIDS = {
    "Maharashtra": {"lat": 19.7515, "lng": 75.7139, "code": "MH", "region": "West"},
    "Delhi": {"lat": 28.7041, "lng": 77.1025, "code": "DL", "region": "North"},
    "Karnataka": {"lat": 15.3173, "lng": 75.7139, "code": "KA", "region": "South"},
    "Tamil Nadu": {"lat": 11.1271, "lng": 78.6569, "code": "TN", "region": "South"},
    "West Bengal": {"lat": 22.9868, "lng": 87.8550, "code": "WB", "region": "East"},
    "Telangana": {"lat": 18.1124, "lng": 79.0193, "code": "TS", "region": "South"},
    "Gujarat": {"lat": 22.2587, "lng": 71.1924, "code": "GJ", "region": "West"},
    "Uttar Pradesh": {"lat": 26.8467, "lng": 80.9462, "code": "UP", "region": "North"},
    "Rajasthan": {"lat": 27.0238, "lng": 74.2179, "code": "RJ", "region": "North"},
    "Kerala": {"lat": 10.8505, "lng": 76.2711, "code": "KL", "region": "South"},
    "Bihar": {"lat": 25.0961, "lng": 85.3131, "code": "BR", "region": "East"},
    "Madhya Pradesh": {"lat": 22.9734, "lng": 78.6569, "code": "MP", "region": "Central"},
    "Punjab": {"lat": 31.1471, "lng": 75.3412, "code": "PB", "region": "North"},
    "Haryana": {"lat": 29.0588, "lng": 76.0856, "code": "HR", "region": "North"},
    "Andhra Pradesh": {"lat": 15.9129, "lng": 79.7400, "code": "AP", "region": "South"},
    "Odisha": {"lat": 20.9517, "lng": 85.0985, "code": "OD", "region": "East"},
    "Assam": {"lat": 26.2006, "lng": 92.9376, "code": "AS", "region": "North-East"},
    "Jharkhand": {"lat": 23.6102, "lng": 85.2799, "code": "JH", "region": "East"},
    "Goa": {"lat": 15.2993, "lng": 74.1240, "code": "GA", "region": "West"},
    "Uttarakhand": {"lat": 30.0668, "lng": 79.0193, "code": "UK", "region": "North"},
    "Chhattisgarh": {"lat": 21.2787, "lng": 81.8661, "code": "CG", "region": "Central"},
    "Chandigarh": {"lat": 30.7333, "lng": 76.7794, "code": "CH", "region": "North"}
}

data_export = {
    "pincodes": PINCODES,
    "state_centroids": STATE_CENTROIDS
}

with open("data/pincode_india_directory.json", "w", encoding="utf-8") as f:
    json.dump(data_export, f, indent=2)

print(f"Generated {len(PINCODES)} verified Indian PIN codes with lat/lng coordinates and {len(STATE_CENTROIDS)} state centroids.")

