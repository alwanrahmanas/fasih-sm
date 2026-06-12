import os
import re
import csv
import sys
import time
from playwright.sync_api import sync_playwright

def load_emails(file_path):
    if not os.path.exists(file_path):
        print(f"Error: Email list file '{file_path}' not found.")
        sys.exit(1)
    with open(file_path, "r", encoding="utf-8") as f:
        emails = [line.strip() for line in f if line.strip()]
    return emails

def wait_for_table_load(page):
    # Wait for network requests to finish
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass
    
    # Wait for loader spinners to disappear
    try:
        loaders = page.locator("svg.tabler-icon-loader, svg.tabler-icon-loader-2")
        if loaders.count() > 0:
            loaders.first.wait_for(state="hidden", timeout=5000)
    except Exception:
        pass
        
    # Extra safety buffer for React state rendering
    time.sleep(1.5)

def scrape_page(page, searched_email, csv_writer):
    # Find all data rows in the table body
    rows_locator = page.locator("table tbody tr")
    row_count = rows_locator.count()
    
    if row_count == 0:
        print(f"  No rows found in table.")
        return 0
        
    # Check if first row is a placeholder message (like 'Tidak ada data')
    first_row_text = rows_locator.first.text_content().lower()
    if "tidak ada data" in first_row_text or "empty" in first_row_text or "no data" in first_row_text:
        print(f"  No data matching search.")
        return 0
        
    scraped_count = 0
    for i in range(row_count):
        cols = rows_locator.nth(i).locator("td").all_text_contents()
        
        # Based on our analysis, the table has 17 columns:
        # Col 0: Checkbox
        # Col 1: Kode Identitas
        # Col 2: Nama Keluarga/Bangunan/Usaha
        # Col 3: Alamat Prelist
        # Col 4: Nomor Urut Bangunan / IDSBR
        # Col 5: NIB
        # Col 6: Email
        # Col 7: Skala Usaha / Jenis Prelist
        # Col 8: Jumlah Usaha
        # Col 9: Kode Pos
        # Col 10: Perubahan SLS
        # Col 11: IDSBR UMKM SLS Sama
        # Col 12: Status
        # Col 13: Mode
        # Col 14: Petugas Saat Ini
        # Col 15: Keterangan
        # Col 16: Action Button
        
        if len(cols) >= 16:
            # Clean text values (strip whitespace)
            cleaned_cols = [c.strip() for c in cols]
            
            # Write row to CSV: searched email + table columns (excluding checkbox at index 0 and action at index 16)
            csv_writer.writerow([searched_email] + cleaned_cols[1:16])
            scraped_count += 1
            
    print(f"  Scraped {scraped_count} rows from current page.")
    return scraped_count

