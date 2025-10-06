import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ForumPostService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async existingUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');
  }

  async existingForumThreads(idForumThreads: string) {
    const existingForumThreads =
      await this.databaseService.forumThreads.findUnique({
        where: { idForumThreads },
      });
    if (!existingForumThreads)
      throw new BadRequestException('Forum thread not found');
  }

  /** ------------------ 🧩 CREATE ------------------ */
  async createForumPost(
    createForumPostDto: CreateForumPostDto,
    file?: Express.Multer.File,
  ) {
    const { idForumThreads, idUser, content } = createForumPostDto;

    await this.existingUser(idUser);
    await this.existingForumThreads(idForumThreads);

    let fileUrl: string | null = null;

    // 🖼 Upload hình lên Cloudinary nếu có file
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      fileUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.forumPost.create({
      data: {
        idForumThreads,
        idUser,
        content,
        file: fileUrl,
      },
    });

    return {
      message: 'Forum Post created successfully',
      data,
      status: 200,
    };
  }

  /** ------------------ 📋 FIND ALL ------------------ */
  async findAllByIdForumThread(idForumThreads: string) {
    await this.existingForumThreads(idForumThreads);

    const data = await this.databaseService.forumPost.findMany({
      where: { idForumThreads },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
      },
    });

    return {
      message: 'Forum posts retrieved successfully',
      data,
      status: 200,
    };
  }

  /** ------------------ 🔍 FIND ONE ------------------ */
  async findForumPost(idForumPost: string) {
    const data = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
      },
    });

    if (!data) throw new BadRequestException('Forum post not found');

    return {
      message: 'Forum post retrieved successfully',
      data,
      status: 200,
    };
  }

  /** ------------------ ✏️ UPDATE ------------------ */
  async updateForumPost(
    idForumPost: string,
    updateForumPostDto: UpdateForumPostDto,
    file?: Express.Multer.File,
  ) {
    const { idForumThreads, idUser, content } = updateForumPostDto;

    await this.existingUser(idUser);
    await this.existingForumThreads(idForumThreads);

    let fileUrl = updateForumPostDto.file;

    // 🖼 Nếu có file upload, thì upload lên Cloudinary
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      fileUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.forumPost.update({
      where: { idForumPost },
      data: {
        idForumThreads,
        idUser,
        content,
        file: fileUrl,
      },
    });

    return {
      message: 'Forum Post updated successfully',
      data,
      status: 200,
    };
  }

  /** ------------------ 🗑️ DELETE ------------------ */
  async removeForumPost(idForumPost: string) {
    const existing = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
    });
    if (!existing) throw new BadRequestException('Forum post not found');

    await this.databaseService.forumPost.delete({
      where: { idForumPost },
    });

    return {
      message: 'Forum post deleted successfully',
      status: 200,
    };
  }
}
