import { memoryStorage } from 'multer';

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg'];

export const profilePictureUploadOptions = {
  storage: memoryStorage(),
  fileFilter: (
    req: unknown,
    file: Express.Multer.File,
    cb: (err: Error | null, accept: boolean) => void,
  ) => {
    void req;
    if (ALLOWED_MIME.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Profile picture must be PNG or JPEG'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};
