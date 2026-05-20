#!/usr/bin/env python3
"""
SmartPayBin — Raspberry Pi 4 Edge Agent

Replaces bin-simulator.js with real sensor reads.
Connects to backend via existing API contract:
  GET  /api/bin/pending-sessions   (poll for user sessions)
  POST /api/bin/ack-session        (acknowledge session)
  POST /api/bin/complete-session   (submit sensor data)

Flow:
  1. Poll backend for pending sessions
  2. Acknowledge session
  3. Wait for waste in funnel (IR sensor)
  4. Classify waste (moisture + metal sensors)
  5. Snapshot weight_before (load cell)
  6. Rotate funnel to correct bin (stepper)
  7. Open trap door → waste drops (servo)
  8. Snapshot weight_after → calculate deposited_kg
  9. Close trap door, measure fill level (ultrasonic)
  10. Return funnel to home
  11. Submit to backend
"""

import os
import sys
import time
import signal
import requests
from dotenv import load_dotenv
# Auto-detect: use mock GPIO if not on Pi or MOCK_GPIO=1
if os.getenv("MOCK_GPIO") == "1":
    import mock_gpio as GPIO
else:
    try:
        import RPi.GPIO as GPIO
    except (ImportError, RuntimeError):
        import mock_gpio as GPIO

from sensors import (
    WeightSensor,
    UltrasonicSensor,
    WasteClassifier,
    TrapDoor,
    FunnelRotator,
    StatusLEDs,
)

load_dotenv()

# ── Config ──────────────────────────────────────────────────
BIN_ID = os.getenv("BIN_ID")
BIN_API_KEY = os.getenv("BIN_API_KEY")
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")
POLL_INTERVAL = 3  # seconds

HEADERS = {
    "Content-Type": "application/json",
    "x-bin-id": BIN_ID,
    "x-bin-api-key": BIN_API_KEY,
}

if not BIN_ID or not BIN_API_KEY:
    print("❌ BIN_ID and BIN_API_KEY must be set in .env")
    sys.exit(1)


# ── GPIO Init ───────────────────────────────────────────────
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)

print("🔧 Initializing sensors and actuators...")

scale = WeightSensor(
    dt_pin=int(os.getenv("HX711_DT_PIN", 5)),
    sck_pin=int(os.getenv("HX711_SCK_PIN", 6)),
    calibration_factor=float(os.getenv("CALIBRATION_FACTOR", 420.0)),
)

ultrasonic = UltrasonicSensor(
    trig_pin=int(os.getenv("TRIG_PIN", 23)),
    echo_pin=int(os.getenv("ECHO_PIN", 24)),
    bin_depth_cm=float(os.getenv("BIN_DEPTH_CM", 50)),
)

classifier = WasteClassifier(
    ir_pin=int(os.getenv("IR_PRESENCE_PIN", 25)),
    moisture_pin=int(os.getenv("MOISTURE_PIN", 7)),
    metal_pin=int(os.getenv("METAL_PIN", 12)),
)

trap_door = TrapDoor(
    pin=int(os.getenv("SERVO_PIN", 17)),
)

rotator = FunnelRotator(
    in1=int(os.getenv("STEPPER_IN1", 20)),
    in2=int(os.getenv("STEPPER_IN2", 21)),
    in3=int(os.getenv("STEPPER_IN3", 16)),
    in4=int(os.getenv("STEPPER_IN4", 18)),
)

leds = StatusLEDs(
    green_pin=int(os.getenv("LED_GREEN_PIN", 13)),
    red_pin=int(os.getenv("LED_RED_PIN", 19)),
    yellow_pin=int(os.getenv("LED_YELLOW_PIN", 26)),
)


# ── Cleanup on exit ─────────────────────────────────────────
def cleanup(signum=None, frame=None):
    print("\n🔌 Shutting down...")
    trap_door.close()
    rotator.go_home()
    leds.all_off()
    trap_door.cleanup()
    GPIO.cleanup()
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


# ── API Helpers ──────────────────────────────────────────────
def api_get(path):
    """GET request to backend."""
    resp = requests.get(f"{SERVER_URL}{path}", headers=HEADERS, timeout=10)
    return resp.json()


def api_post(path, data):
    """POST request to backend."""
    resp = requests.post(
        f"{SERVER_URL}{path}", json=data, headers=HEADERS, timeout=10
    )
    return resp.json()


