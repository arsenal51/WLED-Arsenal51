#pragma once

// WiFi Settings & Branding
#define WLED_AP_SSID "Orbiter"
#define WLED_AP_PASS "deepspace"
#define WLED_VERSION 1.0.1
// NOTE: unquoted - it is stringified via TOSTRING(WLED_VERSION). Quoting it embeds
// literal quotes into the version string and breaks the settings populate script.
#define WLED_HOST_NAME "orbiter"
#define WLED_UI_TITLE "Orbiter"
#undef WLED_BRAND
#define WLED_BRAND "Orbiter"
#define SERVERNAME "Orbiter"

// Override default LED pin to GPIO 13 (headphone-stand data line)
#undef DEFAULT_LED_PIN
#define DEFAULT_LED_PIN 13

// Override default LED count from 30 to 37
#undef DEFAULT_LED_COUNT
#define DEFAULT_LED_COUNT 37

// Override default milliampere limit from 850mA to 1500mA
#undef ABL_MILLIAMPS_DEFAULT
#define ABL_MILLIAMPS_DEFAULT 1500
