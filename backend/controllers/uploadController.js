const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');
const { verifyMagicBytes } = require('../middleware/uploadMiddleware');

// Configure Cloudinary if credentials present
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Determine classification category for uploaded file
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {'image' | 'pdf' | 'document' | 'audio'}
 */
const getFileType = (mimetype, originalname) => {
  const ext = path.extname(originalname || '').toLowerCase();
  if (mimetype.startsWith('image/') || /jpeg|jpg|png|gif|webp/.test(ext)) {
    return 'image';
  }
  if (mimetype.startsWith('video/') || /mp4|webm|mov|m4v|mkv/.test(ext)) {
    return 'video';
  }
  if (mimetype.startsWith('audio/') || /mp3|wav|m4a|ogg/.test(ext)) {
    return 'audio';
  }
  if (mimetype === 'application/pdf' || ext === '.pdf') {
    return 'pdf';
  }
  return 'document';
};

/**
 * Best-effort cleanup of the temp file on disk (Cloudinary path or failed local path).
 */
const cleanupTempFile = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    logger.warn(`[Upload] Failed to clean temp file ${filePath}: ${err.message}`);
  }
};

/**
 * @desc    Upload file / image endpoint
 * @route   POST /api/upload
 * @access  Private
 */
const uploadFile = async (req, res, next) => {
  let localPath = req.file ? req.file.path : null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Reject empty files (0 bytes)
    if (!req.file.size || req.file.size === 0) {
      cleanupTempFile(localPath);
      return res.status(400).json({ message: 'Uploaded file is empty' });
    }

    // Magic-byte validation: reject extension-spoofed files
    const ext = path.extname(req.file.originalname || '').toLowerCase().replace('.', '');
    const contentValid = await verifyMagicBytes(req.file.path, ext);
    if (!contentValid) {
      cleanupTempFile(localPath);
      return res.status(400).json({ message: 'File content does not match its extension. Upload rejected.' });
    }

    const fileType = getFileType(req.file.mimetype, req.file.originalname);
    let fileUrl;

    // Use Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'chatroom_uploads',
        resource_type: 'auto'
      });
      fileUrl = result.secure_url;
    } else {
      // Local static uploads URL
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      localPath = null; // keep local file when serving from disk
    }

    return res.status(201).json({
      url: fileUrl,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    cleanupTempFile(localPath);
    next(error);
  }
};

module.exports = {
  uploadFile
};
