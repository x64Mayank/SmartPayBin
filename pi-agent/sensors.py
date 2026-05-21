"""
SmartPayBin — Sensor & Actuator Drivers for Raspberry Pi 4

Drivers for:
  - WeightSensor    (HX711 + 20kg load cell)
  - UltrasonicSensor (HC-SR04)
  - WasteClassifier  (MH-RD moisture + LJ18A3 metal + FC-51 IR presence)
  - TrapDoor         (SG90 servo)
  - FunnelRotator    (28BYJ-48 stepper + ULN2003)
  - StatusLEDs       (Green/Yellow/Red)
"""

import os
import time

# Auto-detect: use mock GPIO if not on Pi or MOCK_GPIO=1
if os.getenv("MOCK_GPIO") == "1":
    import mock_gpio as GPIO
else:
    try:
        import RPi.GPIO as GPIO
    except (ImportError, RuntimeError):
        import mock_gpio as GPIO


# ═══════════════════════════════════════════════════════════
# Weight Sensor — HX711 + 20kg Load Cell
# ═══════════════════════════════════════════════════════════

class WeightSensor:
    """HX711 load cell reader. Measures total weight of all bins on base platform."""

    def __init__(self, dt_pin, sck_pin, calibration_factor=420.0):
        self.dt_pin = dt_pin
        self.sck_pin = sck_pin
        self.calibration_factor = calibration_factor
        self.offset = 0

        GPIO.setup(self.dt_pin, GPIO.IN)
        GPIO.setup(self.sck_pin, GPIO.OUT)
        GPIO.output(self.sck_pin, GPIO.LOW)
        time.sleep(0.5)
        self._tare()

    def _read_raw(self):
        """Read raw 24-bit value from HX711."""
        # Wait for HX711 to be ready (DT goes LOW)
        timeout = time.time() + 2
        while GPIO.input(self.dt_pin) == 1:
            if time.time() > timeout:
                raise TimeoutError("HX711 not responding")

        data = 0
        for _ in range(24):
            GPIO.output(self.sck_pin, GPIO.HIGH)
            time.sleep(0.000001)
            data = (data << 1) | GPIO.input(self.dt_pin)
            GPIO.output(self.sck_pin, GPIO.LOW)
            time.sleep(0.000001)

        # 25th pulse — set gain to 128 (Channel A)
        GPIO.output(self.sck_pin, GPIO.HIGH)
        time.sleep(0.000001)
        GPIO.output(self.sck_pin, GPIO.LOW)
        time.sleep(0.000001)

        # Convert from two's complement
        if data & 0x800000:
            data -= 0x1000000
        return data

    def _tare(self, samples=10):
        """Zero the scale. Call with empty bins on platform."""
        print("   ⚖️  Taring scale (measuring empty weight)...")
        readings = []
        for _ in range(samples):
            try:
                readings.append(self._read_raw())
                time.sleep(0.1)
            except TimeoutError:
                continue
        if readings:
            self.offset = sum(readings) / len(readings)
        print(f"   ⚖️  Tare complete. Offset: {self.offset:.0f}")

    def read_kg(self, samples=5):
        """Read weight in kg, averaged over samples."""
        readings = []
        for _ in range(samples):
            try:
                readings.append(self._read_raw())
                time.sleep(0.05)
            except TimeoutError:
                continue
        if not readings:
            return 0
        avg = sum(readings) / len(readings)
        weight_grams = (avg - self.offset) / self.calibration_factor
        weight_kg = weight_grams / 1000
        return max(round(weight_kg, 3), 0)

    def read_stable(self, stability_count=3, tolerance_kg=0.02, interval=0.5):
        """
        Wait for stable weight reading.
        Returns weight when `stability_count` consecutive reads
        are within `tolerance_kg` of each other.
        """
        prev = self.read_kg()
        count = 0
        while count < stability_count:
            time.sleep(interval)
            curr = self.read_kg()
            if abs(curr - prev) <= tolerance_kg:
                count += 1
            else:
                count = 0
            prev = curr
        return prev


# ═══════════════════════════════════════════════════════════
# Ultrasonic Sensor — HC-SR04 (fill level)
# ═══════════════════════════════════════════════════════════

