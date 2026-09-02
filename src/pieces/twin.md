---
title: Twin
label: 02 — macropad
summary: A macropad for the computer and the house at once. One button switches which one the keys are talking to.
status: finished
completed: 2026-04
featured: true
madeToOrder: false
repo: https://github.com/Las-Vejas/Twin
placeholder: true
photoCaption: twin — photo needed
specs:
  - label: Board
    value: 78.0 × 72.8 mm, 2 layer
  - label: Controllers
    value: RP2040 and ESP32-C6-MINI-1
  - label: Keys
    value: 11 Choc switches
  - label: Encoder
    value: 1 rotary, with push
  - label: LEDs
    value: 11 per-key, 14 underglow
  - label: Flash
    value: W25Q16JV, 2 MB
  - label: Firmware
    value: CircuitPython and ESPHome
  - label: Bill of materials
    value: $81.90
---

Two controllers on one board. The RP2040 runs CircuitPython and presents as a
normal USB HID device, so the computer sees a keyboard. The ESP32-C6 runs
ESPHome and talks to Home Assistant. A button flips which one the keys are
driving, and all 25 LEDs change to tell you which mode you are in.

Built because switching between controlling the room and controlling the machine
meant reaching for two different things.
