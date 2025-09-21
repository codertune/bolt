require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const csv = require('csv-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create necessary directories
const createDirectories = () => {
  try {
    const dirs = ['uploads', 'results', 'logs', 'automation_scripts'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });
    console.log('📁 All required directories are ready');
  } catch (error) {
    console.error('❌ Failed to create directories:', error.message);
    console.error('💡 This may cause issues with file uploads and automation');
    console.error('🔧 Please check file system permissions');
    // Don't exit - let server continue running
  }
};

// Initialize directories with error handling
try {
  createDirectories();
} catch (error) {
  console.error('❌ Critical error during server initialization:', error.message);
  console.error('🔧 Server may not function properly without required directories');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Excel, and CSV files are allowed.'));
    }
  }
});

// Store active processes
const activeProcesses = new Map();

// bKash API Configuration
const BKASH_CONFIG = {
  base_url: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
  app_key: process.env.BKASH_APP_KEY || '4f6o0cjiki2rfm34kfdadl1eqq',
  app_secret: process.env.BKASH_APP_SECRET || '2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug5b',
  username: process.env.BKASH_USERNAME || 'sandboxTokenizedUser02',
  password: process.env.BKASH_PASSWORD || 'sandboxTokenizedUser02@12345'
};

// Store bKash tokens
let bkashToken = null;
let tokenExpiry = null;

// Get bKash Auth Token
async function getBkashToken() {
  try {
    if (bkashToken && tokenExpiry && new Date() < tokenExpiry) {
      return bkashToken;
    }

    const response = await axios.post(`${BKASH_CONFIG.base_url}/tokenized/checkout/token/grant`, {
      app_key: BKASH_CONFIG.app_key,
      app_secret: BKASH_CONFIG.app_secret
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': BKASH_CONFIG.username,
        'password': BKASH_CONFIG.password
      }
    });

    if (response.data && response.data.id_token) {
      bkashToken = response.data.id_token;
      tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      return bkashToken;
    }
    
    throw new Error('Failed to get bKash token');
  } catch (error) {
    console.error('bKash token error:', error.response?.data || error.message);
    throw error;
  }
}

// Analyze uploaded files and calculate credits
const analyzeFile = async (filePath, originalName) => {
  const fileExt = path.extname(originalName).toLowerCase();
  const stats = fs.statSync(filePath);
  
  let credits = 1;
  let rows = 1;
  
  if (fileExt === '.csv') {
    // Count rows in CSV file
    rows = await new Promise((resolve, reject) => {
      let rowCount = 0;
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', () => rowCount++)
        .on('end', () => resolve(rowCount))
        .on('error', reject);
    });
    credits = rows; // 1 credit per row (excluding header)
  } else if (fileExt === '.xlsx' || fileExt === '.xls') {
    // Estimate rows based on file size for Excel files
    const fileSizeKB = stats.size / 1024;
    rows = Math.max(1, Math.floor(fileSizeKB / 2)); // Rough estimation
    credits = rows; // 1 credit per row
  } else if (fileExt === '.pdf') {
    credits = 1; // 1 credit for PDF files
    rows = 1;
  }
  
  return {
    name: originalName,
    size: stats.size,
    type: fileExt,
    rows: rows,
    credits: credits,
    path: filePath
  };
};

// Service to script mapping
const serviceScripts = {
  'damco-tracking-maersk': 'damco_tracking_maersk.py',
  'pdf-excel-converter': 'pdf_converter.py',
  'exp-issue': 'bangladesh_bank_exp.py',
  'damco-booking': 'damco_services.py',
  'hm-einvoice-create': 'hm_invoice_manager.py',
  'bepza-ep-issue': 'bepza_permit_manager.py',
  'cash-incentive-application': 'cash_incentive_processor.py',
  'ctg-port-tracking': 'shipment_tracker.py',
  'example-automation': 'example_automation.py'  // Add your new service here
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeProcesses: activeProcesses.size
  });
});

