"""
Mock RPi.GPIO module for safe testing without hardware.

Replaces real GPIO calls with print statements.
Use by running: MOCK_GPIO=1 python3 agent.py

All pin reads return configurable fake values.
All pin writes just log to console.
"""

import time

# Constants matching RPi.GPIO
BCM = 11
BOARD = 10
IN = 1
OUT = 0
HIGH = 1
LOW = 0
PUD_UP = 22
PUD_DOWN = 21
PUD_OFF = 20

_mode = None
_pin_modes = {}
_pin_states = {}
_warnings = True

# ── Configurable fake sensor responses ──
# Change these to simulate different scenarios
FAKE_RESPONSES = {
    # IR presence: LOW = object detected
    25: LOW,     # IR: waste IS present

    # MH-RD moisture: LOW = wet, HIGH = dry
    7: HIGH,     # MH-RD: waste is DRY

    # LJ18A3 metal: LOW = metal detected (NPN)
    12: HIGH,    # LJ18A3: NO metal (= plastic classification)

    # HX711 DT pin (data ready)
    5: LOW,      # HX711: data ready

    # HC-SR04 ECHO
    24: LOW,     # Ultrasonic echo (handled separately)
}


def setwarnings(flag):
    global _warnings
    _warnings = flag


def setmode(mode):
    global _mode
    _mode = mode
    mode_name = "BCM" if mode == BCM else "BOARD"
    print(f"   [MOCK GPIO] Mode set to {mode_name}")


def setup(pin, direction, pull_up_down=PUD_OFF):
    _pin_modes[pin] = direction
    _pin_states[pin] = LOW
    dir_name = "IN" if direction == IN else "OUT"
    pud = ""
    if pull_up_down == PUD_UP:
        pud = " (pull-up)"
        _pin_states[pin] = HIGH
    elif pull_up_down == PUD_DOWN:
        pud = " (pull-down)"
    print(f"   [MOCK GPIO] Pin {pin} → {dir_name}{pud}")


def output(pin, state):
    _pin_states[pin] = state
    # Only log actuator pins to reduce noise (servo, stepper, LEDs)
    actuator_pins = {13, 19, 26, 17, 20, 21, 16, 18, 23, 6}
    if pin in actuator_pins:
        state_name = "HIGH" if state else "LOW"
        # Suppress stepper step noise
        stepper_pins = {20, 21, 16, 18}
        if pin not in stepper_pins:
            print(f"   [MOCK GPIO] Pin {pin} ← {state_name}")


def input(pin):
    """Return fake sensor value for pin."""
    return FAKE_RESPONSES.get(pin, HIGH)


class PWM:
    """Mock PWM for servo control."""

    def __init__(self, pin, freq):
        self.pin = pin
        self.freq = freq
        print(f"   [MOCK GPIO] PWM on pin {pin} at {freq}Hz")

    def start(self, duty):
        pass

    def ChangeDutyCycle(self, duty):
        if duty > 0:
            angle = (duty - 2) * 18
            print(f"   [MOCK GPIO] Servo pin {self.pin} → {angle:.0f}°")

    def stop(self):
        print(f"   [MOCK GPIO] PWM pin {self.pin} stopped")


def cleanup():
    print("   [MOCK GPIO] Cleanup complete")