class UltrasonicSensor:
    """HC-SR04 distance sensor. Measures fill level of bin below funnel."""

    def __init__(self, trig_pin, echo_pin, bin_depth_cm=50):
        self.trig_pin = trig_pin
        self.echo_pin = echo_pin
        self.bin_depth_cm = bin_depth_cm

        GPIO.setup(self.trig_pin, GPIO.OUT)
        GPIO.setup(self.echo_pin, GPIO.IN)
        GPIO.output(self.trig_pin, GPIO.LOW)
        time.sleep(0.1)

    def read_distance_cm(self):
        """Measure distance in cm. Returns -1 on timeout."""
        GPIO.output(self.trig_pin, GPIO.HIGH)
        time.sleep(0.00001)
        GPIO.output(self.trig_pin, GPIO.LOW)

        timeout = time.time() + 0.04
        start = time.time()

        while GPIO.input(self.echo_pin) == 0:
            start = time.time()
            if start > timeout:
                return -1

        while GPIO.input(self.echo_pin) == 1:
            end = time.time()
            if end > timeout:
                return -1

        duration = end - start
        distance = (duration * 34300) / 2
        return round(distance, 2)

    def fill_percentage(self):
        """
        Calculate bin fill %.
        0% = empty (distance == bin_depth), 100% = full (distance == 0).
        """
        dist = self.read_distance_cm()
        if dist < 0:
            return 0
        fill = ((self.bin_depth_cm - dist) / self.bin_depth_cm) * 100
        return max(0, min(100, round(fill, 1)))


# ═══════════════════════════════════════════════════════════
# Waste Classifier — IR presence + MH-RD moisture + LJ18A3 metal
# ═══════════════════════════════════════════════════════════

