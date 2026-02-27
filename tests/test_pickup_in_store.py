import time
import requests
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

LOGIN_URL = "https://b2b-tst1.specialized.com/cs/PickUpInStore"

# credentials may be supplied via environment variables or a .env file
# install python-dotenv and add a .env to the repo root for local development
from dotenv import load_dotenv
import os
load_dotenv()
USER = os.getenv("B2B_USER", "gabriela.kobayashi@objectedge.com")
PASS = os.getenv("B2B_PASS", "Moti_2014@66")


@pytest.fixture
def driver():
    options = webdriver.ChromeOptions()
    # run headless by default; remove option if you want to see the browser
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    drv = webdriver.Chrome(ChromeDriverManager().install(), options=options)
    drv.implicitly_wait(10)
    yield drv
    drv.quit()


def test_pickup_in_store_flow(driver):
    # navigate to login page and submit credentials
    driver.get(LOGIN_URL)

    # NOTE: the login form uses name attributes rather than hardcoded ids
    # the username input has name="userName" and placeholder "Email"
    username = driver.find_element(By.CSS_SELECTOR, "input[name='userName']")
    # update the password selector as needed; adjust the name or placeholder if it differs
    password = driver.find_element(By.CSS_SELECTOR, "input[name='password']")
    username.send_keys(USER)
    password.send_keys(PASS)
    # the login button has no id; match by text or class
    login_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Přihlásit se')]")
    login_btn.click()
    # allow some extra time for redirects and language picker
    time.sleep(5)
    current = driver.current_url
    # if still on Czech path, navigate to English variant
    if "/cs/" in current:
        en_url = current.replace('/cs/', '/en/')
        driver.get(en_url)
        time.sleep(2)
        current = driver.current_url
    # finally wait for main page content and give extra time for any async loads
    WebDriverWait(driver, 20).until(EC.url_contains("/en"))
    time.sleep(5)  # allow full homepage load
    # change market if dropdown is present
    try:
        market = driver.find_element(By.XPATH, "//span[@title='CYCLE DYNAMICS (2598)']")
        market.click()
        # once the dropdown expands, a search field appears inside #editing-view-port
        try:
            search_field = driver.find_element(By.CSS_SELECTOR, "#editing-view-port input")
            search_field.send_keys("4631438")
            search_field.send_keys("\n")
        except Exception:
            # if it's not a true input, attempt to type into the container
            editable = driver.find_element(By.CSS_SELECTOR, "#editing-view-port")
            editable.send_keys("4631438")
        # after choosing the market, wait for orders table or empty state indicator
        try:
            WebDriverWait(driver, 15).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, "tbody.bopisOrderTable"))
            )
        except Exception:
            pass
        time.sleep(1)
    except Exception:
        # not critical if element not there; test continues
        pass

    # ensure we're on /PickUpInStore page – if login already landed here, skip the menu
    if "/PickUpInStore" not in driver.current_url:
        # hover over the transactions mega menu
        # replace the selector with the actual mega menu element if different
        menu = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "#megaMenuTransactions"))
        )
        ActionChains(driver).move_to_element(menu).perform()

        # wait for dropdown items and click the 7th option (index 6)
        options = WebDriverWait(driver, 10).until(
            EC.visibility_of_all_elements_located((By.CSS_SELECTOR, "#megaMenuTransactions .dropdown-menu a"))
        )
        assert len(options) >= 7, "expected at least 7 dropdown items"
        options[6].click()

        # ensure we're on /PickUpInStore page
        WebDriverWait(driver, 10).until(EC.url_contains("/PickUpInStore"))

    # cascade through status buttons to find orders
    status_buttons = [
        {"label": "current", "xpath": None},
        {"label": "Processing", "xpath": "//button[text()='Processing']"},
        {"label": "Shipped", "xpath": "//button[text()='Shipped']"},
        {"label": "Received", "xpath": "//button[text()='Received']"},
        {"label": "Pickup Ready", "xpath": "//button[text()='Pickup Ready']"},
        {"label": "Completed", "xpath": "//button[text()='Completed']"},
        {"label": "Cancelled", "xpath": "//button[text()='Cancelled']"},
    ]

    order_found = False
    for status in status_buttons:
        # click the status button if not the initial state
        if status["xpath"]:
            try:
                btn = driver.find_element(By.XPATH, status["xpath"])
                btn.click()
                time.sleep(1)
            except Exception:
                # button not found, skip this status
                continue

        # check for bandwidth error
        if "Bandwidth Limit Exceeded" in driver.page_source:
            pytest.fail("UI showed 'Bandwidth Limit Exceeded' message")

        # check for orders in the table
        try:
            rows = driver.find_elements(By.CSS_SELECTOR, "tbody.bopisOrderTable tr")
        except Exception:
            rows = []

        if rows:
            # found at least one order
            first_order_link = rows[0].find_element(By.CSS_SELECTOR, "td.order-id a")
            order_id = first_order_link.text.strip()
            first_order_link.click()

            # wait for order detail card
            detail = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, ".order-details-card"))
            )

            # extract some data from UI to later compare with API
            ui_order_number = detail.find_element(By.CSS_SELECTOR, ".order-number").text.strip()
            assert order_id in ui_order_number

            # build a requests session with cookies from selenium
            session = requests.Session()
            for cookie in driver.get_cookies():
                session.cookies.set(cookie["name"], cookie["value"], domain=cookie.get("domain"))

            api_url = f"https://b2b-tst1.specialized.com/en/api/order_detail/{order_id}"
            resp = session.get(api_url, timeout=15)
            if resp.status_code == 509:
                pytest.fail("API returned 509 Bandwidth Limit Exceeded")
            assert resp.status_code == 200, f"API call failed: {resp.status_code}"
            data = resp.json()

            # simple cross-check
            assert data.get("orderNumber") == order_id
            assert data.get("orderNumber") in ui_order_number

            order_found = True
            break

    assert order_found, "no orders found in any status"
