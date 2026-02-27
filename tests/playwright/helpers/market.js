async function selectMarket(page, marketTitle = 'CYCLE DYNAMICS (2598)', searchValue = '4631438') {
  const market = page.locator(`span[title="${marketTitle}"]`);
  if (await market.count()) {
    await market.first().click();
    const searchInput = page.locator('#editing-view-port input');
    if (await searchInput.count()) {
      await searchInput.fill(searchValue);
      await searchInput.press('Enter');
    } else {
      const container = page.locator('#editing-view-port');
      if (await container.count()) {
        await container.first().type(searchValue);
        await container.first().press('Enter');
      }
    }

    // wait for orders table to appear
    await page.waitForSelector('tbody.bopisOrderTable', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
}

module.exports = { selectMarket };