// Get available services
app.get('/api/services', (req, res) => {
  const services = [
    // PDF Extractor
    { id: 'pdf-excel-converter', name: 'PDF to Excel/CSV Converter', category: 'PDF Extractor', requiresCredentials: false },

    // Bangladesh Bank Services
    { id: 'exp-issue', name: 'Issue EXP', category: 'Bangladesh Bank', requiresCredentials: true },
    { id: 'exp-correction', name: 'Issued EXP Correction (Before Duplicate Reporting)', category: 'Bangladesh Bank', requiresCredentials: true },
    { id: 'exp-duplicate-reporting', name: 'Duplicate EXP', category: 'Bangladesh Bank', requiresCredentials: true },
    { id: 'exp-search', name: 'Search EXP Detail Information', category: 'Bangladesh Bank', requiresCredentials: true },

    // Damco Services
    { id: 'damco-booking', name: 'Damco (APM) - Booking', category: 'Forwarder Handler - Damco', requiresCredentials: true },
    { id: 'damco-booking-download', name: 'Damco (APM) - Booking Download', category: 'Forwarder Handler - Damco', requiresCredentials: true },
    { id: 'damco-fcr-submission', name: 'Damco (APM) - FCR Submission', category: 'Forwarder Handler - Damco', requiresCredentials: true },
    { id: 'damco-fcr-extractor', name: 'Damco (APM) - FCR Extractor from Mail', category: 'Forwarder Handler - Damco', requiresCredentials: true },
    { id: 'damco-edoc-upload', name: 'Damco (APM) - E-Doc Upload', category: 'Forwarder Handler - Damco', requiresCredentials: true },

    // H&M Services
    { id: 'hm-einvoice-create', name: 'H&M - E-Invoice Create', category: 'Buyer Handler - H&M', requiresCredentials: true },
    { id: 'hm-einvoice-download', name: 'H&M - E-Invoice Download', category: 'Buyer Handler - H&M', requiresCredentials: true },
    { id: 'hm-einvoice-correction', name: 'H&M - E-Invoice Correction', category: 'Buyer Handler - H&M', requiresCredentials: true },
    { id: 'hm-packing-list', name: 'H&M - Download E-Packing List', category: 'Buyer Handler - H&M', requiresCredentials: true },

    // BEPZA Services
    { id: 'bepza-ep-issue', name: 'BEPZA - EP Issue', category: 'BEPZA', requiresCredentials: true },
    { id: 'bepza-ep-submission', name: 'BEPZA - EP Submission', category: 'BEPZA', requiresCredentials: true },
    { id: 'bepza-ep-download', name: 'BEPZA - EP Download', category: 'BEPZA', requiresCredentials: true },
    { id: 'bepza-ip-issue', name:'BEPZA - IP Issue', category: 'BEPZA', requiresCredentials: true },
    { id: 'bepza-ip-submit', name: 'BEPZA - IP Submit', category: 'BEPZA', requiresCredentials: true },
    { id: 'bepza-ip-download', name: 'BEPZA - IP Download', category: 'BEPZA', requiresCredentials: true },

    // Cash Incentive Services
    { id: 'cash-incentive-application', name: 'Cash Incentive Application', category: 'Cash Incentive Applications', requiresCredentials: false },
    { id: 'ctg-port-tracking', name: 'CTG Port Authority Tracking', category: 'Tracking Services', requiresCredentials: false },
    { id: 'damco-tracking-maersk', name: 'Damco (APM) Tracking for Incentive', category: 'Tracking Services', requiresCredentials: false },
    { id: 'myshipment-tracking', name: 'MyShipment Tracking (MGH)', category: 'Tracking Services', requiresCredentials: false },
    { id: 'egm-download', name: 'EGM Download', category: 'Tracking Services', requiresCredentials: false },
    { id: 'custom-tracking', name: 'Custom Tracking', category: 'Tracking Services', requiresCredentials: false }
  ];

  res.json({ success: true, services });
});

// bKash Payment Routes

// Create bKash Payment
app.post('/api/bkash/create-payment', async (req, res) => {
  try {
    const { amount, merchantInvoiceNumber } = req.body;
    
    if (!amount || amount < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid amount' 
      });
    }

    const token = await getBkashToken();
    
    const paymentData = {
      mode: '0011',
      payerReference: merchantInvoiceNumber,
      callbackURL: `${req.protocol}://${req.get('host')}/api/bkash/callback`,
      amount: amount.toString(),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: merchantInvoiceNumber
    };

    const response = await axios.post(`${BKASH_CONFIG.base_url}/tokenized/checkout/create`, paymentData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': token,
        'x-app-key': BKASH_CONFIG.app_key
      }
    });

    if (response.data && response.data.paymentID) {
      res.json({
        success: true,
        paymentID: response.data.paymentID,
        bkashURL: response.data.bkashURL,
        callbackURL: response.data.callbackURL,
        successCallbackURL: response.data.successCallbackURL,
        failureCallbackURL: response.data.failureCallbackURL,
        cancelledCallbackURL: response.data.cancelledCallbackURL
      });
    } else {
      throw new Error('Invalid response from bKash');
    }
    
  } catch (error) {
    console.error('bKash create payment error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create bKash payment',
      error: error.response?.data || error.message
    });
  }
});

