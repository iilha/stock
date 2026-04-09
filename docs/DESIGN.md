# TWSE Stock Design Document

## Architecture Overview

TWSE Stock is a Progressive Web App (PWA) that provides individual stock lookup for all Taiwan Stock Exchange (TWSE) listed companies. Built with vanilla JavaScript and HTML5 (no map component), the app displays real-time stock prices, daily changes, trading volume, and company information with expandable detail views.

The app fetches live data from TWSE's OpenAPI via a Cloudflare Worker proxy, supporting search across 900+ listed stocks. It features real-time price updates, company metadata, trading statistics, and smart caching for offline access.

## Data Flow

### Data Sources
- **TWSE OpenAPI** (via Cloudflare Worker):
  - Stock prices: `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL`
    - Returns all listed stocks with closing price, change, volume, open, high, low
  - Stock info: `https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL`
    - Returns company name, industry, market cap, P/E ratio, dividend yield
  - Worker at `workers/stock-proxy.js` handles CORS and rate limiting
- **Embedded Static Data**: Industry categories, stock classifications (TSE/OTC)

### Fetch-Render Cycle
1. Page load: Fetch all stock prices + info from TWSE API via Cloudflare Worker
2. Merge price data with company info by stock code
3. Render initial list with search/filter applied (default: all stocks)
4. Auto-refresh: Fetch new prices every 60 seconds during market hours (9:00-13:30 Taiwan time)
5. After-hours: Refresh paused, show last closing prices
6. Search: Filter in-memory data (no additional API call)

### Price Calculation
- Change: `currentPrice - previousClose`
- Change %: `(change / previousClose) * 100`
- Color coding: Red (positive gain), Green (negative loss), Gray (unchanged)
  - Note: Taiwan uses red=up, green=down (opposite of Western convention)

## UI Components

### Navigation Header
- Language toggle button (EN/中文)
- Active state highlighting

### Search Bar
- Text input with fuzzy matching on stock code/name
- Search icon with clear button (X)
- Placeholder: "Search stock code or name" (e.g., "2330" or "TSMC")
- Real-time filtering as user types

### Stock List
- Scrollable list of stock rows (virtualized for performance with 900+ items)
- Each row shows:
  - Stock code + name (Chinese/English)
  - Current price (NT$)
  - Daily change + change % (color-coded: red up, green down)
  - Volume (formatted: 12.5M, 340K)
- Click to expand: shows additional details inline

### Expandable Details
- Click row to expand inline (accordion-style)
- Additional fields:
  - Open, High, Low prices
  - Company name (full)
  - Industry sector
  - Market cap (NT$ billions)
  - P/E ratio
  - Dividend yield (%)
- Collapse button (↑)

### Market Status Indicator
- Banner at top shows market status: "Market Open" (red) / "Market Closed" (gray)
- During closed hours: "Showing last closing prices"
- Auto-refresh paused when market closed

### Loading State
- Skeleton screens during initial load
- Shimmer animation for loading rows
- "Refreshing..." indicator during auto-refresh

### Mobile Layout
- Single-column list (optimized for scrolling)
- Large touch targets (48px min height)
- Swipe-to-collapse gesture for expanded rows

## Caching Strategy

### Service Worker (`sw.js`)
| Resource Type | Strategy | TTL |
|---------------|----------|-----|
| Static assets (HTML, CSS, JS) | Cache-first | 24 hours |
| TWSE API stock prices | Stale-while-revalidate | 60 seconds |
| TWSE API stock info | Cache-first | 24 hours |

### Stale-While-Revalidate Logic (Prices)
1. Check cache first, return cached prices immediately if available
2. Fetch fresh data in background, update cache
3. If cache miss, wait for network response
4. On network failure, serve stale cache (up to 5 minutes old)
5. Show "Offline" indicator when serving stale data

### Cache-First Logic (Company Info)
- Company metadata rarely changes (names, industries, etc.)
- Cache for 24 hours, only fetch if cache miss or expired
- On network failure, serve stale cache (up to 7 days old)

