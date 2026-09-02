---
title: Kaze
label: 01 — sensor
summary: An all-in-one ambient sensor for Home Assistant, on an ESP32-C6. Temperature, humidity, pressure, air quality and light, over any radio you like.
status: in-progress
completed: 2026-04
featured: true
madeToOrder: false
repo: https://github.com/Las-Vejas/Kaze
photo: /assets/img/kaze-back.png
photoAlt: The back of the Kaze board — dark green, with かぜ in white and wind curves running across the copper pour.
gallery:
  - src: /assets/img/kaze-front.png
    alt: The front of the Kaze board, showing the USB-C connector, the ESP32-C6-MINI-1 module and its antenna.
specs:
  - label: Board
    value: 40.0 × 22.1 mm, 2 layer
  - label: MCU
    value: ESP32-C6-MINI-1
  - label: Radios
    value: Wi-Fi, Bluetooth 5, Thread, Zigbee
  - label: Environment
    value: BME680
  - label: Light
    value: TSL25911FN
  - label: Indicators
    value: 5 × WS2812B-2020
  - label: Power
    value: USB-C, MCP73831 charger, 800 mAh LiPo
  - label: Firmware
    value: ESPHome
  - label: Bill of materials
    value: $76.67
---

One board that measures the room and puts it on the network. The BME680 covers
temperature, humidity, pressure and gas; the TSL25911FN covers lux and infrared.
The C6 was chosen for the radios — Zigbee, Thread and Matter alongside Wi-Fi and
Bluetooth, so it can join whatever the house already runs.

It charges over USB-C and runs off an 800 mAh cell, so it can sit where there is
no socket. Five addressable LEDs on the front do the status reporting.

Firmware is ESPHome and still in progress. The board is done.
