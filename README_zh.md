[English](README.md) | 繁體中文

# TWSE Stocks

台灣股市個股查詢系統，提供台灣證券交易所（TWSE）即時資料。

**線上網址：** https://oouyang.github.io/stock/

## 功能特色

- **股票搜尋**：可依股票代號（例如：2330）或公司名稱（例如：台積電）搜尋
- **可展開的詳細卡片**：點擊任何股票即可顯示詳細資訊：
  - 價格區塊：收盤價、漲跌、開盤價、最高價、最低價、月均價
  - 成交量區塊：成交量、成交筆數
  - 評價指標區塊：本益比、殖利率、股價淨值比
- **即時資料**：透過 Cloudflare Worker 代理從 TWSE OpenAPI 取得即時股票資料
- **雙語支援**：可在英文與繁體中文之間切換（EN/中文）
- **PWA**：可安裝的漸進式網頁應用程式，支援離線快取
- **響應式設計**：行動裝置友善介面，具備最佳化版面配置

## 技術架構

| Technology | Purpose |
|------------|---------|
| HTML5/CSS3/JavaScript | 全部內嵌，無需建置系統 |
| Service Worker | 離線快取（靜態資源採 cache-first，API 採 stale-while-revalidate） |
| PWA Manifest | 原生應用程式般的體驗 |
| Cloudflare Worker | TWSE API 代理（繞過 CORS + 資料合併） |

## 快速開始

無需安裝相依套件。使用任何靜態檔案伺服器即可執行：

```bash
# Python
python3 -m http.server 8010

# Node.js
npx serve . -p 8010

# PHP
php -S localhost:8010
```

在瀏覽器開啟 `http://localhost:8010`。

## 檔案結構

```
stock/
├── index.html          # 主要股票列表頁面（所有 CSS/JS 皆內嵌）
├── manifest.webapp     # PWA manifest
├── sw.js               # Service worker (cache-first + stale-while-revalidate)
├── img/                # PWA 圖示（32px-512px）
│   ├── icon-32.png
│   ├── icon-180.png
│   └── icon-512.png
├── android/            # 原生 Android 封裝（WebView）
│   ├── app/src/main/java/tw/pwa/stock/MainActivity.java
│   └── sync-web.sh     # 同步 web 資源至 Android
└── ios/                # 原生 iOS 封裝（WKWebView）
    ├── Stock/Stock/StockApp.swift
    ├── Stock/Stock/WebViewScreen.swift
    └── sync-web.sh     # 同步 web 資源至 iOS
```

## 資料來源

| API | Endpoint | Purpose |
|-----|----------|---------|
| TWSE OpenAPI (Day) | `openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL` | 每日股票資料（價格、成交量、漲跌） |
| TWSE OpenAPI (Yield) | `openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL` | 評價指標（本益比、殖利率、股價淨值比） |
| Cloudflare Worker | `twse-proxy.owen-ouyang.workers.dev/stock-list` | 代理 + 合併兩個 API，加上 CORS headers |

### 資料結構（Worker 回應）

```javascript
{
  "stocks": [
    {
      "code": "2330",           // 股票代號
      "name": "台積電",          // 公司名稱
      "price": "685.00",        // 收盤價
      "change": "+5.00",        // 當日漲跌
      "open": "680.00",         // 開盤價
      "high": "688.00",         // 最高價
      "low": "679.00",          // 最低價
      "volume": "45231000",     // 成交量
      "transactions": "12345",  // 成交筆數
      "monthAvg": "675.50",     // 月均價
      "pe": "18.5",             // 本益比
      "yield": "2.1",           // 殖利率（%）
      "pb": "6.8"               // 股價淨值比
    }
  ]
}
```

## 原生應用程式建置

### Android (Package: `tw.pwa.stock`)

```bash
cd android
./sync-web.sh  # 複製 web 資源至 app/src/main/assets
./gradlew assembleRelease
```

APK 輸出位置：`android/app/build/outputs/apk/release/`

### iOS (Bundle ID: `tw.pwa.Stock`)

```bash
cd ios
./sync-web.sh  # 複製 web 資源至 Stock/Stock/www
open Stock.xcodeproj  # 在 Xcode 中建置
```

## 測試

- **桌面版**：Chrome DevTools > Application > Service Workers, Manifest
- **行動版**：Chrome Remote Debugging (`chrome://inspect`)
- **PWA 安裝**：Chrome > 網址列中的「安裝應用程式」圖示
- **離線測試**：DevTools > Network > Offline mode

## 快取策略

| Resource | Strategy | Cache Key |
|----------|----------|-----------|
| Static assets (HTML, icons) | Cache-first | `stock-static-v1` |
| TWSE API responses | Stale-while-revalidate | `stock-api-v1` |

## 開發筆記

- 無建置系統或相依套件
- 純 ES6+ JavaScript（const/let、async/await、template literals）
- 使用 CSS Grid/Flexbox 達成響應式版面
- 使用 localStorage 儲存語言偏好設定（`stock-lang`）
- 所有程式碼內嵌於 `index.html` 以求簡潔

## 授權

公共領域。無需註明出處。
