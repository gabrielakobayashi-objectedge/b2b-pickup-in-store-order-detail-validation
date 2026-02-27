const { test, expect } = require('@playwright/test');

// helpers
const { login } = require('./helpers/login');
const { selectMarket } = require('./helpers/market');
const { goToPickUpInStore } = require('./helpers/navigation');
const { findFirstOrder } = require('./helpers/order');

// the single high-level test just orchestrates the helpers
test('pickup in store flow', async ({ page }) => {
  await login(page);
  await selectMarket(page);
  await goToPickUpInStore(page);
  const orderId = await findFirstOrder(page);
  expect(orderId).not.toBeNull();
});