class WasteClassifier:
    """
    Classifies waste using:
      - FC-51 IR sensor: waste presence (LOW = object detected)
      - MH-RD raindrop: moisture (LOW = wet, HIGH = dry)
      - LJ18A3-8-Z/BX inductive: metal (LOW = metal, NPN output)

    Classification matrix:
      Dry + Metal    → recyclable
      Dry + No metal → plastic
      Wet + No metal → biodegradable
      Wet + Metal    → mixed
    """

    def __init__(self, ir_pin, moisture_pin, metal_pin):
        self.ir_pin = ir_pin
        self.moisture_pin = moisture_pin
        self.metal_pin = metal_pin

        GPIO.setup(self.ir_pin, GPIO.IN)
        GPIO.setup(self.moisture_pin, GPIO.IN)
        # LJ18A3 NPN — use internal pull-up
        GPIO.setup(self.metal_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

    def is_waste_present(self):
        """Check if waste is in the funnel. FC-51: LOW = object detected."""
        return GPIO.input(self.ir_pin) == GPIO.LOW

    def is_wet(self):
        """Check moisture. MH-RD D0: LOW = wet, HIGH = dry."""
        return GPIO.input(self.moisture_pin) == GPIO.LOW

    def is_metal(self):
        """Check for metal. LJ18A3 NPN: LOW = metal detected."""
        return GPIO.input(self.metal_pin) == GPIO.LOW

    def classify(self):
        """
        Read sensors and return waste type string.
        Must be called while waste is in funnel (before trap door opens).
        """
        wet = self.is_wet()
        metal = self.is_metal()

        if not wet and metal:
            return "recyclable"
        elif not wet and not metal:
            return "plastic"
        elif wet and not metal:
            return "biodegradable"
        else:
            return "mixed"

    def wait_for_waste(self, timeout_sec=300, poll_interval=0.3):
        """
        Block until waste is detected in funnel or timeout.
        Returns True if waste detected, False on timeout.
        """
        start = time.time()
        while time.time() - start < timeout_sec:
            if self.is_waste_present():
                # Debounce — confirm presence after short delay
                time.sleep(0.5)
                if self.is_waste_present():
                    return True
            time.sleep(poll_interval)
        return False


# ═══════════════════════════════════════════════════════════
# Trap Door — SG90 Servo
# ═══════════════════════════════════════════════════════════

class TrapDoor:
    """SG90 servo controlling funnel trap door."""

    def __init__(self, pin):
        self.pin = pin
        GPIO.setup(self.pin, GPIO.OUT)
        self.pwm = GPIO.PWM(self.pin, 50)  # 50Hz for servo
        self.pwm.start(0)
        self.close()

    def open(self):
        """Open trap door (90°)."""
        self._set_angle(90)
        print("   🔓 Trap door OPEN")

    def close(self):
        """Close trap door (0°)."""
        self._set_angle(0)
        print("   🔒 Trap door CLOSED")

    def _set_angle(self, angle):
        """Set servo angle (0-180°)."""
        duty = 2 + (angle / 18)
        self.pwm.ChangeDutyCycle(duty)
        time.sleep(0.6)
        self.pwm.ChangeDutyCycle(0)

    def cleanup(self):
        self.pwm.stop()


# ═══════════════════════════════════════════════════════════
# Funnel Rotator — 28BYJ-48 Stepper + ULN2003
# ═══════════════════════════════════════════════════════════

class FunnelRotator:
    """
    28BYJ-48 stepper motor via ULN2003 driver.
    Rotates PVC arm to aim funnel over correct bin.

    28BYJ-48 specs:
      - Step angle: 5.625°/64 (half-step)
      - Gear ratio: 1:64
      - Full revolution: 4096 half-steps (or 2048 full-steps)
      - 90° = 1024 half-steps (using 8-step sequence)

    Bin positions (assuming 4 bins at 90° intervals):
      recyclable    = 0°    (home)
      plastic       = 90°   (1024 steps CW)
      biodegradable = 180°  (2048 steps CW)
      mixed         = 270°  (3072 steps CW)
    """

    # Full-step sequence for 28BYJ-48
    STEP_SEQUENCE = [
        [1, 0, 0, 1],
        [1, 0, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 1],
        [0, 0, 0, 1],
    ]

    # Steps for each 90° increment (half-step mode with 8-step sequence)
    # 4096 half-steps per revolution → 1024 per 90°
    STEPS_PER_90DEG = 1024

    # Waste type → position mapping
    BIN_POSITIONS = {
        "recyclable": 0,
        "plastic": 1,
        "biodegradable": 2,
        "mixed": 3,
    }

    def __init__(self, in1, in2, in3, in4, step_delay=0.001):
        self.pins = [in1, in2, in3, in4]
        self.step_delay = step_delay
        self.current_position = 0  # 0-3 (which bin we're over)
        self.current_step_index = 0

        for pin in self.pins:
            GPIO.setup(pin, GPIO.OUT)
            GPIO.output(pin, GPIO.LOW)

    def _step(self, direction=1):
        """Execute one step. direction: 1=CW, -1=CCW."""
        self.current_step_index = (
            self.current_step_index + direction
        ) % len(self.STEP_SEQUENCE)
        seq = self.STEP_SEQUENCE[self.current_step_index]
        for i, pin in enumerate(self.pins):
            GPIO.output(pin, seq[i])
        time.sleep(self.step_delay)

    def _move_steps(self, steps, direction=1):
        """Move given number of steps in direction."""
        for _ in range(abs(steps)):
            self._step(direction)
        # De-energize coils to prevent overheating
        for pin in self.pins:
            GPIO.output(pin, GPIO.LOW)

    def rotate_to(self, waste_type):
        """
        Rotate funnel to aim over correct bin for given waste type.
        Takes shortest path (CW or CCW).
        """
        target = self.BIN_POSITIONS.get(waste_type, 0)
        if target == self.current_position:
            print(f"   🎯 Already at {waste_type} bin")
            return

        # Calculate shortest rotation direction
        diff = target - self.current_position
        if diff > 2:
            diff -= 4
        elif diff < -2:
            diff += 4

        steps = abs(diff) * self.STEPS_PER_90DEG
        direction = 1 if diff > 0 else -1

        print(f"   🔄 Rotating to {waste_type} bin ({diff * 90}°, {steps} steps)")
        self._move_steps(steps, direction)
        self.current_position = target

    def go_home(self):
        """Return to home position (recyclable = 0°)."""
        self.rotate_to("recyclable")


# ═══════════════════════════════════════════════════════════
# Status LEDs
# ═══════════════════════════════════════════════════════════

class StatusLEDs:
    """Green/Yellow/Red status LEDs."""

    def __init__(self, green_pin, red_pin, yellow_pin):
        self.green = green_pin
        self.red = red_pin
        self.yellow = yellow_pin
        for pin in [self.green, self.red, self.yellow]:
            GPIO.setup(pin, GPIO.OUT)
            GPIO.output(pin, GPIO.LOW)

    def set_idle(self):
        """Yellow = idle, waiting for session."""
        GPIO.output(self.green, GPIO.LOW)
        GPIO.output(self.red, GPIO.LOW)
        GPIO.output(self.yellow, GPIO.HIGH)

    def set_waiting(self):
        """Yellow blink = waiting for waste in funnel."""
        GPIO.output(self.green, GPIO.LOW)
        GPIO.output(self.red, GPIO.LOW)
        GPIO.output(self.yellow, GPIO.HIGH)

    def set_processing(self):
        """Green + Yellow = classifying/weighing/rotating."""
        GPIO.output(self.green, GPIO.HIGH)
        GPIO.output(self.red, GPIO.LOW)
        GPIO.output(self.yellow, GPIO.HIGH)

    def set_success(self):
        """Green = deposit complete."""
        GPIO.output(self.green, GPIO.HIGH)
        GPIO.output(self.red, GPIO.LOW)
        GPIO.output(self.yellow, GPIO.LOW)

    def set_error(self):
        """Red = error."""
        GPIO.output(self.green, GPIO.LOW)
        GPIO.output(self.red, GPIO.HIGH)
        GPIO.output(self.yellow, GPIO.LOW)

    def all_off(self):
        for pin in [self.green, self.red, self.yellow]:
            GPIO.output(pin, GPIO.LOW)
