# 🤖 How to Implement New Automation Services

This guide shows you how to add a new Python automation script to the Smart Process Flow platform.

## 📁 File Structure

```
smart-process-flow/
├── automation_scripts/          # 🐍 Put your Python scripts here
│   ├── damco_tracking_maersk.py
│   ├── example_automation.py    # 📝 Template script
│   └── your_new_script.py       # 🆕 Your automation script
├── server/
│   └── index.cjs               # 🔧 Backend server (add service mapping)
├── src/
│   ├── contexts/AuthContext.tsx # ⚙️ Enable your service
│   └── pages/Dashboard.tsx      # 🖥️ Add to service list
└── results/                    # 📊 Generated reports go here
```

## 🚀 Step-by-Step Implementation

### Step 1: Create Your Python Script

1. **📂 Location**: Place your Python script in `/automation_scripts/` folder
2. **📝 Template**: Use `example_automation.py` as a starting template
3. **🔧 Requirements**: Your script should:
   - Accept file path as command line argument
   - Support `--headless` flag for browser automation
   - Generate results in `/results/` folder
   - Use proper logging with timestamps
   - Return exit code 0 for success, 1 for failure

### Step 2: Script Structure Template

```python
#!/usr/bin/env python3
"""
Your Automation Script
Description of what this automation does
"""

import os
import sys
import logging
from datetime import datetime

class YourAutomation:
    def __init__(self, headless=True):
        self.setup_logging()
        # Initialize your automation components
        
    def setup_logging(self):
        """Setup logging - REQUIRED"""
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)
        
        log_filename = f"your_automation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        log_path = os.path.join(log_dir, log_filename)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_path),
                logging.StreamHandler(sys.stdout)  # This shows in UI
            ]
        )
        self.logger = logging.getLogger('YourAutomation')
        
    def run_automation(self, file_path):
        """Main automation logic - REQUIRED"""
        try:
            self.logger.info("🚀 Starting your automation...")
            
            # Your automation logic here
            # 1. Read input file (CSV/Excel)
            # 2. Process each row/item
            # 3. Generate results
            # 4. Save to /results/ folder
            
            self.logger.info("🎉 Automation completed successfully!")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Automation failed: {str(e)}")
            return False

def main():
    """Command line entry point - REQUIRED"""
    if len(sys.argv) < 2:
        print("Usage: python your_script.py <file_path> [--headless]")
        sys.exit(1)
        
    file_path = sys.argv[1]
    headless = '--headless' in sys.argv
    
    automation = YourAutomation(headless=headless)
    success = automation.run_automation(file_path)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
```

### Step 3: Add Service to Backend

**📁 File**: `server/index.cjs`

```javascript
// Add your script to the service mapping
const serviceScripts = {
  'damco-tracking-maersk': 'damco_tracking_maersk.py',
  'your-service-id': 'your_script.py',  // 🆕 Add this line
  // ... other services
};
```

### Step 4: Add Service to Frontend

**📁 File**: `src/pages/Dashboard.tsx`

```javascript
// Add your service to the services array
const allServices = [
  // ... existing services
  { 
    id: 'your-service-id', 
    name: 'Your Service Name', 
    category: 'Your Category', 
    requiresCredentials: false  // or true if needs login
  }
];
```

### Step 5: Enable Service

**📁 File**: `src/contexts/AuthContext.tsx`

```javascript
// Add your service to enabled services
enabledServices: [
  'damco-tracking-maersk', 
  'your-service-id'  // 🆕 Add this
]
```

## 📊 Input/Output Requirements

### Input File Format
- **CSV**: First column contains data to process
- **Excel**: First column contains data to process
- **Credits**: 1 credit per row (excluding header)

### Output Requirements
- **📁 Location**: Save results to `/results/` folder
- **📄 Report**: Generate `your_service_report_TIMESTAMP.pdf`
- **📝 Logs**: Use logging for progress updates (shows in UI)

### Logging Format
```python
self.logger.info("🚀 Starting process...")      # Shows in UI
self.logger.info("🔍 Processing item 1/5...")   # Progress updates
self.logger.info("✅ Item processed successfully") # Success
self.logger.error("❌ Error occurred: details")  # Errors
self.logger.info("🎉 Automation completed!")    # Final status
```

## 🔧 Testing Your Automation

### 1. Test Script Directly
```bash
cd automation_scripts
python your_script.py ../uploads/test_data.csv --headless
```

### 2. Test Through UI
1. Upload your test CSV file
2. Select your service
3. Start automation
4. Monitor progress in real-time
5. Download generated report

## 📋 Common Patterns

### Web Scraping with Selenium
```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def setup_driver(self):
    chrome_options = Options()
    if self.headless:
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    self.driver = webdriver.Chrome(options=chrome_options)
    return True
```

### File Processing
```python
import pandas as pd

def read_input_file(self, file_path):
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".csv":
        df = pd.read_csv(file_path)
    elif ext in [".xls", ".xlsx"]:
        df = pd.read_excel(file_path)
    
    return df.iloc[:, 0].dropna().tolist()  # First column
```

### Report Generation
```python
def generate_report(self):
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_filename = f"your_service_report_{timestamp}.pdf"
    report_path = os.path.join("results", report_filename)
    
    # Generate your report content
    # Save to report_path
    
    return report_filename
```

## 🚨 Important Notes

1. **🔒 Security**: Never hardcode credentials in scripts
2. **⏱️ Timeouts**: Add proper timeouts for web requests
3. **🛡️ Error Handling**: Handle all possible exceptions
4. **📝 Logging**: Use descriptive log messages for UI feedback
5. **🧹 Cleanup**: Always close browsers/connections
6. **📊 Progress**: Update progress for long-running tasks
7. **🔄 Rate Limiting**: Add delays between requests

## 🎯 Example Use Cases

- **🏦 Bank Portal Automation**: Login, fill forms, download certificates
- **📦 Shipping Tracking**: Track multiple shipments, generate reports
- **📄 Document Processing**: Extract data from PDFs, convert formats
- **💰 Financial Applications**: Submit applications, check status
- **📊 Data Collection**: Scrape websites, compile information

## 🆘 Troubleshooting

### Common Issues:
1. **Script not found**: Check file path in `serviceScripts` mapping
2. **Permission denied**: Make script executable: `chmod +x your_script.py`
3. **Import errors**: Install required Python packages
4. **Browser issues**: Ensure Chrome/ChromeDriver is installed
5. **File not generated**: Check `/results/` folder permissions

### Debug Mode:
- Remove `--headless` flag to see browser actions
- Check logs in `/logs/` folder
- Test script independently before integration

## 📚 Dependencies

Common Python packages you might need:
```bash
python3 -m pip install selenium pandas openpyxl beautifulsoup4 requests webdriver-manager
```

For PDF generation:
```bash
python3 -m pip install weasyprint  # or pdfkit, reportlab
```

---

🎉 **You're ready to implement your automation!** Follow these steps and your Python script will be fully integrated into the Smart Process Flow platform.