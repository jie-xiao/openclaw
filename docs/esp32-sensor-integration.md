# ESP32 多功能节点集成设计方案

## 1. 项目概述

### 1.1 目标

将 ESP32-S3（带摄像头、麦克风、显示屏）作为多功能物联网节点，集成以下能力：
- 🎤 **麦克风**：语音采集、语音识别、TTS 语音播报
- 📷 **摄像头**：拍照、录像、实时视频流
- 🖥️ **屏幕**：状态显示、二维码展示、UI 交互
- 🌡️ **传感器**：温湿度、光照等环境数据

通过 HTTP/WebSocket 协议与 OpenClaw Gateway 通信，利用 AI 能力实现智能交互。

### 1.2 硬件规格 (ESP32-S3)

| 组件 | 型号 | 说明 |
|------|------|------|
| 主控 | ESP32-S3-WROOM-1 | Xtensa 32-bit LX7 双核，240MHz |
| 内存 | 512KB SRAM | 8MB PSRAM |
| 存储 | 4MB Flash | 可外接 SD 卡 |
| 摄像头 | OV2640 / GC0328 | 200 万像素 |
| 麦克风 | INMP441 / SPK0641 | I2S 接口数字硅麦 |
| 显示屏 | ST7789 2.8" | 240×320 TFT |
| 姿态传感器 | MPU6050 | 6轴陀螺仪+加速度计 |
| 环境传感器 | DHT22 | 温湿度传感器 |
| 存储 | TF 卡槽 | 最大 32GB |

### 1.3 常用 ESP32 开发板推荐

基于用户提供的元件参考，推荐以下开发板方案：

| 型号 | 特点 | 适用场景 |
|------|------|----------|
| ESP32-S3-DevKitC-1 | 带 PSRAM，USB Type-C | 主流选择 |
| ESP32-S3-View | 集成显示屏 | 带屏幕项目 |
| ESP32-Cam | 集成摄像头 | 视频监控 |
| FireBeetle-ESP32-S3 | 紧凑型，低功耗 | IoT 项目 |

### 1.3 适用场景

- 智能语音助手
- 家庭安防监控
- 语音控制开关
- 环境监测 + 告警
- 视频门铃/猫眼

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              OpenClaw Gateway                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Claude    │    │   Webhook   │    │   Hooks     │    │  Channels   │  │
│  │  Vision +   │ ←  │   Handler   │ ←  │  Processing │    │ (Telegram/  │  │
│  │  Voice AI   │    │             │    │             │    │  Discord)   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│        ↑                                                            │          │
│        │  ┌─────────────────────────────────────────────────────┐  │          │
│        │  │              OpenAI Whisper (语音识别)            │  │          │
│        │  │              ElevenLabs (TTS 语音播报)            │  │          │
│        │  └─────────────────────────────────────────────────────┘  │          │
│        └───────────────────────────────────────────────────────┘          │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                              WebSocket + HTTP
                                      │
┌─────────────────────────────────────┴───────────────────────────────────────┐
│                                    ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         ESP32-S3 多功能节点                             ││
│  │                                                                          ││
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐          ││
│  │  │ 麦克风   │    │ 摄像头   │    │  屏幕   │    │ 传感器   │          ││
│  │  │ INMP441 │    │ OV2640  │    │ ST7789  │    │ DHT22   │          ││
│  │  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘          ││
│  │       │              │              │              │                    ││
│  │       ↓              ↓              ↓              ↓                    ││
│  │  ┌─────────────────────────────────────────────────────────────────┐  ││
│  │  │                    ESP32 Firmware                              │  ││
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │  ││
│  │  │  │ Audio  │  │ Camera │  │ Display │  │ Sensor │          │  ││
│  │  │  │ Handler│  │ Handler│  │ Handler │  │ Handler│          │  ││
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │  ││
│  │  │       └───────────┴───────────┴───────────┘                  │  ││
│  │  │                        ↓                                    │  ││
│  │  │              ┌─────────────────────┐                       │  ││
│  │  │              │   Network Manager   │                       │  ││
│  │  │              │  HTTP + WebSocket  │                       │  ││
│  │  │              └─────────────────────┘                       │  ││
│  │  └─────────────────────────────────────────────────────────────────┘│
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流向

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              语音交互流程                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   麦克风 ──→ PCM 音频 ──→ HTTP POST ──→ Whisper ──→ 文本 ──→ Claude    │
│                                                   ↑                         │
│                                                   │                         │
│   屏幕 ──← TTS 音频 ──← HTTP 流 ──← 语音合成 ──┘                         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              视觉交互流程                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   摄像头 ──→ JPEG 图片 ──→ HTTP POST ──→ Claude Vision ──→ 分析结果      │
│                                                    │                        │
│                                                    ↓                        │
│   屏幕 ──← 显示结果/二维码 ←───────────────────────┘                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 硬件设计