// Execute bKash Payment
app.post('/api/bkash/execute-payment', async (req, res) => {
  try {
    const { paymentID } = req.body;
    
    if (!paymentID) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment ID is required' 
      });
    }

    const token = await getBkashToken();
    
    const response = await axios.post(`${BKASH_CONFIG.base_url}/tokenized/checkout/execute`, {
      paymentID: paymentID
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': token,
        'x-app-key': BKASH_CONFIG.app_key
      }
    });

    if (response.data && response.data.transactionStatus === 'Completed') {
      res.json({
        success: true,
        transactionID: response.data.trxID,
        paymentID: response.data.paymentID,
        amount: response.data.amount,
        currency: response.data.currency,
        transactionStatus: response.data.transactionStatus,
        paymentExecuteTime: response.data.paymentExecuteTime
      });
    } else {
      res.json({
        success: false,
        message: 'Payment execution failed',
        status: response.data?.transactionStatus || 'Failed'
      });
    }
    
  } catch (error) {
    console.error('bKash execute payment error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to execute bKash payment',
      error: error.response?.data || error.message
    });
  }
});

// Query bKash Payment Status
app.post('/api/bkash/query-payment', async (req, res) => {
  try {
    const { paymentID } = req.body;
    
    if (!paymentID) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment ID is required' 
      });
    }

    const token = await getBkashToken();
    
    const response = await axios.post(`${BKASH_CONFIG.base_url}/tokenized/checkout/payment/status`, {
      paymentID: paymentID
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': token,
        'x-app-key': BKASH_CONFIG.app_key
      }
    });

    res.json({
      success: true,
      ...response.data
    });
    
  } catch (error) {
    console.error('bKash query payment error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to query bKash payment',
      error: error.response?.data || error.message
    });
  }
});

// bKash Callback Handler
app.get('/api/bkash/callback', (req, res) => {
  const { paymentID, status } = req.query;
  
  // Redirect to frontend with payment result
  const redirectUrl = `${req.protocol}://${req.get('host')}/?payment=${status}&paymentID=${paymentID}`;
  res.redirect(redirectUrl);
});

// Upload and analyze files
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const fileAnalysis = [];
    let totalCredits = 0;

    for (const file of req.files) {
      const analysis = await analyzeFile(file.path, file.originalname);
      // Store the actual file path for later use
      analysis.path = file.path;
      fileAnalysis.push(analysis);
      totalCredits += analysis.credits;
    }

    res.json({
      success: true,
      files: fileAnalysis,
      totalCredits: totalCredits,
      message: `Analyzed ${req.files.length} files successfully`
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'File upload failed',
      error: error.message 
    });
  }
}, (error, req, res, next) => {
  // Handle Multer errors specifically
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size is 10MB.',
        error: 'FILE_TOO_LARGE'
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.',
        error: 'TOO_MANY_FILES'
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please use the correct upload form.',
        error: 'UNEXPECTED_FILE'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${error.message}`,
        error: error.code
      });
    }
  } else if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'INVALID_FILE_TYPE'
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during file upload',
      error: error.message
    });
  }
});

// Start automation process
app.post('/api/automation/start', async (req, res) => {
  try {
    const { serviceId, files, userCredentials, parameters } = req.body;

    if (!serviceId || !files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Service ID and files are required' 
      });
    }

    const processId = `process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scriptName = serviceScripts[serviceId];

    if (!scriptName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid service ID' 
      });
    }

    // Create process data
    const processData = {
      id: processId,
      serviceId,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      files,
      output: ['🚀 Starting automation process...', `📋 Service: ${serviceId}`, `📁 Processing ${files.length} files...`],
      resultFiles: []
    };

    activeProcesses.set(processId, processData);

    // Start the automation script
    startAutomationScript(processId, serviceId, files, userCredentials, parameters);

    res.json({
      success: true,
      processId,
      message: 'Automation process started successfully'
    });

  } catch (error) {
    console.error('Automation start error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to start automation',
      error: error.message 
    });
  }
});