def run_scraper(use_test_emails=False):
    email_file = os.path.join("data", "email_mitra_test.txt" if use_test_emails else "email_mitra.txt")
    auth_file = "auth_state.json"
    output_csv = "scraped_data.csv"
    
    emails = load_emails(email_file)
    print(f"Loaded {len(emails)} emails from '{email_file}' to scrape.")
    
    # Prepare CSV file
    csv_headers = [
        "Searched Email", "Kode Identitas", "Nama Keluarga/Bangunan/Usaha", "Alamat Prelist",
        "Nomor Urut Bangunan / IDSBR", "NIB", "Email", "Skala Usaha / Jenis Prelist",
        "Jumlah Usaha", "Kode Pos", "Perubahan SLS", "IDSBR UMKM SLS Sama",
        "Status", "Mode", "Petugas Saat Ini", "Keterangan"
    ]
    
    file_exists = os.path.exists(output_csv)
    csv_file = open(output_csv, "a", newline="", encoding="utf-8")
    csv_writer = csv.writer(csv_file)
    
    if not file_exists:
        csv_writer.writerow(csv_headers)
        csv_file.flush()
        
    print(f"Output will be saved/appended to '{output_csv}'")
    
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        
        # Load saved session if it exists
        if os.path.exists(auth_file):
            print(f"Loading session from '{auth_file}'...")
            context = browser.new_context(storage_state=auth_file)
        else:
            print("No saved session found. Launching a fresh browser context.")
            context = browser.new_context()
            
        page = context.new_page()
        
        # Open BPS FASIH
        print("Navigating to BPS FASIH website...")
        page.goto("https://fasih-sm.bps.go.id/")
        
        # Regex pattern for survey data page URL
        # Format: https://fasih-sm.bps.go.id/app/surveys/<survey-id>/<period-id>/data
        target_pattern = re.compile(r"/app/surveys/[^/]+/[^/]+/data")
        
        print("\n" + "="*70)
        print("WAITING FOR TARGET PAGE:")
        print("Please log in (if not already logged in) and click/navigate to the survey data table.")
        print("The script will automatically detect when you reach the page and start scraping.")
        print("="*70 + "\n")
        
        # Wait indefinitely until URL matches the target pattern
        try:
            page.wait_for_url(target_pattern, timeout=0)
        except Exception as e:
            print(f"Error waiting for target page: {e}")
            browser.close()
            return
            
        # We are on the target page!
        current_url = page.url
        print(f"\nTarget survey page detected: {current_url}")
        
        # Save session immediately so user doesn't have to log in next time
        context.storage_state(path=auth_file)
        print(f"Session state saved to '{auth_file}'")
        
        # Ensure we display 50 items per page (force URL parameter)
        if "perPage=50" not in current_url:
            print("Forcing 50 items per page by updating URL query parameters...")
            if "?" in current_url:
                if "perPage=" in current_url:
                    target_url = re.sub(r"perPage=\d+", "perPage=50", current_url)
                else:
                    target_url = current_url + "&perPage=50"
            else:
                target_url = current_url + "?perPage=50"
                
            print(f"Redirecting to: {target_url}")
            page.goto(target_url)
            page.wait_for_url(target_pattern, timeout=10000)
            
        # Wait for table to load
        print("Waiting for table to load...")
        try:
            page.wait_for_selector("table", timeout=15000)
            print("Table loaded successfully. Starting scraper loop...")
        except Exception:
            print("Error: Table not found on target page. Aborting.")
            browser.close()
            csv_file.close()
            return
            
        # Start search looping
        for index, email in enumerate(emails, 1):
            print(f"[{index}/{len(emails)}] Searching for: {email}")
            
            try:
                # Find search input
                search_input = page.locator('input[placeholder="Cari..."]')
                if search_input.count() == 0:
                    print("  Search input not found! Reloading survey page...")
                    page.goto(page.url)
                    page.wait_for_selector("table", timeout=15000)
                    search_input = page.locator('input[placeholder="Cari..."]')
                    
                # Fill search box and press Enter
                search_input.click()
                search_input.fill("") # Clear input first
                search_input.fill(email)
                search_input.press("Enter")
                
                # Wait for search results
                wait_for_table_load(page)
                
                # Scrape pages
                page_num = 1
                total_scraped = 0
                
                while True:
                    print(f"  Scraping page {page_num}...")
                    scraped_in_page = scrape_page(page, email, csv_writer)
                    total_scraped += scraped_in_page
                    csv_file.flush() # Flush to disk
                    
                    # Check next page button
                    next_button = page.locator('button[aria-label="Go to next page"]')
                    if next_button.count() > 0 and next_button.is_visible() and not next_button.is_disabled():
                        print(f"  Navigating to next page...")
                        next_button.click()
                        page_num += 1
                        wait_for_table_load(page)
                    else:
                        break
                        
                print(f"  Finished search for {email}. Total scraped: {total_scraped} rows.")
                
            except Exception as e:
                print(f"  Error processing email {email}: {e}")
                
        # Cleanup
        csv_file.close()
        browser.close()
        print(f"\nAll scraping completed successfully! Data saved in '{output_csv}'")

if __name__ == "__main__":
    # Check if user passed --test flag to use email_mitra_test.txt
    use_test = "--test" in sys.argv
    run_scraper(use_test_emails=use_test)
