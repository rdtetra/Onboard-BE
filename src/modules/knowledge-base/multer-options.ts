import { memoryStorage } from 'multer';
import { resolve, relative } from 'path';
import { SourceType } from '../../types/knowledge-base';

export const UPLOAD_DIR = 'uploads/kb-sources';

const allowedMimeTypes: Record<string, SourceType> = {
  'application/pdf': SourceType.PDF,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    SourceType.DOCX,
};

export const kbSourceUploadOptions = {
  storage: memoryStorage(),
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (err: Error | null, accept: boolean) => void,
  ) => {
    if (file.mimetype in allowedMimeTypes) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};

export function getAbsolutePathForDownload(sourceValue: string): string | null {
  if (!sourceValue?.startsWith(UPLOAD_DIR + '/')) {
    return null;
  }

  const absolute = resolve(process.cwd(), sourceValue);
  const allowedDir = resolve(process.cwd(), UPLOAD_DIR);
  const rel = relative(allowedDir, absolute);

  if (rel.startsWith('..') || rel === '') {
    return null;
  }

  return absolute;
}