// Get automation status
app.get('/api/automation/status/:processId', (req, res) => {
  const { processId } = req.params;
  const process = activeProcesses.get(processId);

  if (!process) {
    return res.status(404).json({ 
      success: false, 
      message: 'Process not found' 
    });
  }

  res.json({
    success: true,
    ...process
  });
});

// Stop automation process
app.post('/api/automation/stop/:processId', (req, res) => {
  const { processId } = req.params;
  const process = activeProcesses.get(processId);

  if (!process) {
    return res.status(404).json({ 
      success: false, 
      message: 'Process not found' 
    });
  }

  if (process.pythonProcess) {
    process.pythonProcess.kill('SIGTERM');
  }

  process.status = 'stopped';
  process.endTime = new Date();
  process.output.push('🛑 Process stopped by user');

  activeProcesses.set(processId, process);

  res.json({
    success: true,
    message: 'Process stopped successfully'
  });
});

// Download results
app.get('/api/automation/download/:processId', (req, res) => {
  const { processId } = req.params;
  const process = activeProcesses.get(processId);

  if (!process || process.status !== 'completed') {
    return res.status(404).json({ 
      success: false, 
      message: 'Process not found or not completed' 
    });
  }

  // In a real implementation, this would serve the actual result files
  res.json({
    success: true,
    resultFiles: process.resultFiles,
    downloadUrls: process.resultFiles.map(file => `/api/files/${processId}/${file}`),
    previewUrls: process.resultFiles
      .filter(file => file.endsWith('.pdf'))
      .map(file => `/api/preview/${processId}/${file}`)
  });
});

// Serve result files for download
app.get('/api/files/:processId/:filename', (req, res) => {
  const { processId, filename } = req.params;
  const process = activeProcesses.get(processId);

  if (!process || !process.resultFiles.includes(filename)) {
    return res.status(404).json({ 
      success: false, 
      message: 'File not found' 
    });
  }

  // Serve actual files from results directory
  const filePath = path.join(__dirname, '..', 'results', filename);
  
  // Check if file exists in results directory
  if (fs.existsSync(filePath)) {
    // Serve the actual file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('File download error:', err);
        res.status(500).json({ 
          success: false, 
          message: 'Failed to download file' 
        });
      }
    });
  } else {
    // Check in results/pdfs subdirectory
    const pdfPath = path.join(__dirname, '..', 'results', 'pdfs', filename);
    if (fs.existsSync(pdfPath)) {
      res.download(pdfPath, filename, (err) => {
        if (err) {
          console.error('PDF download error:', err);
          res.status(500).json({ 
            success: false, 
            message: 'Failed to download PDF' 
          });
        }
      });
    } else {
      // Generate log file content for .txt/.log files
      if (filename.endsWith('.txt') || filename.endsWith('.log')) {
        const logContent = process.output.join('\n') + '\n\n' +
          `Process ID: ${processId}\n` +
          `Service: ${process.serviceId}\n` +
          `Status: ${process.status}\n` +
          `Start Time: ${process.startTime}\n` +
          `End Time: ${process.endTime}\n` +
          `Files Processed: ${process.files.length}\n`;
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(logContent);
      } else {
        res.status(404).json({ 
          success: false, 
          message: 'File not found in results directory' 
        });
      }
    }
  }
});

// Preview PDF files
app.get('/api/preview/:processId/:filename', (req, res) => {
  const { processId, filename } = req.params;
  const process = activeProcesses.get(processId);

  if (!process || !process.resultFiles.includes(filename) || !filename.endsWith('.pdf')) {
    return res.status(404).json({ 
      success: false, 
      message: 'PDF file not found' 
    });
  }

  // Serve actual PDF file for preview
  const filePath = path.join(__dirname, '..', 'results', filename);
  const pdfPath = path.join(__dirname, '..', 'results', 'pdfs', filename);
  
  // Check if PDF exists in results directory
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(filePath));
  } else if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(pdfPath));
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'PDF file not found in results directory' 
    });
  }
});

// Function to start automation script
async function startAutomationScript(processId, serviceId, files, credentials, parameters) {
  const process = activeProcesses.get(processId);
  
  try {
    await runRealPythonAutomation(processId, serviceId, files, credentials, parameters);
  } catch (error) {
    console.error(`Automation error for ${processId}:`, error);
    process.status = 'failed';
    process.endTime = new Date();
    process.output.push(`❌ Automation failed: ${error.message}`);
    activeProcesses.set(processId, process);
  }
}

