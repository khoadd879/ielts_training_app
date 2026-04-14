import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PdfExamController } from './pdf-exam.controller';
import { PdfExamService } from './services/pdf-exam.service';
import { PdfParserService } from './services/pdf-parser.service';
import { StructureAnalyzerService } from './services/structure-analyzer.service';
import { DoclingService } from './services/docling.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(new Error('Only PDF files are allowed'), false);
        }
        callback(null, true);
      },
    }),
    CloudinaryModule,
    DatabaseModule,
  ],
  controllers: [PdfExamController],
  providers: [
    PdfExamService,
    PdfParserService,
    StructureAnalyzerService,
    DoclingService,
    CloudinaryService,
  ],
  exports: [PdfExamService],
})
export class PdfExamModule {}
