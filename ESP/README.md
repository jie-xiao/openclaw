# OpenClaw ESP32-S3 Node

基于 ESP32-S3 的 OpenClaw 多功能物联网节点固件 v2.0.0。

## 功能特性

| 功能 | 说明 | 状态 |
|------|------|------|
| 🔤 麦克风 | I2S 数字麦克风，语音采集 | 🔧 规划中 |
| 📷 摄像头 | OV2640 200万像素，拍照/录像 | 🔧 规划中 |
| 🖥️ 屏幕 | ST7789 2.8" TFT 显示屏 | 🔧 规划中 |
| 🌡️ 温湿度 | DHT22 传感器 | 🔧 规划中 |
| 🧭 姿态 | MPU6050 6轴加速度计/陀螺仪 | 🔧 规划中 |
| 📟 继电器 | 1路继电器控制 | 🔧 规划中 |
| 🔘 按钮 | 功能按钮交互 | ✅ 已实现 |
| 🔐 认证 | RSA密钥 + 设备配对 | ✅ 已实现 |
| 💾 存储 | NVS持久化Token | ✅ 已实现 |

## 快速开始

### 1. 硬件准备

- ESP32-S3-DevKitC-1 开发板 (带PSRAM)
- USB Type-C 数据线

### 2. 配置WiFi和Gateway

编辑 `main.cpp`，修改以下配置：

```cpp
// WiFi 配置
const char* WIFI_SSID = "Your_WiFi_SSID";
const char* WIFI_PASSWORD = "Your_WiFi_Password";

// OpenClaw Gateway 配置
const char* GATEWAY_HOST = "192.168.1.100";  // Gateway IP地址
const int GATEWAY_PORT = 18789;              // Gateway端口
```

### 3. 编译上传

使用 PlatformIO：

```bash
cd ESP
pio run --target upload
pio device monitor
```

或使用 Arduino IDE：

1. 安装 ESP32 开发板支持 (版本 2.0.11+)
2. 开发板选择: ESP32S3 Dev Module
3. 启用 PSRAM: OPI PSRAM
4. 上传并监控串口

### 4. 配对设备

首次启动时，ESP32 会：

1. 生成唯一的设备ID和RSA密钥对
2. 连接到 WiFi
3. 连接到 Gateway WebSocket
4. 发送配对请求

在 OpenClaw Gateway 端审批设备：

```bash
# 查看待配对设备
openclaw nodes list

# 审批设备
openclaw nodes approve <requestId>
```

审批成功后，ESP32 会收到配对 Token 并保存到 NVS，下次启动自动使用。

## 配对流程

```
┌──────────────┐                    ┌──────────────┐
│    ESP32     │                    │   Gateway    │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │  1. WebSocket Connect             │
       │──────────────────────────────────>│
       │                                   │
       │  2. connect.challenge (nonce)     │
       │<──────────────────────────────────│
       │                                   │
       │  3. connect request (签名认证)     │
       │──────────────────────────────────>│
       │                                   │
       │  4a. 首次配对: node.pair.resolved  │
       │    (等待用户审批)                  │
       │<──────────────────────────────────│
       │                                   │
       │  4b. 已配对: connect.resolved      │
       │    (直接连接成功)                  │
       │<──────────────────────────────────│
       │                                   │
       │  5. node.invoke.request (命令)    │
       │<──────────────────────────────────│
       │                                   │
       │  6. response (执行结果)           │
       │──────────────────────────────────>│
       │                                   │
```

## 认证机制

### 设备认证载荷 (v3格式)

```
v3|{deviceId}|{clientId}|{clientMode}|{role}|{scopes}|{signedAtMs}|{token}|{nonce}|{platform}|{deviceFamily}
```

### 签名流程

1. 构建 v3 格式的认证载荷字符串
2. 对载荷进行 SHA256 哈希
3. 使用 RSA-2048 私钥签名
4. 签名结果 Base64 编码

## 支持的命令

### sensor.read

