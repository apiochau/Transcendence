import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data: {
        ...data,
        stats: { create: {} },
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByEmailOrUsername(email: string, username: string) {
    return this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
  }

  async getPublicProfile(id: string) {
    const profile = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        stats: true,
      },
    });

    if (!profile) {
      return null;
    }

    const collectionItems = await this.prisma.wordCollectionItem.findMany({
      where: { userId: id },
      select: {
        quantity: true,
        word: { select: { value: true } },
      },
    });

    return {
      ...profile,
      collectionValue: collectionItems.reduce((total, item) => total + item.quantity * item.word.value, 0),
    };
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
  }
}
