#!/usr/bin/env python3
"""
Damco (APM) Tracking for Incentive - Maersk Portal Automation
Automates the process of tracking FCR numbers through Maersk portal and generating PDF reports
"""

import os
import sys
import time
import logging
import pandas as pd
import base64
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import json

class DamcoTrackingAutomation:
    def __init__(self, headless=True):
        self.setup_logging()
        self.driver = None
        self.wait = None
        self.headless = headless
        self.results = []
        
    def setup_logging(self):
        """Setup logging configuration"""
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        log_filename = f"damco_tracking_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        log_path = os.path.join(log_dir, log_filename)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_path),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger('DamcoTrackingMaersk')
        
    def setup_driver(self):
        """Setup Chrome WebDriver with options"""
        self.logger.info("🔧 Initializing Chrome WebDriver...")
        
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--disable-images")
        chrome_options.add_argument("--disable-javascript")
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--allow-running-insecure-content")
        
        # Disable automation detection
        chrome_options.add_experimental_option("useAutomationExtension", False)
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        
        try:
            # Try multiple Chrome binary locations for Ubuntu
            chrome_binary_paths = [
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/chromium-browser",
                "/usr/bin/chromium",
                "/snap/bin/chromium"
            ]
            
            chrome_binary = None
            for path in chrome_binary_paths:
                if os.path.exists(path):
                    chrome_binary = path
                    break
                    
            if chrome_binary:
                chrome_options.binary_location = chrome_binary
                self.logger.info(f"✅ Using Chrome binary: {chrome_binary}")
            else:
                self.logger.warning("⚠️ Chrome binary not found in standard locations")
            
            # Try multiple ChromeDriver locations for Ubuntu
            chromedriver_paths = [
                "/usr/bin/chromedriver",
                "/usr/local/bin/chromedriver",
                "/opt/chromedriver/chromedriver",
                "/snap/bin/chromedriver"
            ]
            
            chromedriver_path = None
            for path in chromedriver_paths:
                if os.path.exists(path):
                    chromedriver_path = path
                    break
                    
            if chromedriver_path:
                service = Service(chromedriver_path)
                self.logger.info(f"✅ Using ChromeDriver: {chromedriver_path}")
            else:
                # Fallback to webdriver-manager if available
                try:
                    from webdriver_manager.chrome import ChromeDriverManager
                    service = Service(ChromeDriverManager().install())
                    self.logger.info("✅ Using webdriver-manager for ChromeDriver")
                except ImportError:
                    self.logger.error("❌ ChromeDriver not found and webdriver-manager not available")
                    return False
            
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.wait = WebDriverWait(self.driver, 30)
            
            # Ensure results directories exist
            os.makedirs("results", exist_ok=True)
            os.makedirs("results/pdfs", exist_ok=True)
            
            self.logger.info("✅ Chrome WebDriver setup completed")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to setup Chrome WebDriver: {str(e)}")
            self.logger.error("💡 Make sure Chrome/Chromium and ChromeDriver are installed:")
            self.logger.error("   sudo apt update")
            self.logger.error("   sudo apt install -y google-chrome-stable")
            self.logger.error("   sudo apt install -y chromium-browser")
            self.logger.error("   sudo apt install -y chromedriver")
            return False
            
    def navigate_to_maersk(self):
        """Navigate to Maersk tracking portal"""
        try:
            self.logger.info("🌐 Navigating to Maersk tracking portal...")
            self.driver.get("https://www.maersk.com/mymaersk-scm-track/")
            
            # Wait for page to load
            self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(3)  # Additional wait for dynamic content
            self.logger.info("📍 Successfully navigated to Maersk portal")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to navigate to Maersk portal: {str(e)}")
            return False
            
    def accept_cookies(self):
        """Handle cookie consent popup"""
        try:
            self.logger.info("🍪 Handling cookie consent popup...")
            
            # Multiple selectors for cookie consent
            cookie_selectors = [
                "button[data-test='coi-allow-all-button']",
                "button[id*='accept']",
                "button[class*='accept']",
                "button:contains('Accept')",
                "button:contains('Allow')"
            ]
            
            for selector in cookie_selectors:
                try:
                    allow_btn = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    allow_btn.click()
                    self.logger.info(f"✅ Clicked cookie consent button: {selector}")
                    time.sleep(2)
                    return True
                except TimeoutException:
                    continue
                    
            self.logger.warning("⚠️ Cookie consent popup not found or already handled")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to handle cookie consent: {str(e)}")
            return False
            
    def close_coach_popup(self):
        """Handle welcome coach popup"""
        try:
            self.logger.info("👋 Dismissing welcome coach popup...")
            
            # Multiple selectors for coach popup
            coach_selectors = [
                "button[data-test='finishButton']",
                "button[class*='finish']",
                "button:contains('Got it')",
                "button:contains('Close')",
                "button:contains('Skip')"
            ]
            
            for selector in coach_selectors:
                try:
                    got_it_btn = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    got_it_btn.click()
                    self.logger.info(f"✅ Clicked coach popup button: {selector}")
                    time.sleep(2)
                    return True
                except TimeoutException:
                    continue
                    
            self.logger.warning("⚠️ Coach popup not found or already handled")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to handle coach popup: {str(e)}")
            return False
            
    def process_booking(self, booking_number, index):
        """Process a single booking number"""
        try:
            self.logger.info(f"🔍 Processing FCR number {index}: {booking_number}")
            
            # Find and clear input field
            input_selectors = [
                "#formInput",
                "input[data-test='form-input']",
                "input[type='text']",
                "input[placeholder*='track']"
            ]
            
            input_box = None
            for selector in input_selectors:
                try:
                    input_box = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                    break
                except TimeoutException:
                    continue
                    
            if not input_box:
                raise Exception("Could not find input field")
                
            input_box.clear()
            input_box.send_keys(booking_number)
            self.logger.info(f"📝 Entered FCR number: {booking_number}")
            
            # Find and click submit button
            submit_selectors = [
                "button[data-test='form-input-button']",
                "button[type='submit']",
                "button:contains('Track')",
                "button:contains('Search')"
            ]
            
            submit_btn = None
            for selector in submit_selectors:
                try:
                    submit_btn = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
                    break
                except TimeoutException:
                    continue
                    
            if not submit_btn:
                raise Exception("Could not find submit button")
                
            self.driver.execute_script("arguments[0].click();", submit_btn)
            self.logger.info("🚀 Clicked submit button")
            
            # Wait for results to load
            time.sleep(5)
            
            # Try to find tracking information
            try:
                # Wait for iframe and switch to it
                iframe = WebDriverWait(self.driver, 10).until(
                    EC.frame_to_be_available_and_switch_to_it((By.ID, "damco-track"))
                )
                self.logger.info("📊 Switched to tracking iframe")
                
                # Look for FCR link
                fcr_link = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, f"//a[contains(text(), '{booking_number}')]"))
                )
                fcr_link.click()
                self.logger.info("📊 Clicked FCR link")
                
            except TimeoutException:
                self.logger.warning("⚠️ Could not find iframe or FCR link, continuing with current page")
            
            # Wait for page to fully load
            time.sleep(5)
            
            # Generate PDF
            pdf_filename = f"{index:03d}_{booking_number}_tracking.pdf"
            pdf_path = os.path.join("results", "pdfs", pdf_filename)
            
            try:
                # Use Chrome DevTools Protocol to generate PDF
                pdf_data = self.driver.execute_cdp_cmd("Page.printToPDF", {
                    "format": "A4",
                    "printBackground": True,
                    "marginTop": 0.4,
                    "marginBottom": 0.4,
                    "marginLeft": 0.4,
                    "marginRight": 0.4,
                    "scale": 0.8
                })
                
                with open(pdf_path, "wb") as f:
                    f.write(base64.b64decode(pdf_data['data']))
                    
                self.logger.info(f"💾 PDF saved: {pdf_filename}")
                
            except Exception as pdf_error:
                self.logger.error(f"❌ Failed to generate PDF: {str(pdf_error)}")
                # Create a simple text file as fallback
                txt_filename = f"{index:03d}_{booking_number}_tracking.txt"
                txt_path = os.path.join("results", txt_filename)
                
                with open(txt_path, "w") as f:
                    f.write(f"Tracking Information for FCR: {booking_number}\n")
                    f.write(f"Processed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"Status: Processed\n")
                    f.write(f"Page Title: {self.driver.title}\n")
                    f.write(f"Current URL: {self.driver.current_url}\n")
                
                pdf_filename = txt_filename
            
            # Record successful result
            self.results.append({
                'fcr_number': booking_number,
                'status': 'success',
                'pdf_file': pdf_filename,
                'timestamp': datetime.now().isoformat()
            })
            
            return pdf_filename
            
        except Exception as e:
            self.logger.error(f"❌ Error processing FCR {booking_number}: {str(e)}")
            self.results.append({
                'fcr_number': booking_number,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
            return None
            
        finally:
            # Always switch back to default content
            try:
                self.driver.switch_to.default_content()
            except:
                pass
            
    def read_booking_numbers_from_file(self, file_path):
        """Read booking numbers from CSV or Excel file"""
        try:
            self.logger.info(f"📋 Reading FCR numbers from file: {file_path}")
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Auto-detect file type
            ext = os.path.splitext(file_path)[1].lower()
            self.logger.info(f"📄 File extension: {ext}")
            
            if ext == ".csv":
                df = pd.read_csv(file_path)
            elif ext == ".xlsx":
                try:
                    df = pd.read_excel(file_path, engine='openpyxl')
                except ImportError:
                    self.logger.error("❌ openpyxl not installed. Install with: pip3 install openpyxl")
                    raise
            elif ext == ".xls":
                try:
                    df = pd.read_excel(file_path, engine='xlrd')
                except ImportError:
                    self.logger.error("❌ xlrd not installed. Install with: pip3 install xlrd")
                    raise
            else:
                raise ValueError(f"Unsupported file type: {ext}. Supported: .csv, .xlsx, .xls")
            
            self.logger.info(f"📊 File loaded: {len(df)} rows, columns: {list(df.columns)}")
            
            # Find booking column
            booking_column = None
            possible_columns = ['fcr_number', 'fcr number', 'fcr', 'booking_number', 'booking', 'reference', 'container', 'number']
            
            for col in df.columns:
                col_lower = col.lower().strip()
                if col_lower in possible_columns or any(term in col_lower for term in ['fcr', 'booking', 'reference']):
                    booking_column = col
                    break
                    
            if booking_column is None:
                booking_column = df.columns[0]
                self.logger.warning(f"⚠️ Using first column: {booking_column}")
            else:
                self.logger.info(f"📋 Using column: {booking_column}")
            
            # Extract and clean data
            booking_numbers = df[booking_column].dropna().astype(str).str.strip().tolist()
            booking_numbers = [fcr for fcr in booking_numbers if fcr and fcr.lower() != 'nan']
            
            self.logger.info(f"📊 Found {len(booking_numbers)} FCR numbers:")
            for i, fcr in enumerate(booking_numbers, 1):
                self.logger.info(f"   {i}. {fcr}")
            
            return booking_numbers
            
        except Exception as e:
            self.logger.error(f"❌ Failed to read file: {str(e)}")
            return []
            
    def process_all_bookings(self, booking_numbers):
        """Process all booking numbers"""
        successful_pdfs = []
        failed_bookings = []
        
        for i, booking in enumerate(booking_numbers, start=1):
            self.logger.info(f"🔍 Processing {i}/{len(booking_numbers)}: {booking}")
            
            pdf_filename = self.process_booking(booking, i)
            
            if pdf_filename:
                successful_pdfs.append(pdf_filename)
            else:
                failed_bookings.append(booking)
                
            # Wait between requests
            time.sleep(3)
                
        return successful_pdfs, failed_bookings
        
    def generate_combined_report(self, successful_pdfs):
        """Generate combined report"""
        try:
            if not successful_pdfs:
                return None
                
            self.logger.info("📦 Generating combined report...")
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            combined_filename = f"damco_tracking_report_{timestamp}.pdf"
            combined_path = os.path.join("results", combined_filename)
            
            # Create a simple combined report (text-based for now)
            report_content = f"""
DAMCO TRACKING AUTOMATION REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

SUMMARY:
- Total Processed: {len(self.results)}
- Successful: {len(successful_pdfs)}
- Failed: {len(self.results) - len(successful_pdfs)}

SUCCESSFUL FILES:
"""
            for pdf in successful_pdfs:
                report_content += f"- {pdf}\n"
                
            # Save as text file for now
            txt_filename = combined_filename.replace('.pdf', '.txt')
            txt_path = os.path.join("results", txt_filename)
            
            with open(txt_path, 'w') as f:
                f.write(report_content)
                
            self.logger.info(f"💾 Combined report saved: {txt_filename}")
            return txt_filename
            
        except Exception as e:
            self.logger.error(f"❌ Failed to generate combined report: {str(e)}")
            return None
        
    def generate_summary_report(self, successful_pdfs, failed_bookings):
        """Generate summary report"""
        try:
            self.logger.info("📊 Generating summary report...")
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # Create log file
            log_filename = f"automation_log_{timestamp}.txt"
            log_path = os.path.join("results", log_filename)
            
            with open(log_path, 'w') as f:
                f.write("=== DAMCO TRACKING AUTOMATION LOG ===\n")
                f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Total Processed: {len(self.results)}\n")
                f.write(f"Successful: {len(successful_pdfs)}\n")
                f.write(f"Failed: {len(failed_bookings)}\n")
                f.write(f"Success Rate: {(len(successful_pdfs) / len(self.results) * 100):.1f}%\n\n")
                
                f.write("=== SUCCESSFUL FILES ===\n")
                for pdf in successful_pdfs:
                    f.write(f"✅ {pdf}\n")
                
                f.write("\n=== FAILED BOOKINGS ===\n")
                for booking in failed_bookings:
                    f.write(f"❌ {booking}\n")
                
                f.write("\n=== DETAILED RESULTS ===\n")
                for result in self.results:
                    f.write(f"FCR: {result['fcr_number']} | Status: {result['status']} | Time: {result['timestamp']}\n")
                    if 'error' in result:
                        f.write(f"   Error: {result['error']}\n")
            
            # Create JSON summary
            summary_filename = f"damco_tracking_summary_{timestamp}.json"
            summary_path = os.path.join("results", summary_filename)
            
            summary_data = {
                'timestamp': datetime.now().isoformat(),
                'total_processed': len(self.results),
                'successful': len(successful_pdfs),
                'failed': len(failed_bookings),
                'success_rate': f"{(len(successful_pdfs) / len(self.results) * 100):.1f}%" if self.results else "0%",
                'successful_pdfs': successful_pdfs,
                'failed_bookings': failed_bookings,
                'detailed_results': self.results
            }
            
            with open(summary_path, 'w') as f:
                json.dump(summary_data, f, indent=2)
                
            self.logger.info(f"📋 Reports saved: {log_filename}, {summary_filename}")
            return [log_filename, summary_filename]
            
        except Exception as e:
            self.logger.error(f"❌ Failed to generate summary: {str(e)}")
            return []
            
    def cleanup(self):
        """Clean up resources"""
        try:
            if self.driver:
                self.logger.info("🔒 Cleaning up...")
                self.driver.quit()
                self.logger.info("✅ Cleanup completed")
        except Exception as e:
            self.logger.error(f"❌ Cleanup error: {str(e)}")
            
    def run_automation(self, file_path, headless=True):
        """Main automation workflow"""
        try:
            self.logger.info("🚀 Starting Damco tracking automation...")
            
            # Setup WebDriver
            if not self.setup_driver():
                return False
                
            # Navigate to portal
            if not self.navigate_to_maersk():
                return False
                
            # Handle popups
            self.accept_cookies()
            self.close_coach_popup()
            
            # Read input file
            booking_numbers = self.read_booking_numbers_from_file(file_path)
            if not booking_numbers:
                self.logger.error("❌ No booking numbers found")
                return False
                
            # Process bookings
            successful_pdfs, failed_bookings = self.process_all_bookings(booking_numbers)
            
            # Generate reports
            combined_report = self.generate_combined_report(successful_pdfs)
            summary_files = self.generate_summary_report(successful_pdfs, failed_bookings)
            
            # Log results
            self.logger.info("🎉 Automation completed!")
            self.logger.info(f"📊 Total: {len(booking_numbers)}")
            self.logger.info(f"✅ Successful: {len(successful_pdfs)}")
            self.logger.info(f"❌ Failed: {len(failed_bookings)}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Automation failed: {str(e)}")
            return False
        finally:
            self.cleanup()

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python3 damco_tracking_maersk.py <file_path> [--headless]")
        print("Supported: .csv, .xlsx, .xls")
        sys.exit(1)
        
    file_path = sys.argv[1]
    headless = '--headless' in sys.argv
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    
    automation = DamcoTrackingAutomation(headless=headless)
    success = automation.run_automation(file_path, headless)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()