读取传感器数据。

**请求示例：**
```json
{
  "command": "sensor.read"
}
```

**响应示例：**
```json
{
  "nodeId": "esp32-s3-node001",
  "sensors": {
    "rssi": -45,
    "uptime": 3600,
    "freeHeap": 245760,
    "temperature": 25.5,
    "humidity": 65.0
  }
}
```

### camera.snap

拍照。

**请求示例：**
```json
{
  "command": "camera.snap"
}
```

### device.info

获取设备信息。

**请求示例：**
```json
{
  "command": "device.info"
}
```

**响应示例：**
```json
{
  "nodeId": "esp32-s3-node001",
  "displayName": "ESP32-S3 Node",
  "version": "2.0.0",
  "platform": "esp32",
  "ip": "192.168.1.105",
  "rssi": -45,
  "uptime": 3600,
  "freeHeap": 245760,
  "paired": true
}
```

### system.notify

发送通知消息。

**请求示例：**
```json
{
  "command": "system.notify",
  "paramsJSON": "{\"message\":\"Hello ESP32!\"}"
}
```

## 硬件连接

### 引脚分配

```
摄像头 OV2640:
- D0-D7: GPIO 0-7
- XCLK: GPIO 15
- PCLK: GPIO 16
- VSYNC: GPIO 17
- HREF: GPIO 18
- PWDN: GPIO 21
- RESET: GPIO 20
- SDA: GPIO 22
- SCL: GPIO 23

显示屏 ST7789:
- SCL: GPIO 39
- SDA: GPIO 38
- RST: GPIO 48
- DC: GPIO 40
- CS: GPIO 41
- BLK: GPIO 45

麦克风 INMP441 (I2S):
- WS: GPIO 10
- SCK: GPIO 9
- SD: GPIO 8

MPU6050 (I2C):
- SDA: GPIO 10
- SCL: GPIO 9
- INT: GPIO 3

DHT22:
- DATA: GPIO 4

继电器:
- IN1: GPIO 5

按钮:
- BOOT: GPIO 0
- RST: GPIO 2

状态LED:
- BUILTIN: GPIO 2
```

## 故障排除

### 无法连接WiFi

- 检查WiFi SSID和密码是否正确
- 确保2.4GHz频段（ESP32不支持5GHz）
- 检查WiFi信号强度

### 无法连接Gateway

- 确保Gateway正在运行
- 检查Gateway IP和端口配置
- 检查防火墙设置

### 配对失败

- 检查Gateway日志: `openclaw logs`
- 检查设备是否在待审批列表中
- 尝试清除配对信息重新配对

### 清除配对信息

```cpp
// 在setup()中添加：
preferences.begin("openclaw", false);
preferences.clear();
preferences.end();
```

## 开发指南

### 添加新命令

1. 在 `NODE_COMMANDS` 数组中添加命令名
2. 在 `handleInvokeRequest()` 中添加命令处理
3. 实现命令处理函数

示例：

```cpp
const char* NODE_COMMANDS[] = {
    "sensor.read",
    "mycommand"  // 添加新命令
};

void handleInvokeRequest(String id, String command, String paramsJSON) {
    // ...
    else if (command == "mycommand") {
        cmdMyCommand(id, paramsJSON);
    }
}

void cmdMyCommand(String reqId, String paramsJSON) {
    // 实现命令逻辑
    String payload = "{\"result\":\"ok\"}";
    sendResponse(reqId, true, payload);
}
```

### 添加传感器

参考 `cmdSensorRead()` 函数，添加传感器读取逻辑。

## 版本历史

### v2.0.0 (2026-03-04)

- ✅ 完整重写认证流程
- ✅ 正确的v3认证载荷格式
- ✅ RSA签名实现
- ✅ NVS Token持久化
- ✅ 完善的WebSocket帧处理
- ✅ 命令处理框架

### v1.0.0

- 初始版本
- 基础WebSocket连接
- 简单的配对流程

## 许可证

MIT License
