const { expect } = require('@playwright/test');

async function findFirstOrder(page) {
  // waits for page main and debug logs
  await page.waitForSelector('main', { state: 'visible', timeout: 10000 }).catch(() => {});
  console.log('Current URL:', page.url());
  const pageContent = await page.textContent('body');
  if (pageContent.includes('Showing 0 results')) {
    console.log('WARNING: Page shows "Showing 0 results" - no orders available');
  }
  const tableExists = await page.locator('tbody.bopisOrderTable').count();
  console.log('Table tbody.bopisOrderTable found:', tableExists);

  const statusButtons = [
    { label: 'current', selector: null },
    { label: 'Processing', selector: 'button:has-text("Processing")' },
    { label: 'Shipped', selector: 'button:has-text("Shipped")' },
    { label: 'Received', selector: 'button:has-text("Received")' },
    { label: 'Pickup Ready', selector: 'button:has-text("Pickup Ready")' },
    { label: 'Completed', selector: 'button:has-text("Completed")' },
    { label: 'Cancelled', selector: 'button:has-text("Cancelled")' },
  ];

  for (const status of statusButtons) {
    if (status.selector) {
      const btn = page.locator(status.selector);
      if (await btn.count()) {
        console.log(`Clicking status button: ${status.label}`);
        await btn.first().click();
        await page.waitForTimeout(1000);
        await page.waitForSelector('td.loading-text', { state: 'hidden', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1000);
      } else {
        console.log(`Status button not found: ${status.label}`);
        continue;
      }
    }

    if (await page.locator('text=Bandwidth Limit Exceeded').count() > 0) {
      throw new Error("UI showed 'Bandwidth Limit Exceeded' message");
    }

    const rows = await page.$$('tbody.bopisOrderTable tr');
    console.log(`Rows found in status "${status.label}":`, rows.length);
    if (rows.length) {
      const firstRowHTML = await rows[0].innerHTML();
      console.log(`First row HTML: ${firstRowHTML.substring(0, 200)}`);

      let firstOrderSpan = await rows[0].$('span');
      let orderId = null;
      if (firstOrderSpan) {
        orderId = (await firstOrderSpan.innerText()).trim();
        console.log(`Found order: ${orderId}`);
        console.log('Clicking on order ID to open modal...');
        await firstOrderSpan.click();
        console.log('Waiting for order details modal...');
      }
      if (!orderId) {
        console.log('No order found in first row, skipping');
        continue;
      }

      const modal = await page.waitForSelector('.Modal_Wrapper.OrderDetailsModal', { state: 'visible', timeout: 10000 }).catch(async () => {
        console.log('Modal not found with expected selector, trying alternative...');
        return await page.waitForSelector('.sbcOrderDetails', { state: 'visible', timeout: 5000 }).catch(() => null);
      });
      if (!modal) {
        console.log('Order details modal not found, skipping');
        continue;
      }
      console.log('Modal opened successfully');

      // validate API using the browser context's request helper
      const apiContext = page.context().request;
      // call the correct custom endpoint with orderId as query param
      const resp = await apiContext.get(
        `https://b2b-tst1.specialized.com/ccstorex/custom/v1/order_detail?orderId=${orderId}`,
        { timeout: 15000 }
      );
      if (resp.status() === 509) {
        throw new Error('API returned 509 Bandwidth Limit Exceeded');
      }
      console.log(`Order detail API status: ${resp.status()}`);
      const respBody = await resp.text();
      console.log('Order detail API body length:', respBody.length);
      expect(resp.status()).toBe(200);
      let data;
      try {
        data = JSON.parse(respBody);
      } catch (e) {
        data = {};
      }
      expect(Object.keys(data).length).toBeGreaterThan(0);

      return orderId;
    }
  }
  return null;
}

module.exports = { findFirstOrder };