// eslint-disable-next-line no-unused-vars
const { expect } = require('@playwright/test');
// load credentials from environment file when available
require('dotenv').config();

async function login(page) {
  const LOGIN_URL = 'https://b2b-tst1.specialized.com/cs/PickUpInStore';
  const USER = process.env.B2B_USER || 'gabriela.kobayashi@objectedge.com';
  const PASS = process.env.B2B_PASS || 'Moti_2014@66';

  await page.goto(LOGIN_URL);
  await page.fill('input[name="userName"]', USER);
  await page.fill('input[name="password"]', PASS);

  // click the login button by its visible text and wait a moment for navigation
  await page.click('button:has-text("P\u0159ihl\u00E1sit se")');
  await page.waitForTimeout(5000);

  let curUrl = page.url();
  if (!/\/en/.test(curUrl)) {
    const lang = page.locator('a:has-text("English")');
    if (await lang.count()) {
      await lang.first().click();
      await page.waitForTimeout(3000);
      curUrl = page.url();
    }
  }

  // allow the portal to finish loading
  await page.waitForTimeout(5000);
}

module.exports = { login };