# ── Session Handler ──────────────────────────────────────────
def handle_session(session):
    """Handle one deposit session from start to finish."""
    session_id = session["_id"]
    user_name = session.get("userId", {}).get("fullName", "Unknown")

    print(f"\n{'─' * 50}")
    print(f"✅ Session found!")
    print(f"   Session: {session_id}")
    print(f"   User:    {user_name}")

    # ── Step 1: Acknowledge session ──
    print("\n📡 Step 1: Acknowledging session...")
    ack = api_post("/api/bin/ack-session", {"sessionId": session_id})
    if not ack.get("success"):
        print(f"❌ Ack failed: {ack.get('message')}")
        leds.set_error()
        time.sleep(3)
        return
    print(f"   ✅ Session active! Expires: {ack['data'].get('expiresAt')}")

    # ── Step 2: Wait for waste in funnel ──
    leds.set_waiting()
    print("\n⏳ Step 2: Waiting for waste in funnel...")
    print("   (IR sensor monitoring for object presence)")

    waste_detected = classifier.wait_for_waste(timeout_sec=240)
    if not waste_detected:
        print("❌ Timeout: no waste detected in 4 minutes")
        leds.set_error()
        time.sleep(3)
        return

    print("   ✅ Waste detected in funnel!")
    leds.set_processing()

    # ── Step 3: Classify waste ──
    print("\n🏷️  Step 3: Classifying waste...")
    is_wet = classifier.is_wet()
    is_metal = classifier.is_metal()
    waste_type = classifier.classify()
    print(f"   Moisture: {'WET' if is_wet else 'DRY'}")
    print(f"   Metal:    {'YES' if is_metal else 'NO'}")
    print(f"   → Type:   {waste_type}")

    # ── Step 4: Snapshot weight BEFORE ──
    print("\n⚖️  Step 4: Reading weight before deposit...")
    weight_before = scale.read_stable()
    print(f"   Weight before: {weight_before} kg")

    # ── Step 5: Rotate funnel to correct bin ──
    print(f"\n🔄 Step 5: Rotating funnel to [{waste_type}] bin...")
    rotator.rotate_to(waste_type)
    time.sleep(0.5)

    # ── Step 6: Open trap door → waste drops ──
    print("\n🚪 Step 6: Opening trap door...")
    trap_door.open()
    time.sleep(2)  # let waste fall

    # ── Step 7: Close trap door ──
    print("\n🚪 Step 7: Closing trap door...")
    trap_door.close()
    time.sleep(0.5)

    # ── Step 8: Snapshot weight AFTER ──
    print("\n⚖️  Step 8: Reading weight after deposit...")
    weight_after = scale.read_stable()
    deposited_kg = round(weight_after - weight_before, 3)
    print(f"   Weight after:  {weight_after} kg")
    print(f"   ──────────────────────")
    print(f"   Deposited:     {deposited_kg} kg")

    if deposited_kg <= 0.01:
        print("⚠️  No measurable weight change. Submitting minimum.")
        deposited_kg = 0.01

    # ── Step 9: Measure fill level ──
    print("\n📏 Step 9: Measuring bin fill level...")
    fill = ultrasonic.fill_percentage()
    print(f"   Fill level: {fill}%")

    # ── Step 10: Return funnel to home ──
    print("\n🔄 Step 10: Returning funnel to home position...")
    rotator.go_home()

    # ── Step 11: Submit to backend ──
    print(f"\n📤 Step 11: Submitting deposit data...")
    print(f"   wasteType: {waste_type}")
    print(f"   weightKg:  {deposited_kg}")

    result = api_post("/api/bin/complete-session", {
        "sessionId": session_id,
        "wasteType": waste_type,
        "weightKg": deposited_kg,
    })

    if result.get("success"):
        leds.set_success()
        data = result.get("data", {})
        print(f"\n🎉 DEPOSIT COMPLETE!")
        print(f"   Waste type:  {data.get('wasteType')}")
        print(f"   Weight:      {data.get('weightKg')} kg")
        print(f"   Rewards:     +{data.get('rewardPoints', 0)} points")
        print(f"   Bin fill:    {data.get('fillPercentage', 0)}%")
        time.sleep(3)
    else:
        leds.set_error()
        print(f"❌ Submit failed: {result.get('message')}")
        time.sleep(3)

    print(f"\n{'─' * 50}")


# ── Main Loop ────────────────────────────────────────────────
def main():
    print(f"\n{'═' * 50}")
    print(f"  SmartPayBin — Raspberry Pi 4 Edge Agent")
    print(f"  Bin ID:  {BIN_ID}")
    print(f"  Server:  {SERVER_URL}")
    print(f"{'═' * 50}")
    print(f"\n🔧 Hardware initialized:")
    print(f"   ⚖️  Load cell (HX711)      — GPIO {os.getenv('HX711_DT_PIN', 5)}/{os.getenv('HX711_SCK_PIN', 6)}")
    print(f"   📏 Ultrasonic (HC-SR04)    — GPIO {os.getenv('TRIG_PIN', 23)}/{os.getenv('ECHO_PIN', 24)}")
    print(f"   👁  IR presence (FC-51)     — GPIO {os.getenv('IR_PRESENCE_PIN', 25)}")
    print(f"   💧 Moisture (MH-RD)        — GPIO {os.getenv('MOISTURE_PIN', 7)}")
    print(f"   🧲 Metal detect (LJ18A3)   — GPIO {os.getenv('METAL_PIN', 12)}")
    print(f"   🚪 Trap door (SG90)        — GPIO {os.getenv('SERVO_PIN', 17)}")
    print(f"   🔄 Funnel rotator (28BYJ)  — GPIO {os.getenv('STEPPER_IN1', 20)}/{os.getenv('STEPPER_IN2', 21)}/{os.getenv('STEPPER_IN3', 16)}/{os.getenv('STEPPER_IN4', 18)}")
    print(f"   💡 LEDs (G/R/Y)            — GPIO {os.getenv('LED_GREEN_PIN', 13)}/{os.getenv('LED_RED_PIN', 19)}/{os.getenv('LED_YELLOW_PIN', 26)}")
    print(f"\n🔄 Polling for sessions every {POLL_INTERVAL}s...\n")

    leds.set_idle()
    trap_door.close()
    rotator.go_home()

    while True:
        try:
            leds.set_idle()
            data = api_get("/api/bin/pending-sessions")
            sessions = data.get("data", {}).get("sessions", [])

            if sessions:
                handle_session(sessions[0])
            else:
                print(".", end="", flush=True)

        except requests.exceptions.RequestException as e:
            print(f"\n⚠️  Connection error: {e}")
            leds.set_error()
            time.sleep(5)
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
            leds.set_error()
            time.sleep(5)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
