# Main component CMakeLists
idf_component_register(
    SRCS "main.c"
         "wifi_station.c"
         "websocket_client.c"
         "crypto_auth.c"
         "audio_driver.c"
         "camera_driver.c"
         "sensor_driver.c"
    INCLUDE_DIRS "."
    REQUIRES esp_wifi esp_netif esp_event nvs_flash esp_timer esp_camera driver mbedtls esp_http_client json lwip
    PRIV_REQUIRES freertos
)

# Add esp-adf components if available
set(EXTRA_COMPONENT_DIRS "components")
