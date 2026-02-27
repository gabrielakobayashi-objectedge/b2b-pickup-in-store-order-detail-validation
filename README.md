# 📦 Pick Up In Store (PUIS) Automation Suite

**Repository Name:** `b2b-pickup-in-store-order-detail-validation`

This repository contains a cross-platform automation suite (Python/Selenium & Playwright/JS) 
designed to validate the **Pick Up In Store** fulfillment workflow on the Specialized B2B portal. 
The tests exercise login, navigation, order selection and detail verification.

## 🚀 Quick Start

### Environment configuration

Credentials are pulled from environment variables. Create a `.env` file in the repository root containing the following keys (no actual values are shown here):

```text
B2B_USER=your-b2b-username
B2B_PASS=your-b2b-password
```

Don't commit real secrets; `.env` is ignored by git.

### Python / Selenium

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate         # Windows
   # or source venv/bin/activate      # macOS/Linux
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the suite:
   ```bash
   pytest -v
   ```

### Playwright / JavaScript

1. Install Node packages and browsers (dotenv is pulled in as a dev dependency):
   ```bash
   npm install
   ```
2. Ensure `.env` contains the `B2B_USER` and `B2B_PASS` values (or export them directly).
3. Execute the tests:
   ```bash
   npm test
   ```

---

## 🧠 Strategic Workflow: The RPI Approach

This project follows the **Research → Plan → Implement (RPI)** framework so that the
README serves as the source‑of‑truth for why the code exists and how it behaves.

### 1. Research (Discovery)

* Mapped the B2B portal's critical path: authentication, language context (switch to English),
  and the hover‑activated Transactions mega menu.
* Identified data state: orders are presented in tabbed views (Pending, Ready, Completed).
  Automation must iterate through tabs to locate actionable rows.
* Captured selectors and backend API endpoints (`order_detail`) used in assertions.

### 2. Plan (Test Design)

* Use a `moveTo`/`hover` strategy to reveal the dropdown menu.
* Dynamically scan each status tab instead of hardcoding order IDs.
* Define two outcomes:
  * **Order found:** navigate to detail card, assert UI elements, and validate the intercepted
    `order_detail` API response (Playwright).
  * **No orders:** gracefully record the state without throwing an unhandled exception.
* Architect tests to be data‑driven and resilient to UI timing issues.

### 3. Implement (Technical Execution)

* **Python/Selenium** implementation lives at `tests/test_pickup_in_store.py`.
  It uses explicit waits for element stability and a procedural style.
* **Playwright/JavaScript** resides under `tests/playwright/` with a lightweight
  page object and helper modules for login, navigation, order lookup and API interception.
* Helpers encapsulate repeated actions and promote reuse.
* Playwright’s auto‑waiting features simplify interaction timing.

---

## 🛠️ Automation Logic Flow

1. **Login:** Authenticate using valid B2B credentials.
2. **Language Toggle:** Ensure the interface is in English for consistent selectors.
3. **Navigation:** Hover over **Transactions** → click **Pick Up In Store**.
4. **Data Validation:**
   * Traverse tabs to locate at least one order row.
   * Select the first available order and verify the content of the order detail card.
5. **API Sync:** (playwright only) intercept the `order_detail` network call and assert
   the response payload matches expectations.

---

> 💡 *REMINDER:* update this README whenever tests are added or selectors change. This
> ensures the documentation reflects the current implementation and maintains the RPI mindset.
