#!/usr/bin/env python3
"""
SmartPayBin — Safe Hardware Test Suite

Run on Raspberry Pi to test each sensor/actuator INDIVIDUALLY
before running the full agent. Tests are isolated — one component
at a time, with safety checks and clear pass/fail output.

Usage:
    python3 test_hardware.py              # Run ALL tests
    python3 test_hardware.py led          # Test LEDs only
    python3 test_hardware.py servo        # Test servo only
    python3 test_hardware.py stepper      # Test stepper only
    python3 test_hardware.py ir           # Test IR presence
    python3 test_hardware.py moisture     # Test MH-RD
    python3 test_hardware.py metal        # Test LJ18A3
    python3 test_hardware.py weight       # Test load cell
    python3 test_hardware.py ultrasonic   # Test HC-SR04
    python3 test_hardware.py classify     # Test full classification
    python3 test_hardware.py mock         # Test with mock GPIO (no hardware)
"""

import os
import sys
import time

# ── Mock GPIO support ──
# Set MOCK_GPIO=1 to test without hardware, or pass "mock" argument
USE_MOCK = os.getenv("MOCK_GPIO") == "1" or "mock" in sys.argv

if USE_MOCK:
    print("🧪 MOCK MODE — no real hardware will be touched\n")
    import mock_gpio as GPIO
else:
    try:
        import RPi.GPIO as GPIO
    except (ImportError, RuntimeError):
        print("⚠️  RPi.GPIO not available. Falling back to MOCK mode.")
        print("   (Run with 'mock' argument or set MOCK_GPIO=1)\n")
        import mock_gpio as GPIO

from dotenv import load_dotenv

load_dotenv()

# Pin config from .env
PINS = {
    "HX711_DT": int(os.getenv("HX711_DT_PIN", 5)),
    "HX711_SCK": int(os.getenv("HX711_SCK_PIN", 6)),
    "TRIG": int(os.getenv("TRIG_PIN", 23)),
    "ECHO": int(os.getenv("ECHO_PIN", 24)),
    "SERVO": int(os.getenv("SERVO_PIN", 17)),
    "STEPPER_IN1": int(os.getenv("STEPPER_IN1", 20)),
    "STEPPER_IN2": int(os.getenv("STEPPER_IN2", 21)),
    "STEPPER_IN3": int(os.getenv("STEPPER_IN3", 16)),
    "STEPPER_IN4": int(os.getenv("STEPPER_IN4", 18)),
    "IR": int(os.getenv("IR_PRESENCE_PIN", 25)),
    "MOISTURE": int(os.getenv("MOISTURE_PIN", 7)),
    "METAL": int(os.getenv("METAL_PIN", 12)),
    "LED_GREEN": int(os.getenv("LED_GREEN_PIN", 13)),
    "LED_RED": int(os.getenv("LED_RED_PIN", 19)),
    "LED_YELLOW": int(os.getenv("LED_YELLOW_PIN", 26)),
}


def setup_gpio():
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)


def cleanup_gpio():
    GPIO.cleanup()


# ═══════════════════════════════════════════
# Individual Test Functions
# ═══════════════════════════════════════════

def test_leds():
    """Test each LED one by one. SAFE — only outputs LOW voltage to LEDs."""
    print("\n🔵 TEST: Status LEDs")
    print("   Testing GPIO pins:", PINS["LED_GREEN"], PINS["LED_RED"], PINS["LED_YELLOW"])

    from sensors import StatusLEDs
    leds = StatusLEDs(PINS["LED_GREEN"], PINS["LED_RED"], PINS["LED_YELLOW"])

    tests = [
        ("Idle (Yellow)", leds.set_idle),
        ("Active (Green)", leds.set_success),
        ("Error (Red)", leds.set_error),
        ("Processing (Green+Yellow)", leds.set_processing),
        ("All Off", leds.all_off),
    ]

    for name, fn in tests:
        print(f"   → {name}...")
        fn()
        time.sleep(1.5)

    leds.all_off()
    print("   ✅ LED test PASSED\n")


