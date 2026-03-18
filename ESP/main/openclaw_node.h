/**
 * OpenClaw ESP32-S3 Node - Common Header
 * ESP-IDF Framework v4.0.0
 *
 * @date 2026-03-15
 */

#ifndef OPENCLAW_NODE_H
#define OPENCLAW_NODE_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <sys/time.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "freertos/event_groups.h"

#include "esp_system.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "esp_sleep.h"
#include "esp_random.h"
#include "esp_err.h"
#include "esp_intr_alloc.h"
#include "esp_attr.h"

#include "nvs_flash.h"
#include "nvs.h"

#include "driver/gpio.h"
#include "driver/i2c.h"
#include "driver/i2s_std.h"
#include "driver/ledc.h"

#include "mbedtls/md.h"
#include "mbedtls/base64.h"
#include "mbedtls/sha256.h"
#include "mbedtls/ed25519.h"

// ==================== Log Tags ====================
#define TAG_MAIN        "MAIN"
#define TAG_WIFI        "WIFI"
#define TAG_WS          "WS"
#define TAG_CRYPTO      "CRYPTO"
#define TAG_AUDIO       "AUDIO"
#define TAG_CAMERA      "CAM"
#define TAG_SENSOR      "SENSOR"
#define TAG_ES7210      "ES7210"
#define TAG_ES8311      "ES8311"

// ==================== Protocol Version ====================
#define PROTOCOL_VERSION        3

// ==================== Node Info ====================
#define NODE_CLIENT_ID          "node-host"
#define NODE_MODE               "node"
#define NODE_ROLE               "node"
#define NODE_SCOPE              "node.admin"
#define NODE_PLATFORM           "esp32"
#define NODE_DEVICE_FAMILY      "esp32-s3"

// ==================== Configuration from Kconfig ====================
#ifndef CONFIG_GATEWAY_HOST
#define CONFIG_GATEWAY_HOST     "192.168.2.116"
#endif

#ifndef CONFIG_GATEWAY_PORT
#define CONFIG_GATEWAY_PORT     18789
#endif

#ifndef CONFIG_WIFI_SSID
#define CONFIG_WIFI_SSID        "WK2.4G-1H1D1901"
#endif

#ifndef CONFIG_WIFI_PASSWORD
#define CONFIG_WIFI_PASSWORD    "chen580231"
#endif

#ifndef CONFIG_AUDIO_SAMPLE_RATE
#define CONFIG_AUDIO_SAMPLE_RATE    16000
#endif

#ifndef CONFIG_I2C_SDA_PIN
#define CONFIG_I2C_SDA_PIN      1
#endif

#ifndef CONFIG_I2C_SCL_PIN
#define CONFIG_I2C_SCL_PIN      2
#endif

// ==================== I2C Configuration ====================
#define I2C_MASTER_NUM          I2C_NUM_0
#define I2C_MASTER_FREQ_HZ      100000
#define I2C_MASTER_TX_BUF_LEN   0
#define I2C_MASTER_RX_BUF_LEN   0
#define I2C_MASTER_TIMEOUT_MS   1000

// ==================== ES7210 I2C Address ====================
#define ES7210_I2C_ADDR         0x41    // AD0=HIGH, AD1=LOW

// ==================== ES8311 I2C Address ====================
#define ES8311_I2C_ADDR         0x18    // CE pin tied low

// ==================== Audio Configuration ====================
#define AUDIO_SAMPLE_RATE       CONFIG_AUDIO_SAMPLE_RATE
#define AUDIO_BITS_PER_SAMPLE   16
#define AUDIO_CHANNELS          1

// I2S Port assignments
#define I2S_PORT_ADC            I2S_NUM_0   // ES7210 Microphone
#define I2S_PORT_DAC            I2S_NUM_1   // ES8311 Speaker

// MCLK multiplier for ES7210/ES8311
#define MCLK_MULTIPLE           I2S_MCLK_MULTIPLE_256

// ==================== Pin Definitions ====================
// Audio I2S pins (ES7210 Microphone ADC)
#define I2S_MCK_PIN             38
#define I2S_BCK_PIN             14
#define I2S_WS_PIN              13
#define I2S_DI_PIN              12      // Data from ES7210

// Speaker I2S pins (ES8311 DAC)
#define I2S_DO_PIN              21      // Data to ES8311

// Camera pins (GC0308)
#define CAM_PIN_PWDN            -1
#define CAM_PIN_RESET           -1
#define CAM_PIN_XCLK            5
#define CAM_PIN_SIOD            1       // Shared with I2C SDA
#define CAM_PIN_SIOC            2       // Shared with I2C SCL
#define CAM_PIN_D7              9
#define CAM_PIN_D6              4
#define CAM_PIN_D5              6
#define CAM_PIN_D4              15
#define CAM_PIN_D3              17
#define CAM_PIN_D2              8
#define CAM_PIN_D1              18
#define CAM_PIN_D0              16
#define CAM_PIN_VSYNC           3
#define CAM_PIN_HREF            46
#define CAM_PIN_PCLK            7