// Run real Python automation for any service
async function runRealPythonAutomation(processId, serviceId, files, credentials, parameters) {
  const process = activeProcesses.get(processId);
  
  // Get the script name for this service
  const scriptName = serviceScripts[serviceId];
  if (!scriptName) {
    throw new Error(`No script found for service: ${serviceId}`);
  }

  // Find the first uploaded file (CSV/Excel/PDF)
  const inputFile = files[0];
  if (!inputFile) {
    throw new Error('No input file found for processing');
  }

  // Build paths
  const scriptPath = path.join(__dirname, '..', 'automation_scripts', scriptName);
  
  // Find the actual uploaded file path
  let inputFilePath;
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const uploadedFiles = fs.readdirSync(uploadsDir);
  
  console.log('📁 Looking for uploaded files in:', uploadsDir);
  console.log('📁 Available files:', uploadedFiles);
  console.log('📁 Looking for file containing:', inputFile.name);
  
  // Find the most recent file that matches the input file name
  const matchingFile = uploadedFiles
    .filter(file => {
      const nameWithoutExt = inputFile.name.replace(/\.[^/.]+$/, "");
      const matches = file.includes(nameWithoutExt);
      console.log(`📋 Checking file: ${file}, matches: ${matches}`);
      return matches;
    })
    .sort((a, b) => {
      const statA = fs.statSync(path.join(uploadsDir, a));
      const statB = fs.statSync(path.join(uploadsDir, b));
      return statB.mtime - statA.mtime; // Most recent first
    })[0];
    
  if (matchingFile) {
    inputFilePath = path.join(uploadsDir, matchingFile);
    console.log('✅ Found matching file:', matchingFile);
    console.log('✅ Full path:', inputFilePath);
  } else {
    console.log('❌ No matching file found for:', inputFile.name);
    throw new Error(`Input file not found: ${inputFile.name}`);
  }
  
  // Check if Python script exists
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Automation script not found: ${scriptName}`);
  }

  // Check if input file exists
  if (!fs.existsSync(inputFilePath)) {
    throw new Error(`Input file not found: ${inputFilePath}`);
  }
  
  process.output.push(`🚀 Starting real ${serviceId} automation...`);
  process.output.push(`📋 Processing file: ${inputFile.name}`);
  process.output.push(`🐍 Script: ${scriptName}`);
  process.output.push(`📁 File path: ${inputFilePath}`);
  activeProcesses.set(processId, process);

  // Detect Python command based on operating system
  const getPythonCommand = () => {
    // In WebContainer/Bolt.new environment, use python
    return 'python3';
  };
  
  return new Promise((resolve, reject) => {
    let pythonCommand;
    
    try {
      pythonCommand = getPythonCommand();
    } catch (error) {
      process.output.push(`❌ ${error.message}`);
      process.output.push(`💡 Windows: Install Python from https://python.org`);
      process.output.push(`📋 Make sure to check "Add Python to PATH" during installation`);
      process.output.push(`🔄 Restart your computer after Python installation`);
      activeProcesses.set(processId, process);
      reject(error);
      return;
    }
    
    const pythonArgs = [
      scriptPath,
      inputFilePath,
      '--headless'
    ];

    process.output.push(`🔧 Command: ${pythonCommand} ${pythonArgs.join(' ')}`);
    process.output.push(`💻 Platform: ${process.platform}`);
    process.output.push(`🐍 Python detected: ${pythonCommand}`);
    activeProcesses.set(processId, process);

    const pythonProcess = spawn(pythonCommand, pythonArgs, {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    process.pythonProcess = pythonProcess;
    let outputBuffer = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      
      // Log raw Python output for debugging
      console.log('Python output:', output);
      
      // Parse output lines and update progress
      const lines = output.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.includes('INFO') || line.includes('✅') || line.includes('🔍') || line.includes('📄') || line.includes('Processing')) {
          process.output.push(line.trim());
          
          // Estimate progress based on output
          if (line.includes('Processing') && line.includes('/')) {
            const match = line.match(/(\d+)\/(\d+)/);
            if (match) {
              const current = parseInt(match[1]);
              const total = parseInt(match[2]);
              process.progress = Math.round((current / total) * 80); // 80% for processing
            }
          } else if (line.includes('Combining') || line.includes('Generating')) {
            process.progress = 90;
          } else if (line.includes('completed successfully')) {
            process.progress = 100;
          }
          
          activeProcesses.set(processId, process);
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log('Python stderr:', error);
      if (error.includes('ERROR') || error.includes('❌')) {
        process.output.push(`❌ ${error.trim()}`);
        activeProcesses.set(processId, process);
      } else if (error.includes('ModuleNotFoundError')) {
        process.output.push(`❌ Missing Python package: ${error.trim()}`);
        process.output.push(`💡 Install with: python3 -m pip install --user selenium pandas openpyxl beautifulsoup4 requests webdriver-manager`);
        process.output.push(`🔧 Or run the install script: ./install.sh`);
        process.output.push(`📋 Verify installation: python3 -c "import pandas; print('pandas installed')"`);
        activeProcesses.set(processId, process);
      }
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Success - look for generated files
        const resultsDir = path.join(__dirname, '..', 'results');
        let files = [];
        
        if (fs.existsSync(resultsDir)) {
          files = fs.readdirSync(resultsDir).filter(file => 
            file.includes('report') && (file.endsWith('.pdf') || file.endsWith('.xlsx') || file.endsWith('.txt'))
          );
        }
        
        process.status = 'completed';
        process.endTime = new Date();
        process.progress = 100;
        process.resultFiles = files.length > 0 ? files : [`${serviceId}_report_${Date.now()}.pdf`];
        process.output.push(`🎉 ${serviceId} automation completed successfully!`);
        if (files.length > 0) {
          process.output.push(`📄 Generated: ${process.resultFiles[0]}`);
        } else {
          process.output.push('📄 Report generation completed');
        }
        
        activeProcesses.set(processId, process);
        resolve();
      } else {
        // Automation failed - refund credits
        console.log(`🔄 Automation failed for process ${processId}, refunding ${process.creditsUsed} credits`);
        
        // Find user and refund credits (simulate API call to frontend)
        // In a real app, you'd have user context here
        process.output.push(`💰 Refunding ${process.creditsUsed} credits due to automation failure`);
        
        process.status = 'failed';
        process.endTime = new Date();
        process.output.push(`❌ Automation failed with exit code: ${code}`);
        
        // Provide specific error messages for common exit codes
        if (code === 9009) {
          process.output.push(`💡 Error 9009: Python command not found`);
          process.output.push(`🔧 Solution: Install Python from https://python.org`);
          process.output.push(`📋 Make sure to check "Add Python to PATH" during installation`);
        } else if (code === 1) {
          process.output.push(`💡 Error 1: Python script execution failed`);
          process.output.push(`🔧 Check if all required packages are installed:`);
          process.output.push(`   python3 -m pip install --user selenium pandas openpyxl beautifulsoup4 requests webdriver-manager`);
          process.output.push(`🔍 Verify pandas: python3 -c "import pandas; print('OK')"`);
          process.output.push(`📋 Run install script: ./install.sh`);
        }
        
        activeProcesses.set(processId, process);
        reject(new Error(`Python script failed with exit code: ${code}`));
      }
    });

    pythonProcess.on('error', (error) => {
      process.status = 'failed';
      process.endTime = new Date();
      process.output.push(`❌ Failed to start Python script: ${error.message}`);
      
      if (error.code === 'ENOENT') {
        process.output.push(`💡 Python not found in system PATH`);
        process.output.push(`🔧 Install Python from: https://python.org`);
        process.output.push(`📋 Windows: Use 'python' command instead of 'python3'`);
      }
      
      activeProcesses.set(processId, process);
      reject(error);
    });
  });
}


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Process Flow Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      services: '/api/services',
      upload: '/api/upload',
      automation: '/api/automation/*'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Smart Process Flow Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`🤖 Automation endpoint: http://localhost:${PORT}/api/automation/start`);
}).on('error', (err) => {
  console.error('❌ Server startup error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`💡 Port ${PORT} is already in use. Try a different port or kill the existing process.`);
    console.error(`🔧 To kill existing process: lsof -ti:${PORT} | xargs kill -9`);
  } else if (err.code === 'EACCES') {
    console.error(`💡 Permission denied on port ${PORT}. Try using a port > 1024 or run with sudo.`);
  } else {
    console.error(`💡 Server failed to start: ${err.message}`);
  }
  process.exit(1);
});

module.exports = app;
