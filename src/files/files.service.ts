import { Injectable } from '@nestjs/common';

@Injectable()
export class FilesService {
  async uploadFile(file) {
    return file;
  }
}
