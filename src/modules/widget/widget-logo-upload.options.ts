import { memoryStorage } from 'multer';

const ALLOWED_LOGO_MIME = ['image/png', 'image/jpeg', 'image/jpg'];

export const widgetLogoUploadOptions = {
  storage: memoryStorage(),
  fileFilter: (
    req: unknown,
    file: Express.Multer.File,
    cb: (err: Error | null, accept: boolean) => void,
  ) => {
    void req;
    if (ALLOWED_LOGO_MIME.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Logo must be PNG or JPEG'), false);
    }
  },
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
};
