import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        addressee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((r) => {
      const isIncoming = r.addresseeId === userId;
      const friend = isIncoming ? r.requester : r.addressee;
      return {
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        requesterId: r.requesterId,
        friend,
        isIncoming,
      };
    });
  }

  async requestUsername(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');
    if (target.id === userId) throw new BadRequestException('Tu ne peux pas t ajouter toi-meme');

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: target.id },
          { requesterId: target.id, addresseeId: userId },
        ],
      },
    });
    if (existing) throw new BadRequestException('Relation deja existante');

    return this.prisma.friendship.create({
      data: { requesterId: userId, addresseeId: target.id, status: FriendshipStatus.PENDING },
    });
  }

  accept(userId: string, friendshipId: string) {
    return this.prisma.friendship.updateMany({
      where: {
        id: friendshipId,
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      data: { status: FriendshipStatus.ACCEPTED },
    });
  }


  remove(userId: string, friendshipId: string) {
    return this.prisma.friendship.deleteMany({
      where: {
        id: friendshipId,
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
    });
  }

}