### 3.1 硬件连接图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ESP32-S3 引脚分配                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────┐         ┌─────────────────────────┐          │
│  │       摄像头 OV2640      │         │      显示屏 ST7789      │          │
│  │         (24P)            │         │        (2.8")           │          │
│  ├─────────────────────────┤         ├─────────────────────────┤          │
│  │  D0/CAM_D0   ── GPIO 0  │         │  SCL       ── GPIO 39  │          │
│  │  D1/CAM_D1   ── GPIO 1  │         │  SDA       ── GPIO 38  │          │
│  │  D2/CAM_D2   ── GPIO 2  │         │  RST      ── GPIO 48  │          │
│  │  D3/CAM_D3   ── GPIO 3  │         │  DC       ── GPIO 40  │          │
│  │  D4/CAM_D4   ── GPIO 4  │         │  CS       ── GPIO 41  │          │
│  │  D5/CAM_D5   ── GPIO 5  │         │  BLK      ── GPIO 45  │          │
│  │  D6/CAM_D6   ── GPIO 6  │         └─────────────────────────┘          │
│  │  D7/CAM_D7   ── GPIO 7  │                                               │
│  │  XCLK       ── GPIO 15  │         ┌─────────────────────────┐          │
│  │  PCLK       ── GPIO 16  │         │      麦克风 INMP441     │          │
│  │  VSYNC      ── GPIO 17  │         │       (I2S)            │          │
│  │  HREF       ── GPIO 18  │         ├─────────────────────────┤          │
│  │  PWDN      ── GPIO 21  │         │  WS       ── GPIO 10   │          │
│  │  RESET     ── GPIO 20  │         │  SCK       ── GPIO 9   │          │
│  └─────────────────────────┘         │  SD       ── GPIO 8   │          │
│                                       │  VDD      ── 3.3V    │          │
│  ┌─────────────────────────┐         │  GND      ── GND     │          │
│  │       传感器 DHT22      │         └─────────────────────────┘          │
│  ├─────────────────────────┤                                               │
│  │  DATA     ── GPIO 4    │         ┌─────────────────────────┐          │
│  │  VDD      ── 3.3V      │         │        DHT22 温湿度     │          │
│  │  GND      ── GND       │         │        (可选)          │          │
│  └─────────────────────────┘         └─────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 PCB 布局建议

```
┌────────────────────────────────────────────────────────────┐
│                     PCB 正面 (Top)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   ESP32-S3   │  │   OV2640     │  │   ST7789     │  │
│  │   模块        │  │   摄像头     │  │   显示屏     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │   INMP441    │  │   DHT22      │                     │
│  │   麦克风      │  │   传感器     │                     │
│  └──────────────┘  └──────────────┘                     │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │         TF 卡槽 (侧面)                 │               │
│  └──────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────┘
```

---

## 4. ESP32 固件设计

### 4.1 软件架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ESP32 Firmware v1.0                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Application Layer                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│  │
│  │  │ Voice       │  │ Camera      │  │ Display     │  │ Sensor      ││  │
│  │  │ Service     │  │ Service     │  │ Service     │  │ Service     ││  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘│  │
│  │         │                │                │                │         │  │
│  │         └────────────────┼────────────────┼────────────────┘         │  │
│  │                          ↓                                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐│  │
│  │  │                      State Machine                              ││  │
│  │  │  IDLE → LISTENING → PROCESSING → RESPONDING → IDLE            ││  │
│  │  └─────────────────────────────────────────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Network Layer                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│  │  │ HTTP Client │  │WebSocket    │  │ OTA Update  │                │  │
│  │  │ (Webhook)  │  │ (Real-time) │  │             │                │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Driver Layer                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│  │
│  │  │ Camera      │  │ I2S Audio   │  │ SPI Display│  │ 1-Wire     ││  │
│  │  │ (esp_camera)│  │ (esp_dsp)  │  │ (ili9341)  │  │ (dht)      ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 核心功能模块

#### 4.2.1 语音交互模块

```cpp
// ============================================================
// 语音采集 - I2S 麦克风
// ============================================================
#include "driver/i2s.h"

#define I2S_WS_PIN       10
#define I2S_SCK_PIN       9
#define I2S_SD_PIN        8
#define I2S_PORT         I2S_NUM_0
#define SAMPLE_RATE     16000
#define BUFFER_SIZE     1024

void audio_init() {
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 8,
        .dma_buf_len = BUFFER_SIZE,
    };

    i2s_pin_config_t pin_config = {
        .bck_io_num = I2S_SCK_PIN,
        .ws_io_num = I2S_WS_PIN,
        .data_out_num = I2S_DATA_OUT_NO_CHANGE,
        .data_in_num = I2S_SD_PIN,
    };

    i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
    i2s_set_pin(I2S_PORT, &pin_config);
}

// 读取音频数据
size_t read_audio_data(uint8_t* buffer, size_t buffer_size) {
    size_t bytes_read = 0;
    i2s_read(I2S_PORT, buffer, buffer_size, &bytes_read, portMAX_DELAY);
    return bytes_read;
}
```

#### 4.2.2 摄像头模块

```cpp
// ============================================================
// 摄像头初始化 - OV2640
// ============================================================
#include "esp_camera.h"

#define CAMERA_PIN_PWDN    21
#define CAMERA_PIN_RESET   20
#define CAMERA_PIN_XCLK    15
#define CAMERA_PIN_SIOD    22
#define CAMERA_PIN_SIOC    23

#define CAMERA_PIN_D0      0
#define CAMERA_PIN_D1      1
#define CAMERA_PIN_D2      2
#define CAMERA_PIN_D3      3
#define CAMERA_PIN_D4      4
#define CAMERA_PIN_D5      5
#define CAMERA_PIN_D6      6
#define CAMERA_PIN_D7      7
#define CAMERA_PIN_VSYNC  17
#define CAMERA_PIN_HREF   18
#define CAMERA_PIN_PCLK   16

camera_config_t camera_config = {
    .pin_pwdn = CAMERA_PIN_PWDN,
    .pin_reset = CAMERA_PIN_RESET,
    .pin_xclk = CAMERA_PIN_XCLK,
    .pin_sscb_sda = CAMERA_PIN_SIOD,
    .pin_sscb_scl = CAMERA_PIN_SIOC,
    .pin_d0 = CAMERA_PIN_D0,
    .pin_d1 = CAMERA_PIN_D1,
    .pin_d2 = CAMERA_PIN_D2,
    .pin_d3 = CAMERA_PIN_D3,
    .pin_d4 = CAMERA_PIN_D4,
    .pin_d5 = CAMERA_PIN_D5,
    .pin_d6 = CAMERA_PIN_D6,
    .pin_d7 = CAMERA_PIN_D7,
    .pin_vsync = CAMERA_PIN_VSYNC,
    .pin_href = CAMERA_PIN_HREF,
    .pin_pclk = CAMERA_PIN_PCLK,
    .xclk_freq_hz = 20000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,
    .pixel_format = PIXFORMAT_JPEG,
    .frame_size = FRAMESIZE_SVGA,  // 800x600
    .jpeg_quality = 12,
    .fb_count = 2,
};

esp_err_t camera_init() {
    return esp_camera_init(&camera_config);
}

// 拍照并返回 JPEG 数据
camera_fb_t* take_photo() {
    return esp_camera_fb_get();
}

// 释放图像缓冲区
void free_photo(camera_fb_t* fb) {
    esp_camera_fb_return(fb);
}
```

#### 4.2.3 显示屏模块

```cpp
// ============================================================
// 显示屏驱动 - ST7789 240x320
// ============================================================
#include "tft_driver.h"

#define TFT_CS       41
#define TFT_DC       40
#define TFT_RST      48
#define TFT_SCK      39
#define TFT_MOSI     38
#define TFT_BACKLIGHT 45

void display_init() {
    tft_init();
    tft_setRotation(1);  // 横向
    tft_fillScreen(TFT_BLACK);
    tft_setBacklight(100);
}

// 显示状态信息
void display_status(const char* status, const char* detail) {
    tft_fillScreen(TFT_BLACK);
    tft_setTextColor(TFT_GREEN, TFT_BLACK);
    tft_setTextSize(2);
    tft_drawString("OpenClaw Node", 10, 10);

    tft_setTextColor(TFT_WHITE, TFT_BLACK);
    tft_setTextSize(1);
    tft_drawString(status, 10, 50);
    tft_drawString(detail, 10, 70);
}

// 显示二维码
void display_qrcode(const char* url) {
    tft_fillScreen(TFT_WHITE);
    // 生成并显示二维码 (需 qrcode 库)
    tft_qrcode(url, 4);
}

// 显示验证码/配对码
void display_pairing_code(const char* code) {
    tft_fillScreen(TFT_BLACK);
    tft_setTextColor(TFT_CYAN, TFT_BLACK);
    tft_setTextSize(3);
    tft_drawString("Pairing:", 10, 50);
    tft_setTextColor(TFT_YELLOW, TFT_BLACK);
    tft_setTextSize(4);
    tft_drawString(code, 30, 100);
}
```

#### 4.2.4 网络通信模块

```cpp
// ============================================================
// OpenClaw 通信 - HTTP/WebSocket
// ============================================================
#include <HTTPClient.h>
#include <WebSocket.h>

struct OpenClawConfig {
    char host[64];
    int port;
    char webhook_token[64];
    char api_token[64];
};

class OpenClawClient {
private:
    OpenClawConfig config;
    WebSocketsClient ws_client;

public:
    void begin(OpenClawConfig& cfg) {
        config = cfg;
    }

    // 发送语音数据到 OpenClaw
    String send_voice(const uint8_t* audio_data, size_t audio_size) {
        HTTPClient http;
        String url = String("http://") + config.host + ":" + config.port + "/hooks/agent";

        http.begin(url);
        http.addHeader("Authorization", "Bearer " + String(config.webhook_token));
        http.addHeader("Content-Type", "audio/wav");

        // 将 PCM 转换为 WAV
        uint8_t* wav_data = convert_to_wav(audio_data, audio_size);

        int code = http.POST(wav_data, audio_size + 44);
        String response = http.getString();
        http.end();

        return response;
    }

    // 发送图片到 OpenClaw Vision
    String send_image(camera_fb_t* fb) {
        HTTPClient http;
        String url = String("http://") + config.host + ":" + config.port + "/hooks/agent";

        http.begin(url);
        http.addHeader("Authorization", "Bearer " + String(config.webhook_token));
        http.addHeader("Content-Type", "image/jpeg");

        int code = http.POST(fb->buf, fb->len);
        String response = http.getString();
        http.end();

        return response;
    }

    // TTS 语音合成 (接收 MP3/PCM 流)
    void play_tts(const char* text) {
        HTTPClient http;
        String url = String("http://") + config.host + ":18789/api/tts";

        http.begin(url);
        http.addHeader("Authorization", "Bearer " + String(config.api_token));
        http.addHeader("Content-Type", "application/json");

        http.addHeader("Accept", "audio/mpeg");

        StaticJsonDocument<256> doc;
        doc["text"] = text;
        doc["voice"] = "alloy";

        String json;
        serializeJson(doc, json);

        int code = http.POST(json);
        if (code == 200) {
            // 播放音频流
            WiFiClient* stream = http.getStreamPtr();
            play_audio_stream(stream);
        }
        http.end();
    }
};
```

#### 4.2.5 主状态机

```cpp
// ============================================================
// 主状态机
// ============================================================
enum NodeState {
    STATE_IDLE,
    STATE_LISTENING,    // 等待语音输入
    STATE_PROCESSING,   // 处理中
    STATE_SPEAKING,    // 语音播报
    STATE_STREAMING    // 视频流
};

NodeState current_state = STATE_IDLE;
unsigned long state_start_time = 0;

void state_machine_loop() {
    switch (current_state) {
        case STATE_IDLE:
            // 等待唤醒词或按钮按下
            if (wake_word_detected() || button_pressed()) {
                change_state(STATE_LISTENING);
            }
            // 显示待机界面
            display_status("Ready", "Say 'Hey OpenClaw'");
            break;

        case STATE_LISTENING:
            // 录音并发送到 OpenClaw
            display_status("Listening...", "");

            if (is_audio_ready()) {
                String response = openclaw.send_voice(audio_buffer, audio_size);
                change_state(STATE_PROCESSING);

                // 解析响应
                parse_and_execute(response);
            }

            // 超时检查
            if (millis() - state_start_time > 10000) {
                change_state(STATE_IDLE);
            }
            break;

        case STATE_PROCESSING:
            display_status("Thinking...", "");
            // 等待 OpenClaw 处理完成
            break;

        case STATE_SPEAKING:
            // TTS 播报响应
            display_status("Speaking...", response_text);
            play_audio_stream(tts_stream);
            change_state(STATE_IDLE);
            break;
    }
}

void change_state(NodeState new_state) {
    current_state = new_state;
    state_start_time = millis();
}
```

---

## 5. OpenClaw 配置

### 5.1 Webhook 配置

```json
{
  "hooks": {
    "enabled": true,
    "token": "esp32-secret-token",
    "path": "/hooks",
    "allowedAgentIds": ["esp32-node", "main"]
  }
}
```

### 5.2 设备能力配置

ESP32 节点会通过 device pairing 声明以下能力：

```json
{
  "nodes": {
    "capabilities": {
      "voice_input": true,
      "voice_output": true,
      "camera": true,
      "display": true,
      "sensors": ["temperature", "humidity"]
    }
  }
}
```

### 5.3 Skill 配置

创建 ESP32 Node Skill:

```markdown
# ESP32 Node Controller

当收到 ESP32 节点的消息时：

## 语音输入处理
1. 解析语音转文本
2. 理解用户意图
3. 执行相应操作

## 支持的命令
- "拍照" - 触发摄像头拍照
- "测量温度" - 读取传感器数据
- "显示二维码" - 在屏幕上显示配对码
- "播放音乐" - TTS 语音播报

## 响应格式
返回 JSON:
{
  "action": "speak|tts|display|camera|sensor",
  "content": "响应内容"
}
```

---

## 6. 通信协议

### 6.1 语音上报

```http
POST /hooks/agent
Authorization: Bearer <token>
Content-Type: audio/wav

[二进制音频数据]
```

响应:
```json
{
  "success": true,
  "runId": "run-xxx",
  "response": {
    "action": "speak",
    "content": "当前温度是 25 度，湿度 60%。"
  }
}
```

### 6.2 图片上报

```http
POST /hooks/agent
Authorization: Bearer <token>
Content-Type: image/jpeg
X-Node-Capability: camera

[二进制图片数据]
```

### 6.3 控制指令

```json
{
  "action": "speak",
  "content": "你好，我是 OpenClaw"
}
```

```json
{
  "action": "display",
  "content": "Hello World",
  "mode": "text"
}
```

```json
{
  "action": "qrcode",
  "content": "https://openclaw.ai/pair/ABC123"
}
```

```json
{
  "action": "camera",
  "mode": "photo"
}
```

---

## 7. 功能场景

### 7.1 场景一：智能语音助手

```
用户: "今天天气怎么样？"

流程:
1. ESP32 麦克风采集语音
2. 发送到 OpenClaw (Whisper 转文本)
3. Claude 处理: "查询天气..."
4. TTS 语音播报: "今天天气晴朗，25 度..."
5. ESP32 喇叭播放
```

### 7.2 场景二：家庭安防监控

```
事件: 移动侦测

流程:
1. 摄像头检测到移动
2. 拍照发送至 OpenClaw
3. Claude Vision 分析图像
4. 判断: "检测到人脸，可能是快递员"
5. 发送告警到 Telegram
6. 用户可通过语音控制
```

### 7.3 场景三：语音控制开关

```
用户: "打开客厅灯"

流程:
1. 语音采集 → OpenClaw
2. 解析意图: "控制继电器 GPIO18 开"
3. 下发指令到 ESP32
4. ESP32 执行: GPIO18 HIGH
5. 反馈: "已打开客厅灯"
```

### 7.4 场景四：物品识别

```
用户: "这是什么？"
(摄像头对准物品)

流程:
1. ESP32 拍照
2. 发送图片到 OpenClaw
3. Claude Vision 识别
4. 返回: "这是一个红色的苹果"
5. TTS 播报结果
```

---

## 8. 安全考虑

### 8.1 认证

- Webhook Token 认证
- API Token 认证
- 设备配对验证

### 8.2 安全传输

- 局域网内: HTTP
- 远程: HTTPS + TLS

### 8.3 隐私

- 本地处理敏感语音 (可选)
- 图像数据即时上传处理

---

## 9. 成本估算

| 组件 | 单价 (CNY) | 数量 | 小计 |
|------|-----------|------|------|
| ESP32-S3 开发板 | 45 | 1 | 45 |
| OV2640 摄像头 | 15 | 1 | 15 |
| ST7789 显示屏 2.8" | 25 | 1 | 25 |
| INMP441 麦克风 | 8 | 1 | 8 |
| MPU6050 姿态传感器 | 6 | 1 | 6 |
| DHT22 温湿度传感器 | 10 | 1 | 10 |
| 继电器模块 | 8 | 1 | 8 |
| 功能按钮 | 2 | 2 | 4 |
| 杜邦线/配件 | 10 | 1 | 10 |
| 5V 电源 | 15 | 1 | 15 |
| 外壳/3D 打印 | 30 | 1 | 30 |
| **合计** | | | **176** |

---

## 10. 实施步骤

### Phase 1: 硬件搭建
1. 购买 ESP32-S3 开发板及配件
2. 连接摄像头、显示屏、麦克风
3. 验证各模块正常工作

### Phase 2: 固件开发
1. 搭建 ESP32 开发环境 (PlatformIO)
2. 实现摄像头驱动
3. 实现 I2S 音频驱动
4. 实现显示屏驱动
5. 实现 HTTP/WebSocket 通信
6. 实现状态机逻辑

### Phase 3: OpenClaw 配置
1. 启用 Webhook
2. 配置消息通道
3. 创建 Node Skill

### Phase 4: 联调测试
1. 语音交互测试
2. 图像上传测试
3. TTS 播报测试
4. 整体流程测试

### Phase 5: 部署优化
1. 优化音频编解码
2. 增加离线语音唤醒
3. 添加 OTA 升级

---

## 11. MPU6050 姿态传感器驱动

### 11.1 MPU6050 简介

MPU6050 是一款 6 轴姿态传感器，集成：
- 3 轴加速度计 (Accelerometer)
- 3 轴陀螺仪 (Gyroscope)

可以获取：
- 加速度 (X, Y, Z)
- 角速度 (X, Y, Z)
- 通过 DMP 计算出的姿态角 (Roll, Pitch, Yaw)

### 11.2 MPU6050 驱动代码

```cpp
// ============================================================
// MPU6050 6轴姿态传感器
// ============================================================
#include <Wire.h>
#include <MPU6050.h>

// I2C 引脚定义
#define MPU6050_SDA_PIN    10
#define MPU6050_SCL_PIN    9
#define MPU6050_IRQ_PIN    3

MPU6050 mpu;

// 姿态数据结构
struct IMUData {
    float accX, accY, accZ;      // 加速度 (g)
    float gyroX, gyroY, gyroZ;  // 角速度 (deg/s)
    float roll, pitch, yaw;      // 姿态角 (度)
    float temperature;           // 温度
};

// 全局数据
IMUData imu_data;

void imu_init() {
    // 初始化 I2C
    Wire.begin(MPU6050_SDA_PIN, MPU6050_SCL_PIN, 400000);

    // 初始化 MPU6050
    mpu.initialize();

    // 设置量程
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);   // ±250 deg/s
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);   // ±2g

    // 使能 DMP
    uint8_t devStatus = mpu.dmpInitialize();

    if (devStatus == 0) {
        mpu.setDMPEnabled(true);

        // 配置中断
        pinMode(MPU6050_IRQ_PIN, INPUT);
        attachInterrupt(digitalPinToInterrupt(MPU6050_IRQ_PIN), dmpDataReady, RISING);
    }
}

// DMP 中断处理
volatile bool mpuInterrupt = false;
void dmpDataReady() {
    mpuInterrupt = true;
}

// 读取 IMU 数据
bool read_imu_data(IMUData* data) {
    if (!mpuInterrupt || !mpu.dmpGetFIFOBytes(fifoBuffer, packetSize)) {
        return false;
    }

    mpuInterrupt = false;

    // 获取加速度原始值
    int16_t ax, ay, az;
    mpu.getAcceleration(&ax, &ay, &az);

    // 获取陀螺仪原始值
    int16_t gx, gy, gz;
    mpu.getRotation(&gx, &gy, &gz);

    // 转换为物理量
    data->accX = (float)ax / 16384.0f;  // ±2g 量程, LSB = 16384
    data->accY = (float)ay / 16384.0f;
    data->accZ = (float)az / 16384.0f;

    data->gyroX = (float)gx / 131.0f;    // ±250 deg/s 量程, LSB = 131
    data->gyroY = (float)gy / 131.0f;
    data->gyroZ = (float)gz / 131.0f;

    // 计算姿态角 (简化版)
    data->roll = atan2(data->accY, data->accZ) * 57.29578f;
    data->pitch = atan2(-data->accX, sqrt(data->accY*data->accY + data->accZ*data->accZ)) * 57.29578f;
    data->yaw = 0;  // 需要磁力计才能计算 yaw

    // 读取温度
    data->temperature = mpu.getTemperature() / 340.0f + 36.53f;

    return true;
}

// 上报姿态数据到 OpenClaw
void report_imu_to_openclaw() {
    read_imu_data(&imu_data);

    StaticJsonDocument<512> doc;
    doc["message"] = "IMU Data: Roll=" + String(imu_data.roll, 1) +
                     " Pitch=" + String(imu_data.pitch, 1) +
                     " Accel=[" + String(imu_data.accX, 2) + "," +
                     String(imu_data.accY, 2) + "," +
                     String(imu_data.accZ, 2) + "]";
    doc["name"] = "ESP32-IMU";
    doc["deliver"] = false;

    String json;
    serializeJson(doc, json);

    // 发送到 OpenClaw
    openclaw.send_message(json);
}
```

### 11.3 MPU6050 应用场景

| 场景 | 功能 |
|------|------|
| 姿态检测 | 检测设备倾斜角度 |
| 运动检测 | 检测突然移动/跌落 |
| 手势控制 | 摇一摇、倾斜控制 |
| 步数计数 | 加速度积分计算步数 |
| 云台稳定 | 保持摄像头水平 |

### 11.4 跌倒检测示例

```cpp
// 跌倒检测
bool detect_fall() {
    read_imu_data(&imu_data);

    // 计算合加速度
    float total_acc = sqrt(imu_data.accX*imu_data.accX +
                           imu_data.accY*imu_data.accY +
                           imu_data.accZ*imu_data.accZ);

    // 跌倒判断: 合加速度突然变小 + 角度变化大
    static float last_acc = 1.0f;
    bool fall_detected = false;

    // 加速度突变检测
    if (abs(total_acc - last_acc) > 0.8f) {
        // 角度变化大
        if (abs(imu_data.roll) > 60 || abs(imu_data.pitch) > 60) {
            fall_detected = true;
        }
    }

    last_acc = total_acc;
    return fall_detected;
}

void check_fall_periodically() {
    if (detect_fall()) {
        // 发送告警到 OpenClaw
        StaticJsonDocument<256> doc;
        doc["message"] = "⚠️ 跌倒检测！请确认安全。";
        doc["deliver"] = true;
        doc["channel"] = "telegram";
        doc["to"] = "用户ID";

        openclaw.send_alert(doc);
    }
}
```

---

## 12. 总结

本方案充分利用 ESP32-S3 的硬件能力，实现了：

| 能力 | 功能 |
|------|------|
| 🎤 麦克风 | 语音采集、语音识别输入 |
| 📷 摄像头 | 拍照、录像、视觉识别 |
| 🖥️ 屏幕 | 状态显示、二维码、UI |
| 🌡️ 传感器 | 温湿度等环境数据 |
| 🧭 姿态传感器 | MPU6050 6轴加速度/陀螺仪 |
| 🔘 按钮 | 物理按键交互 |
| 📟 继电器 | 开关控制 |

### 新增姿态检测能力

- **MPU6050 6轴传感器**: 加速度计 + 陀螺仪
- **姿态解算**: Roll, Pitch, Yaw 角度
- **应用场景**:
  - 设备倾斜检测
  - 跌倒检测告警
  - 运动手势识别
  - 云台稳定控制

通过 OpenClaw 的 AI 能力，实现智能语音交互、视觉分析和自动化控制。

---

*文档版本: 3.0*
*更新日期: 2026-03-02*
*特性: 增加 MPU6050 姿态传感器支持*
*更新日期: 2026-03-02*
*特性: 完整支持麦克风、摄像头、显示屏*
