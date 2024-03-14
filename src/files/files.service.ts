import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class FilesService {
  constructor(private readonly configService: ConfigService) {}
  uploadFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Make sure the file is an image');

    const fileSecurePath = `${this.configService.get<string>('hostApi')}/files/product/${
      file.filename
    }`;
    return { secureUrl: fileSecurePath };
  }

  getProductImg(imageName: string) {
    const path = join(__dirname, '../..', 'static/uploads', imageName);

    if (!existsSync(path))
      throw new BadRequestException(`The image ${imageName} does not exist`);

    return path;
  }
}
