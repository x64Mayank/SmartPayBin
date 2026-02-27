import requests
import random
import time
from datetime import datetime

BACKEND_URL = "http://localhost:5000/api/deposits"

bin_id = "BIN001"
capacity_cm = 50
current_fill = 45  # start empty (high distance)

waste_types = ["recyclable", "plastic", "biodegradable", "mixed"]
users = ["USER1", "USER2", "USER3", "USER4"]

def simulate_deposit():
    global current_fill

    waste_type = random.choice(waste_types)
    user_id = random.choice(users)
    weight = round(random.uniform(0.1, 2.0), 2)

    # simulate bin filling
    current_fill -= random.uniform(0.5, 2.0)

    if current_fill < 5:
        print("Bin full. Simulating collection...")
        current_fill = 45

    payload = {
        "binId": bin_id,
        "userId": user_id,
        "wasteType": waste_type,
        "weightKg": weight,
        "fillLevelCm": current_fill,
        "capacityCm": capacity_cm,
        "timestamp": datetime.utcnow().isoformat()
    }

    response = requests.post(BACKEND_URL, json=payload)
    print(response.json())


while True:
    simulate_deposit()
    time.sleep(random.randint(5, 10))