def test_servo():
    """Test servo open/close. SAFE — moves slowly between 0° and 90°."""
    print("\n🔵 TEST: Servo (Trap Door)")
    print(f"   Testing GPIO pin: {PINS['SERVO']}")
    print("   ⚠️  Servo will move! Keep fingers clear.\n")

    from sensors import TrapDoor
    door = TrapDoor(PINS["SERVO"])

    print("   → Closing (0°)...")
    door.close()
    time.sleep(1)

    print("   → Opening (90°)...")
    door.open()
    time.sleep(2)

    print("   → Closing (0°)...")
    door.close()
    time.sleep(1)

    door.cleanup()
    print("   ✅ Servo test PASSED\n")


def test_stepper():
    """Test stepper motor. SAFE — small rotation (90°) then returns."""
    print("\n🔵 TEST: Stepper Motor (Funnel Rotation)")
    print(f"   Testing GPIO pins: {PINS['STEPPER_IN1']}, {PINS['STEPPER_IN2']}, {PINS['STEPPER_IN3']}, {PINS['STEPPER_IN4']}")
    print("   ⚠️  Motor will rotate! Ensure funnel arm is free to move.\n")

    from sensors import FunnelRotator
    rotator = FunnelRotator(
        PINS["STEPPER_IN1"], PINS["STEPPER_IN2"],
        PINS["STEPPER_IN3"], PINS["STEPPER_IN4"],
    )

    positions = ["recyclable", "plastic", "biodegradable", "mixed", "recyclable"]
    for pos in positions:
        print(f"   → Rotating to [{pos}]...")
        rotator.rotate_to(pos)
        time.sleep(1)

    print("   ✅ Stepper test PASSED\n")


def test_ir():
    """Test IR presence sensor. SAFE — read-only, no outputs."""
    print("\n🔵 TEST: IR Presence Sensor (FC-51)")
    print(f"   Testing GPIO pin: {PINS['IR']}")
    print("   Place hand/object in front of sensor, then remove it.\n")

    from sensors import WasteClassifier
    c = WasteClassifier(PINS["IR"], PINS["MOISTURE"], PINS["METAL"])

    for i in range(10):
        present = c.is_waste_present()
        status = "🟢 DETECTED" if present else "⚪ empty"
        print(f"   Read {i+1}/10: {status}")
        time.sleep(1)

    print("   ✅ IR test PASSED (check readings above)\n")


def test_moisture():
    """Test MH-RD moisture sensor. SAFE — read-only."""
    print("\n🔵 TEST: Moisture Sensor (MH-RD)")
    print(f"   Testing GPIO pin: {PINS['MOISTURE']}")
    print("   Touch sensor pad with wet/dry object.\n")

    from sensors import WasteClassifier
    c = WasteClassifier(PINS["IR"], PINS["MOISTURE"], PINS["METAL"])

    for i in range(10):
        wet = c.is_wet()
        status = "💧 WET" if wet else "☀️  DRY"
        print(f"   Read {i+1}/10: {status}")
        time.sleep(1)

    print("   ✅ Moisture test PASSED (check readings above)\n")


def test_metal():
    """Test LJ18A3 inductive proximity. SAFE — read-only."""
    print("\n🔵 TEST: Metal Detector (LJ18A3-8-Z/BX)")
    print(f"   Testing GPIO pin: {PINS['METAL']}")
    print("   Bring metal object close to sensor, then remove.\n")

    from sensors import WasteClassifier
    c = WasteClassifier(PINS["IR"], PINS["MOISTURE"], PINS["METAL"])

    for i in range(10):
        metal = c.is_metal()
        status = "🧲 METAL" if metal else "⚪ no metal"
        print(f"   Read {i+1}/10: {status}")
        time.sleep(1)

    print("   ✅ Metal test PASSED (check readings above)\n")


def test_weight():
    """Test HX711 load cell. SAFE — read-only."""
    print("\n🔵 TEST: Weight Sensor (HX711 + 20kg Load Cell)")
    print(f"   Testing GPIO pins: DT={PINS['HX711_DT']}, SCK={PINS['HX711_SCK']}")
    print("   Place known weights on platform to verify readings.\n")

    from sensors import WeightSensor
    cal = float(os.getenv("CALIBRATION_FACTOR", 420.0))
    w = WeightSensor(PINS["HX711_DT"], PINS["HX711_SCK"], cal)

    print("   Tare complete. Now reading weight 10 times:")
    for i in range(10):
        kg = w.read_kg()
        print(f"   Read {i+1}/10: {kg} kg")
        time.sleep(1)

    print("\n   💡 If readings are wrong, adjust CALIBRATION_FACTOR in .env")
    print("   ✅ Weight test PASSED (check readings above)\n")