// Other peripherals
#define LED_PIN                 2
#define BUTTON_PIN              0
#define DHT_PIN                 4

// ==================== Utility Macros ====================
#define ARRAY_SIZE(arr)         (sizeof(arr) / sizeof((arr)[0]))
#define MIN(a, b)               ((a) < (b) ? (a) : (b))
#define MAX(a, b)               ((a) > (b) ? (a) : (b))

// ==================== Types ====================

/**
 * Node capability/command definition
 */
typedef struct {
    const char *name;
    const char *description;
} node_capability_t;

/**
 * Hardware status tracking
 */
typedef struct {
    bool dht22_working;
    bool qmi8658_detected;
    bool camera_working;
    bool microphone_working;
    bool speaker_working;
    bool es7210_detected;
    bool es8311_detected;
    int64_t last_dht_read;
    int64_t last_imu_read;
} hardware_status_t;

/**
 * Connection state enumeration
 */
typedef enum {
    CONN_STATE_DISCONNECTED,
    CONN_STATE_TCP_CONNECTED,
    CONN_STATE_WS_HANDSHAKE_DONE,
    CONN_STATE_AUTH_SENT,
    CONN_STATE_PAIRED
} connection_state_t;

/**
 * Audio buffer structure
 */
typedef struct {
    uint8_t *data;
    size_t len;
    size_t capacity;
} audio_buffer_t;

// ==================== Global Variables ====================
extern hardware_status_t g_hw_status;
extern char g_device_id[65];
extern bool g_paired;
extern bool g_waiting_for_approval;
extern connection_state_t g_conn_state;

// ==================== Function Declarations ====================

// WiFi
esp_err_t wifi_init(void);
esp_err_t wifi_connect(void);
bool wifi_is_connected(void);

// WebSocket
esp_err_t ws_init(void);
esp_err_t ws_connect(const char *host, int port);
void ws_disconnect(void);
bool ws_is_connected(void);
void ws_send_text(const char *data);
void ws_send_binary(const uint8_t *data, size_t len);
void ws_task(void *pvParameters);

// Crypto/Auth
esp_err_t crypto_init(void);
const char *crypto_get_device_id(void);
const char *crypto_get_public_key_pem(void);
char *crypto_sign_data(const char *data);
char *crypto_build_auth_payload(const char *nonce, const char *token);

// Audio
esp_err_t audio_init(void);
esp_err_t audio_deinit(void);
esp_err_t audio_start_recording(void);
esp_err_t audio_stop_recording(audio_buffer_t *buffer);
esp_err_t audio_play_data(const uint8_t *data, size_t len);
esp_err_t audio_play_beep(int frequency_hz, int duration_ms);

// ES7210 (Microphone ADC)
esp_err_t es7210_init(i2c_port_t i2c_port);
bool es7210_is_detected(void);
esp_err_t es7210_configure(uint32_t sample_rate, int bits_per_sample);
esp_err_t es7210_set_gain(int gain_db);
esp_err_t es7210_enable_channel(int channel, bool enable);

// ES8311 (Audio DAC)
esp_err_t es8311_init(i2c_port_t i2c_port);
bool es8311_is_detected(void);
esp_err_t es8311_configure(uint32_t sample_rate, int bits_per_sample);
esp_err_t es8311_set_volume(int volume_percent);
esp_err_t es8311_set_mute(bool mute);

// Camera
esp_err_t camera_init(void);
esp_err_t camera_capture(uint8_t **data, size_t *len, int *width, int *height);
void camera_free_buffer(uint8_t *buffer);

// Sensors
esp_err_t sensors_init(void);
esp_err_t sensor_read_dht22(float *temperature, float *humidity);
void sensor_read_imu(float *ax, float *ay, float *az, float *gx, float *gy, float *gz);

// NVS Storage
esp_err_t storage_init(void);
esp_err_t storage_save_token(const char *token);
esp_err_t storage_load_token(char *token, size_t max_len);
esp_err_t storage_clear_token(void);
esp_err_t storage_save_keys(const uint8_t *pubkey, const uint8_t *privkey);
esp_err_t storage_load_keys(uint8_t *pubkey, uint8_t *privkey);

// Utility
char *base64_encode(const uint8_t *data, size_t len);
char *base64_url_encode(const uint8_t *data, size_t len);
char *generate_uuid(void);
void blink_led(int times, int delay_ms);

#endif // OPENCLAW_NODE_H
