const multer = require('multer');
const path = require('path');

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext) && (ALLOWED_MIME_TYPES.includes(mime) || !file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Invalid file type. Only PNG, JPG, JPEG, and WEBP images are allowed.');
      err.code = 'INVALID_FILE_TYPE';
      cb(err, false);
    }
  }
});

module.exports = upload;
