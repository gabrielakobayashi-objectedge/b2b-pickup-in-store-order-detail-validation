const { expect } = require('@playwright/test');

async function goToPickUpInStore(page) {
  if (!page.url().includes('/PickUpInStore')) {
    const menu = await page.waitForSelector('#megaMenuTransactions', { state: 'visible' });
    await menu.hover();
    const allItems = await page.$$('#megaMenuTransactions .dropdown-menu a');
    expect(allItems.length).toBeGreaterThanOrEqual(7);
    await allItems[6].click();
    await expect(page).toHaveURL(/\/PickUpInStore/);
  }
}

module.exports = { goToPickUpInStore };