### Market Hours Detection
- Check Taiwan time (UTC+8): market open 9:00-13:30 weekdays
- Auto-refresh enabled only during market hours (every 60 seconds)
- After-hours: pause refresh, cache lasts until next market open
- Weekend/holidays: no refresh, cached data valid until next trading day

## Localization

### Language Toggle
- Default: `navigator.language` (zh-TW/zh-CN → Chinese, else English)
- Persistence: `localStorage.setItem('stock-lang', lang)`
- Text elements: `data-en` and `data-zh` attributes
- Stock names: Chinese by default, English available (e.g., "台積電" / "TSMC")
- Currency: Always NT$ (Taiwan standard)

### Bilingual Rendering
```javascript
function renderStockName(stock, lang) {
  return lang === 'zh' ? stock.name : stock.nameEn || stock.name;
}
```

## Native Wrappers

### Android WebView
- Loads `file:///android_asset/index.html` from APK assets
- WebView settings: JavaScript enabled, DOM storage, hardware acceleration
- JavaScript bridge: `Android.shareStock(code, price)` for native share sheet
- Background sync: Fetch price updates during market hours (WorkManager, every 5 minutes)
- Widget: Home screen widget shows user's watchlist stocks

### iOS WKWebView
- Loads local HTML via `WKWebView.loadFileURL()` from app bundle
- Configuration: `allowsInlineMediaPlayback`, `allowsBackForwardNavigationGestures`
- Swift bridge: `window.webkit.messageHandlers.shareStock.postMessage(data)`
- Background fetch: BGTaskScheduler for price updates (every 5 minutes during market hours)
- Today Widget: Shows user's watchlist with current prices

### Asset Sync
- CI/CD: GitHub Actions copies web build to native repos on merge
- Git submodule: `ios/Stock/Resources/` and `android/app/src/main/assets/`
- Build script validates TWSE API response parsing

## State Management

### localStorage Keys
| Key | Purpose | Values |
|-----|---------|--------|
| `stock-lang` | Language preference | `'en'` \| `'zh'` |
| `stock-watchlist` | User's favorite stocks | JSON array: `['2330', '2317', ...]` |
| `stock-search-query` | Last search query | String (e.g., "TSMC") |
| `stock-last-prices` | Cached price data | JSON: `{prices, timestamp}` |

### In-Memory State
- `allStocks`: Array of all stocks with prices and info (900+ items)
- `filteredStocks`: Subset after search filter applied
- `expandedRows`: Set of currently expanded stock codes
- `refreshTimer`: `setInterval()` ID for 60-second refresh cycle
- `marketOpen`: Boolean indicating if Taiwan market currently open

### State Persistence
- Language, watchlist: persisted to localStorage on change
- Search query: persisted to localStorage (restored on page reload)
- Price data: cached by service worker (60-second TTL during market hours)
- Expanded rows: not persisted (ephemeral UI state)

### Performance Optimization
- Virtual scrolling: Only render visible rows (100 at a time) for smooth scrolling with 900+ stocks
- Debounced search: 300ms delay before filtering (prevents lag during fast typing)
- Worker thread: Parse large API responses in Web Worker to avoid blocking main thread

### Cache Invalidation
- Time-based: 60-second TTL during market hours, 24-hour TTL after-hours
- Manual refresh: Pull-to-refresh gesture clears cache, forces fetch
- Market status change: Cache cleared at market open/close transitions
- Version-based: Service worker cache versioned by CACHE_VERSION constant

## Future Plan

### Short-term
- Add stock watchlist with quick access
- Implement price alert notifications
- Add intraday price chart (candlestick)
- Show sector/industry classification

### Medium-term
- Technical analysis indicators (MA, RSI, MACD)
- Financial statement summary (revenue, EPS)
- Earnings calendar
- Peer comparison within same industry

### Long-term
- AI-powered stock screening
- Sentiment analysis from news
- Portfolio management
- Options chain display

## TODO

- [ ] Add watchlist feature with localStorage
- [ ] Implement intraday chart using TWSE tick data
- [ ] Add sector/industry filter
- [ ] Show 52-week high/low
- [ ] Add financial ratio comparison
- [ ] Implement price alert notification
- [ ] Add dark mode
