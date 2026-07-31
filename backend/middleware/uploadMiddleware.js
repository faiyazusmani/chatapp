const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Map of allowed extensions → allowed MIME types (double validation against spoofing)
const ALLOWED_TYPES = new Map([
  ['jpeg', ['image/jpeg', 'image/jpg']],
  ['jpg', ['image/jpeg', 'image/jpg']],
  ['png', ['image/png']],
  ['gif', ['image/gif']],
  ['webp', ['image/webp']],
  ['pdf', ['application/pdf']],
  ['doc', ['application/msword']],
  ['docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
  ['txt', ['text/plain']],
  ['zip', ['application/zip', 'application/x-zip-compressed']],
  ['rar', ['application/vnd.rar', 'application/x-rar-compressed']],
  ['xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
  ['webm', ['video/webm', 'audio/webm']],
  ['mp3', ['audio/mpeg']],
  ['wav', ['audio/wav', 'audio/x-wav', 'audio/wave']],
  ['m4a', ['audio/mp4', 'audio/x-m4a']],
  ['ogg', ['audio/ogg', 'application/ogg']],
  ['mp4', ['video/mp4']]
]);

/**
 * Magic-byte signatures (file content sniffing — defeats extension spoofing).
 * Returns true when the buffer starts with the expected signature for `ext`.
 */
const MAGIC_SIGNATURES = {
  jpeg: [[0xff, 0xd8, 0xff]],
  jpg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  gif: [[0x47, 0x49, 0x46, 0x38]],
  webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  zip: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]],
  docx: [[0x50, 0x4b, 0x03, 0x04]], // OOXML is a zip
  xlsx: [[0x50, 0x4b, 0x03, 0x04]],
  mp3: [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]],
  wav: [[0x52, 0x49, 0x46, 0x46]], // RIFF....WAVE
  m4a: [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  ogg: [[0x4f, 0x67, 0x67, 0x53]], // OggS
  mp4: [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  webm: [[0x1a, 0x45, 0xdf, 0xa3]],
  rar: [[0x52, 0x61, 0x72, 0x21]], // Rar!
  doc: null, // legacy binary .doc — no reliable universal signature
  txt: null // plain text — no signature
};

/**
 * Verify that a file's content matches its declared extension (magic bytes).
 * @param {string} filePath
 * @param {string} ext - normalized extension without dot
 * @returns {Promise<boolean>}
 */
const verifyMagicBytes = async (filePath, ext) => {
  const sigs = MAGIC_SIGNATURES[ext];
  if (!sigs) return true; // no signature defined → skip content check
  try {
    const fd = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(12);
    const { bytesRead } = await fd.read(buf, 0, 12, 0);
    await fd.close();
    if (bytesRead < 4) return false;
    const head = buf.subarray(0, bytesRead);
    return sigs.some((sig) => {
      if (head.length < sig.length) return false;
      return sig.every((byte, i) => head[i] === byte);
    });
  } catch {
    return false;
  }
};

// Disk storage engine configuration
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter validation: BOTH extension AND MIME type must match
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
  const allowedMimes = ALLOWED_TYPES.get(ext);
  const isMimeValid = allowedMimes ? allowedMimes.includes(file.mimetype) : false;

  if (isMimeValid) {
    cb(null, true);
  } else {
    const err = new Error('Unsupported file format. Please upload images, audio, PDFs, or documents.');
    err.status = 400;
    cb(err);
  }
};

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB file size limit
    files: 1 // single file per request
  },
  fileFilter
});

module.exports = upload;
module.exports.verifyMagicBytes = verifyMagicBytes;
module.exports.ALLOWED_TYPES = ALLOWED_TYPES;
