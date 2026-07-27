const path = require('path');
const cloudinary = require('cloudinary').v2;

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
 * @returns {'image' | 'pdf' | 'document'}
 */
const getFileType = (mimetype, originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  if (mimetype.startsWith('image/') || /jpeg|jpg|png|gif|webp/.test(ext)) {
    return 'image';
  }
  if (mimetype === 'application/pdf' || ext === '.pdf') {
    return 'pdf';
  }
  return 'document';
};

/**
 * @desc    Upload file / image endpoint
 * @route   POST /api/upload
 * @access  Private
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
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
    }

    return res.status(201).json({
      url: fileUrl,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile
};
