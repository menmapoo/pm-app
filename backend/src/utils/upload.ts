import multer from 'multer';

export const createFileUpload = () =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
      ];
      if (allowedMimes.includes(file.mimetype) || /\.(csv|xlsx|xls)$/i.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV and Excel files (.csv, .xlsx, .xls) are allowed'));
      }
    },
  });
