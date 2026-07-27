const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage engine configuration
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|zip|rar|xlsx/;
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = allowedExtensions.test(ext.replace('.', ''));

  if (isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload images, PDFs, or documents.'));
  }
};

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB file size limit
  fileFilter
});

module.exports = upload;
