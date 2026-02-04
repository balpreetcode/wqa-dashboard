const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

// Ensure upload directories exist
const requirementsDir = path.join(UPLOADS_DIR, 'requirements');
const testcasesDir = path.join(UPLOADS_DIR, 'testcases');

fs.mkdirSync(requirementsDir, { recursive: true });
fs.mkdirSync(testcasesDir, { recursive: true });

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'requirements_file') {
      cb(null, requirementsDir);
    } else if (file.fieldname === 'test_cases_csv') {
      cb(null, testcasesDir);
    } else {
      cb(null, UPLOADS_DIR);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'requirements_file') {
    // Allow PDF, MD, TXT
    const allowedTypes = ['.pdf', '.md', '.txt', '.markdown'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Requirements file must be PDF, MD, or TXT'), false);
    }
  } else if (file.fieldname === 'test_cases_csv') {
    // Allow CSV
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Test cases file must be CSV'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

module.exports = upload;
