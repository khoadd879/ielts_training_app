import { BadRequestException, Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  //File validation constants
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
  ];

  uploadFile(
    file: Express.Multer.File,
    folder: string = 'tests',
    type: 'image' | 'audio' | 'auto' | 'raw' = 'auto',
  ): Promise<UploadApiResponse> {
    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds limit. Maximum allowed: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    //Validate MIME type based on upload type
    if (type === 'image' && !this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid image type. Allowed: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    if (type === 'audio' && !this.ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid audio type. Allowed: ${this.ALLOWED_AUDIO_TYPES.join(', ')}`,
      );
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: type === 'audio' ? 'video' : type,
          // Lưu ý: Cloudinary không có "audio", phải dùng "video" để hỗ trợ audio
          folder,
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) return reject(error);
          if (!result)
            return reject(new Error('Upload failed, result is undefined'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
