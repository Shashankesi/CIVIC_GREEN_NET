const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
});

module.exports = upload;
