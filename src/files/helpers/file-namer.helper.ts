import * as crypto from 'node:crypto';
export const fileNamer = (
  req: Express.Request,
  file: Express.Multer.File,
  // eslint-disable-next-line @typescript-eslint/ban-types
  callback: Function,
) => {
  if (!file) return callback(new Error('File is empty'), false);
  const fileExtension = file.mimetype.split('/')[1];
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;

  callback(null, fileName);
};
