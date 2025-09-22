#!/usr/bin/env python3
"""
Example Automation Script Template for Ubuntu VPS Deployment
Replace this with your actual automation logic
"""

import os
import sys
import time
import logging
import pandas as pd
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import json

class ExampleAutomation:
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
            
        log_filename = f"example_automation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        log_path = os.path.join(log_dir, log_filename)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_path),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger('ExampleAutomation')
        
    def setup_driver(self):
        """Setup Chrome WebDriver with options for Ubuntu VPS"""
        self.logger.info("🔧 Initializing Chrome WebDriver...")
        
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless=new")
        
        # Essential options for Ubuntu VPS
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--disable-images")
        chrome_options.add_argument("--disable-javascript")
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--allow-running-insecure-content")
        chrome_options.add_argument("--ignore-certificate-errors")
        chrome_options.add_argument("--ignore-ssl-errors")
        chrome_options.add_argument("--ignore-certificate-errors-spki-list")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        # Memory optimization for VPS
        chrome_options.add_argument("--memory-pressure-off")
        chrome_options.add_argument("--max_old_space_size=4096")
        chrome_options.add_argument("--disable-background-timer-throttling")
        chrome_options.add_argument("--disable-renderer-backgrounding")
        chrome_options.add_argument("--disable-backgrounding-occluded-windows")
        
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
                self.logger.error("❌ Chrome binary not found")
                self.logger.error("💡 Install Chrome: sudo apt install -y google-chrome-stable")
                return False
            
            # Try multiple ChromeDriver locations
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
                self.logger.error("❌ ChromeDriver not found")
                self.logger.error("💡 Install ChromeDriver: sudo apt install -y chromedriver")
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
            self.logger.error("💡 Installation commands for Ubuntu:")
            self.logger.error("   sudo apt update")
            self.logger.error("   sudo apt install -y google-chrome-stable")
            self.logger.error("   sudo apt install -y chromedriver")
            return False
            
    def read_input_file(self, file_path):
        """Read input data from CSV or Excel file"""
        try:
            self.logger.info(f"📋 Reading input data from: {file_path}")
            
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Auto-detect file type
            ext = os.path.splitext(file_path)[1].lower()
            
            if ext == ".csv":
                df = pd.read_csv(file_path)
            elif ext == ".xlsx":
                try:
                    df = pd.read_excel(file_path, engine='openpyxl')
                except ImportError:
                    self.logger.error("❌ openpyxl not installed. Run: pip3 install openpyxl")
                    raise
            elif ext == ".xls":
                try:
                    df = pd.read_excel(file_path, engine='xlrd')
                except ImportError:
                    self.logger.error("❌ xlrd not installed. Run: pip3 install xlrd")
                    raise
            else:
                raise ValueError(f"Unsupported file type: {ext}")
            
            # Extract data from first column
            data_list = df.iloc[:, 0].dropna().astype(str).str.strip().tolist()
            data_list = [item for item in data_list if item and item.lower() != 'nan']
            
            self.logger.info(f"📊 Found {len(data_list)} items to process")
            return data_list
            
        except Exception as e:
            self.logger.error(f"❌ Failed to read file: {str(e)}")
            return []
            
    def process_single_item(self, item, index):
        """Process a single data item"""
        try:
            self.logger.info(f"🔍 Processing item {index}: {item}")
            
            # YOUR AUTOMATION LOGIC HERE
            # Example: Navigate to website, fill forms, extract data
            
            # Simulate processing
            time.sleep(2)
            
            # Example result
            result_data = {
                'item': item,
                'status': 'success',
                'data': f'processed_data_for_{item}',
                'timestamp': datetime.now().isoformat()
            }
            
            self.results.append(result_data)
            self.logger.info(f"✅ Successfully processed: {item}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error processing {item}: {str(e)}")
            self.results.append({
                'item': item,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
            return False
            
    def generate_report(self):
        """Generate final report"""
        try:
            self.logger.info("📊 Generating final report...")
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            report_filename = f"example_automation_report_{timestamp}.txt"
            report_path = os.path.join("results", report_filename)
            
            # Generate report content
            successful = [r for r in self.results if r['status'] == 'success']
            failed = [r for r in self.results if r['status'] == 'error']
            
            report_content = f"""
EXAMPLE AUTOMATION REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

SUMMARY:
- Total Processed: {len(self.results)}
- Successful: {len(successful)}
- Failed: {len(failed)}
- Success Rate: {(len(successful)/len(self.results)*100):.1f}%

DETAILED RESULTS:
"""
            
            for result in self.results:
                status = "✅" if result['status'] == 'success' else "❌"
                report_content += f"{status} {result['item']} - {result['status']}\n"
                if 'error' in result:
                    report_content += f"   Error: {result['error']}\n"
            
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report_content)
            
            self.logger.info(f"💾 Report saved: {report_filename}")
            return report_filename
            
        except Exception as e:
            self.logger.error(f"❌ Failed to generate report: {str(e)}")
            return None
            
    def cleanup(self):
        """Clean up resources"""
        try:
            if self.driver:
                self.logger.info("🔒 Closing browser...")
                self.driver.quit()
                self.logger.info("✅ Cleanup completed")
        except Exception as e:
            self.logger.error(f"❌ Error during cleanup: {str(e)}")
            
    def run_automation(self, file_path, headless=True):
        """Main automation workflow"""
        try:
            self.logger.info("🚀 Starting example automation...")
            
            # Setup WebDriver
            if not self.setup_driver():
                return False
                
            # Read input data
            data_list = self.read_input_file(file_path)
            if not data_list:
                self.logger.error("❌ No data found in input file")
                return False
                
            # Process each item
            for i, item in enumerate(data_list, start=1):
                self.logger.info(f"🔍 Processing {i}/{len(data_list)}: {item}")
                self.process_single_item(item, i)
                time.sleep(1)  # Rate limiting
                
            # Generate final report
            report_file = self.generate_report()
            
            # Log final results
            successful = len([r for r in self.results if r['status'] == 'success'])
            failed = len([r for r in self.results if r['status'] == 'error'])
            
            self.logger.info("🎉 Example automation completed!")
            self.logger.info(f"📊 Total: {len(data_list)}")
            self.logger.info(f"✅ Successful: {successful}")
            self.logger.info(f"❌ Failed: {failed}")
            
            if report_file:
                self.logger.info(f"📄 Report: {report_file}")
                
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Automation failed: {str(e)}")
            return False
        finally:
            self.cleanup()

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python3 example_automation.py <file_path> [--headless]")
        print("Supported file types: .csv, .xlsx, .xls")
        sys.exit(1)
        
    file_path = sys.argv[1]
    headless = '--headless' in sys.argv
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    
    automation = ExampleAutomation(headless=headless)
    success = automation.run_automation(file_path, headless)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()