def test_ultrasonic():
    """Test HC-SR04 ultrasonic. SAFE — read-only (TRIG output is safe pulse)."""
    print("\n🔵 TEST: Ultrasonic Sensor (HC-SR04)")
    print(f"   Testing GPIO pins: TRIG={PINS['TRIG']}, ECHO={PINS['ECHO']}")
    print("   ⚠️  Ensure voltage divider is connected on ECHO pin!")
    print("   Point sensor at surface, vary distance.\n")

    from sensors import UltrasonicSensor
    depth = float(os.getenv("BIN_DEPTH_CM", 50))
    u = UltrasonicSensor(PINS["TRIG"], PINS["ECHO"], depth)

    for i in range(10):
        dist = u.read_distance_cm()
        fill = u.fill_percentage()
        if dist < 0:
            print(f"   Read {i+1}/10: TIMEOUT (no echo received)")
        else:
            print(f"   Read {i+1}/10: {dist} cm  |  Fill: {fill}%")
        time.sleep(1)

    print("   ✅ Ultrasonic test PASSED (check readings above)\n")


def test_classify():
    """Test full classification pipeline. SAFE — read-only sensors."""
    print("\n🔵 TEST: Full Waste Classification")
    print("   Using: IR (presence) + MH-RD (moisture) + LJ18A3 (metal)\n")

    from sensors import WasteClassifier
    c = WasteClassifier(PINS["IR"], PINS["MOISTURE"], PINS["METAL"])

    for i in range(10):
        present = c.is_waste_present()
        if not present:
            print(f"   Read {i+1}/10: No waste detected")
        else:
            wet = c.is_wet()
            metal = c.is_metal()
            waste_type = c.classify()
            print(f"   Read {i+1}/10: {'WET' if wet else 'DRY'} | {'METAL' if metal else 'no-metal'} → {waste_type}")
        time.sleep(1)

    print("   ✅ Classification test PASSED (check readings above)\n")


# ═══════════════════════════════════════════
# Main
# ═══════════════════════════════════════════

TESTS = {
    "led": ("LEDs", test_leds),
    "servo": ("Servo", test_servo),
    "stepper": ("Stepper", test_stepper),
    "ir": ("IR Presence", test_ir),
    "moisture": ("Moisture MH-RD", test_moisture),
    "metal": ("Metal LJ18A3", test_metal),
    "weight": ("Weight HX711", test_weight),
    "ultrasonic": ("Ultrasonic HC-SR04", test_ultrasonic),
    "classify": ("Classification", test_classify),
}

# Recommended safe testing order
SAFE_ORDER = ["led", "ir", "moisture", "metal", "weight", "ultrasonic", "servo", "stepper", "classify"]


def main():
    print("═" * 55)
    print("  SmartPayBin — Hardware Test Suite")
    print("  " + ("🧪 MOCK MODE" if USE_MOCK else "⚡ LIVE HARDWARE"))
    print("═" * 55)

    setup_gpio()

    # Filter which test to run
    args = [a for a in sys.argv[1:] if a != "mock"]

    if args:
        for arg in args:
            if arg in TESTS:
                name, fn = TESTS[arg]
                try:
                    fn()
                except Exception as e:
                    print(f"   ❌ {name} test FAILED: {e}\n")
            else:
                print(f"   Unknown test: {arg}")
                print(f"   Available: {', '.join(TESTS.keys())}")
    else:
        # Run ALL tests in safe order
        print("\n📋 Running ALL tests in safe order:")
        print(f"   Order: {' → '.join(SAFE_ORDER)}\n")

        for key in SAFE_ORDER:
            name, fn = TESTS[key]
            try:
                fn()
            except KeyboardInterrupt:
                print(f"\n   ⏭️  Skipped {name}")
            except Exception as e:
                print(f"   ❌ {name} test FAILED: {e}\n")

    cleanup_gpio()
    print("═" * 55)
    print("  Tests complete. Review results above.")
    print("═" * 55)


if __name__ == "__main__":
    main()
