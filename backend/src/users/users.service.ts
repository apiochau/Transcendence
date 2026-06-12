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

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findByOAuth(provider: string, oauthId: string) {
    return this.prisma.user.findFirst({
      where: {
        oauthProvider: provider,
        oauthId,
      },
    });
  }

  findByEmailOrUsername(email: string, username: string) {
    return this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
  }

  linkOAuthAccount(id: string, provider: string, oauthId: string, data: Pick<Prisma.UserUpdateInput, 'avatarUrl' | 'displayName'> = {}) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        oauthProvider: provider,
        oauthId,
      },
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

  async getMatchHistory(userId: string) {
    const games = await this.prisma.game.findMany({
      where: {
        OR: [{ playerOneId: userId }, { playerTwoId: userId }],
        status: 'FINISHED',
      },
      include: {
        playerOne: { select: { id: true, username: true, displayName: true, avatarUrl: true }},
        playerTwo: { select: { id: true, username: true, displayName: true, avatarUrl: true }},
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return games.map((game) => ({
      id: game.id,
      createdAt: game.createdAt,
      opponent: game.playerOneId === userId ? game.playerTwo : game.playerOne,
      result: game.winnerId === userId ? 'win' : game.winnerId === null ? 'draw' : 'loss',
    }));
  }
}
