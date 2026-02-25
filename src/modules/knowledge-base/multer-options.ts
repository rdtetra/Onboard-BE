import { diskStorage } from 'multer';
import { extname, resolve, relative } from 'path';
import { SourceType } from '../../types/knowledge-base';
import { ensureDir } from '../../utils/file.util';

export const UPLOAD_DIR = 'uploads/kb-sources';

const allowedMimeTypes: Record<string, SourceType> = {
  'application/pdf': SourceType.PDF,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    SourceType.DOCX,
};

function ensureUploadDir(): string {
  ensureDir(UPLOAD_DIR);
  return UPLOAD_DIR;
}

export const kbSourceUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, ensureUploadDir());
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.docx');
      const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      cb(null, `${base}${ext}`);
    },
  }),
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
};

/** Relative path for stored file (e.g. uploads/kb-sources/xxx.pdf) for use as sourceValue */
export function getSourceValueFromFile(filename: string): string {
  return `${UPLOAD_DIR}/${filename}`;
}

/** Resolve sourceValue to absolute path for download; returns null if not a local path or outside UPLOAD_DIR */
export function getAbsolutePathForDownload(sourceValue: string): string | null {
  if (!sourceValue?.startsWith(UPLOAD_DIR + '/')) return null;
  const absolute = resolve(process.cwd(), sourceValue);
  const allowedDir = resolve(process.cwd(), UPLOAD_DIR);
  const rel = relative(allowedDir, absolute);
  if (rel.startsWith('..') || rel === '') return null;
  return absolute;
}
