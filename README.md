English | [繁體中文](README_zh.md)

# TWSE Stocks

Taiwan stock market individual stock lookup with real-time data from Taiwan Stock Exchange (TWSE).

**Live URL:** https://oouyang.github.io/stock/

## Features

- **Stock Search**: Search by stock code (e.g., 2330) or company name (e.g., TSMC)
- **Expandable Detail Cards**: Click any stock to reveal detailed information:
  - Price section: Close, Change, Open, High, Low, Month Average
  - Volume section: Trading volume, Transaction count
  - Valuation section: P/E Ratio, Dividend Yield, P/B Ratio
- **Live Data**: Real-time stock data from TWSE OpenAPI via Cloudflare Worker proxy
- **Bilingual Support**: Toggle between English and Traditional Chinese (EN/中文)
- **PWA**: Installable Progressive Web App with offline caching
- **Responsive Design**: Mobile-friendly interface with optimized layouts

## Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5/CSS3/JavaScript | All inline, no build system required |
| Service Worker | Offline caching (cache-first for static, stale-while-revalidate for API) |
| PWA Manifest | Native app-like experience |
| Cloudflare Worker | TWSE API proxy (CORS bypass + data merging) |

## Quick Start

No dependencies required. Serve with any static file server:

```bash
# Python
python3 -m http.server 8010

# Node.js
npx serve . -p 8010

# PHP
php -S localhost:8010
```

Open `http://localhost:8010` in a browser.

## File Structure

```
stock/
├── index.html          # Main stock list page (all inline CSS/JS)
├── manifest.webapp     # PWA manifest
├── sw.js               # Service worker (cache-first + stale-while-revalidate)
├── img/                # PWA icons (32px-512px)
│   ├── icon-32.png
│   ├── icon-180.png
│   └── icon-512.png
├── android/            # Native Android wrapper (WebView)
│   ├── app/src/main/java/tw/pwa/stock/MainActivity.java
│   └── sync-web.sh     # Sync web assets to Android
└── ios/                # Native iOS wrapper (WKWebView)
    ├── Stock/Stock/StockApp.swift
    ├── Stock/Stock/WebViewScreen.swift
    └── sync-web.sh     # Sync web assets to iOS
```

## Data Sources

| API | Endpoint | Purpose |
|-----|----------|---------|
| TWSE OpenAPI (Day) | `openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL` | Daily stock data (price, volume, change) |
| TWSE OpenAPI (Yield) | `openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL` | Valuation metrics (P/E, yield, P/B) |
| Cloudflare Worker | `twse-proxy.owen-ouyang.workers.dev/stock-list` | Proxy + merge both APIs, CORS headers |

### Data Schema (Worker Response)

```javascript
{
  "stocks": [
    {
      "code": "2330",           // Stock code
      "name": "台積電",          // Company name
      "price": "685.00",        // Closing price
      "change": "+5.00",        // Daily change
      "open": "680.00",         // Opening price
      "high": "688.00",         // Highest price
      "low": "679.00",          // Lowest price
      "volume": "45231000",     // Trading volume
      "transactions": "12345",  // Transaction count
      "monthAvg": "675.50",     // Monthly average price
      "pe": "18.5",             // P/E Ratio
      "yield": "2.1",           // Dividend Yield (%)
      "pb": "6.8"               // P/B Ratio
    }
  ]
}
```

## Native App Builds

### Android (Package: `tw.pwa.stock`)

```bash
cd android
./sync-web.sh  # Copy web assets to app/src/main/assets
./gradlew assembleRelease
```

APK output: `android/app/build/outputs/apk/release/`

### iOS (Bundle ID: `tw.pwa.Stock`)

```bash
cd ios
./sync-web.sh  # Copy web assets to Stock/Stock/www
open Stock.xcodeproj  # Build in Xcode
```

## Testing

- **Desktop**: Chrome DevTools > Application > Service Workers, Manifest
- **Mobile**: Chrome Remote Debugging (`chrome://inspect`)
- **PWA Install**: Chrome > Install App icon in address bar
- **Offline**: DevTools > Network > Offline mode

## Caching Strategy

| Resource | Strategy | Cache Key |
|----------|----------|-----------|
| Static assets (HTML, icons) | Cache-first | `stock-static-v1` |
| TWSE API responses | Stale-while-revalidate | `stock-api-v1` |

## Development Notes

- No build system or dependencies
- Pure ES6+ JavaScript (const/let, async/await, template literals)
- CSS Grid/Flexbox for responsive layout
- localStorage for language preference (`stock-lang`)
- All code inline in `index.html` for simplicity

## License

Public domain. No attribution required.
