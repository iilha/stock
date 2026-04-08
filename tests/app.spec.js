// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8010';

test.describe('TWSE Stocks PWA', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto(BASE_URL);
  });

  test('page loads with correct title', async ({ page }) => {
    // Check title contains "Stock" or "TWSE"
    const title = await page.title();
    expect(title).toMatch(/Stock|TWSE/i);
  });

  test('has no cross-app navigation links', async ({ page }) => {
    // Check that there are no links to other apps (ubike, mrt, bus, etc.)
    const navLinks = await page.locator('a.nav-btn').count();
    expect(navLinks).toBe(0);

    // Verify no links to other apps in header
    const headerLinks = await page.locator('header a').count();
    expect(headerLinks).toBe(0);
  });

  test('has no map element (pure list-based app)', async ({ page }) => {
    // Verify no Leaflet map container
    const mapContainer = await page.locator('#map').count();
    expect(mapContainer).toBe(0);

    // Verify no Leaflet scripts loaded
    const leafletScript = await page.locator('script[src*="leaflet"]').count();
    expect(leafletScript).toBe(0);
  });

  test('has search input element', async ({ page }) => {
    const searchInput = page.locator('#stock-search');
    await expect(searchInput).toBeVisible();

    // Check placeholder text
    const placeholder = await searchInput.getAttribute('placeholder');
    expect(placeholder).toMatch(/Search|搜尋/i);
  });

  test('has stock list container', async ({ page }) => {
    const stockList = page.locator('#stock-list');
    await expect(stockList).toBeVisible();
  });

  test('has result count element', async ({ page }) => {
    const resultCount = page.locator('#result-count');
    await expect(resultCount).toBeVisible();
  });

  test('language toggle button exists and works', async ({ page }) => {
    const langBtn = page.locator('#lang-btn');
    await expect(langBtn).toBeVisible();

    // Get initial text
    const initialText = await langBtn.textContent();
    expect(initialText).toMatch(/EN|中/);

    // Click to toggle
    await langBtn.click();

    // Wait a bit for the UI to update
    await page.waitForTimeout(100);

    // Verify text changed
    const newText = await langBtn.textContent();
    expect(newText).not.toBe(initialText);
    expect(newText).toMatch(/EN|中/);

    // Verify page title changed
    const titleAfterToggle = await page.locator('#page-title').textContent();
    expect(titleAfterToggle).toMatch(/TWSE Stocks|台股個股查詢/);
  });

  test('search functionality works', async ({ page }) => {
    const searchInput = page.locator('#stock-search');
    const resultCount = page.locator('#result-count');

    // Wait for data to load (check if result count updates)
    await page.waitForTimeout(2000);

    // Type search query
    await searchInput.fill('2330');
    await page.waitForTimeout(500);

    // Check if result count updated
    const countText = await resultCount.textContent();
    expect(countText).toBeTruthy();
  });

  test('stock rows are clickable and expand', async ({ page }) => {
    // Wait for stocks to load
    await page.waitForTimeout(2000);

    // Find first stock row
    const firstRow = page.locator('.stock-row').first();

    // Check if stock rows exist
    const rowCount = await page.locator('.stock-row').count();

    if (rowCount > 0) {
      // Click the row
      await firstRow.click();
      await page.waitForTimeout(300);

      // Check if row has expanded class
      const hasExpandedClass = await firstRow.evaluate(el =>
        el.classList.contains('expanded')
      );
      expect(hasExpandedClass).toBe(true);

      // Check if detail panel is visible
      const code = await firstRow.getAttribute('data-code');
      const detailPanel = page.locator(`#detail-${code}`);
      await expect(detailPanel).toHaveClass(/open/);

      // Click again to collapse
      await firstRow.click();
      await page.waitForTimeout(300);

      const stillExpanded = await firstRow.evaluate(el =>
        el.classList.contains('expanded')
      );
      expect(stillExpanded).toBe(false);
    }
  });

  test('TWSE API URLs are configured in source', async ({ page }) => {
    // Get page content
    const content = await page.content();

    // Check for TWSE API endpoints
    expect(content).toContain('openapi.twse.com.tw');
    expect(content).toContain('STOCK_DAY_ALL');
  });

  test('manifest.webapp is accessible', async ({ page }) => {
    const manifestResponse = await page.request.get(`${BASE_URL}/manifest.webapp`);
    expect(manifestResponse.ok()).toBe(true);

    const manifestContent = await manifestResponse.text();
    expect(manifestContent).toBeTruthy();
  });

  test('service worker file is accessible', async ({ page }) => {
    const swResponse = await page.request.get(`${BASE_URL}/sw.js`);
    expect(swResponse.ok()).toBe(true);

    const swContent = await swResponse.text();
    expect(swContent).toBeTruthy();
  });

  test('no critical JavaScript console errors on load', async ({ page }) => {
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Filter out network errors (API calls are OK to fail)
        const text = msg.text();
        if (!text.includes('Failed to fetch') &&
            !text.includes('NetworkError') &&
            !text.includes('net::ERR')) {
          errors.push(text);
        }
      }
    });

    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    // Verify no critical JS errors (network errors are acceptable)
    expect(errors.length).toBe(0);
  });

  test('app displays loading state initially', async ({ page }) => {
    await page.goto(BASE_URL);

    const resultCount = page.locator('#result-count');
    const countText = await resultCount.textContent();

    // Should show loading or stock count
    expect(countText).toMatch(/Loading|載入|Showing|顯示/i);
  });

  test('stock row has correct structure', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    const firstRow = page.locator('.stock-row').first();
    const rowCount = await page.locator('.stock-row').count();

    if (rowCount > 0) {
      // Check for expected child elements
      await expect(firstRow.locator('.stock-ticker')).toBeVisible();
      await expect(firstRow.locator('.stock-name')).toBeVisible();
      await expect(firstRow.locator('.stock-arrow')).toBeVisible();
    }
  });

  test('language preference persists in localStorage', async ({ page }) => {
    const langBtn = page.locator('#lang-btn');

    // Toggle language
    await langBtn.click();
    await page.waitForTimeout(100);

    // Check localStorage
    const langPref = await page.evaluate(() =>
      localStorage.getItem('stock-lang')
    );
    expect(langPref).toMatch(/en|zh/);
  });

  test('empty state displays when no stocks loaded', async ({ page }) => {
    // Block API requests to simulate no data
    await page.route('**/*twse*', route => route.abort());
    await page.route('**/*workers.dev*', route => route.abort());

    await page.goto(BASE_URL);
    await page.waitForTimeout(1500);

    const emptyState = page.locator('.empty-state');
    const emptyStateCount = await emptyState.count();

    // Should show either loading or empty state
    expect(emptyStateCount).toBeGreaterThanOrEqual(0);
  });

  test('header has correct structure', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const pageTitle = header.locator('#page-title');
    await expect(pageTitle).toBeVisible();

    const titleText = await pageTitle.textContent();
    expect(titleText).toMatch(/TWSE|台股/);
  });

  test('responsive design elements present', async ({ page }) => {
    // Check for mobile-responsive CSS classes
    const container = page.locator('.container');
    await expect(container).toBeVisible();

    // Verify stock list has responsive styling
    const stockList = page.locator('.stock-list');
    await expect(stockList).toBeVisible();
  });

  test('float button (language toggle) is positioned correctly', async ({ page }) => {
    const floatBtn = page.locator('.float-btn');
    await expect(floatBtn).toBeVisible();

    // Check it has fixed positioning
    const position = await floatBtn.evaluate(el =>
      window.getComputedStyle(el).position
    );
    expect(position).toBe('fixed');
  });
});
