import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const MAX_MESSAGE_LENGTH = 500;
const HISTORY_LIMIT = 50;

const senderSelect = {
  sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
};

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalHistory() {
    const messages = await (this.prisma as any).message.findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      include: senderSelect,
    });
    return messages.reverse();
  }

  async postGlobal(userId: string, content: string) {
    const trimmed = this.validateContent(content);
    return (this.prisma as any).message.create({
      data: { senderId: userId, content: trimmed, isGlobal: true },
      include: senderSelect,
    });
  }

  async getPrivateHistory(userId: string, otherUserId: string) {
    await this.assertFriends(userId, otherUserId);
    const messages = await (this.prisma as any).message.findMany({
      where: {
        isGlobal: false,
        OR: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      include: senderSelect,
    });
    return messages.reverse();
  }

  async postPrivate(userId: string, recipientId: string, content: string) {
    if (recipientId === userId) {
      throw new BadRequestException('Tu ne peux pas t envoyer un message a toi-meme');
    }
    const trimmed = this.validateContent(content);
    await this.assertFriends(userId, recipientId);
    return (this.prisma as any).message.create({
      data: { senderId: userId, recipientId, content: trimmed, isGlobal: false },
      include: senderSelect,
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await (this.prisma as any).message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message introuvable');
    if (message.senderId !== userId) {
      throw new ForbiddenException('Tu ne peux supprimer que tes propres messages');
    }
    await (this.prisma as any).message.delete({ where: { id: messageId } });
    return { ok: true };
  }

  private validateContent(content: string) {
    const trimmed = (content ?? '').trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('Le message ne peut pas etre vide');
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`Le message ne peut pas depasser ${MAX_MESSAGE_LENGTH} caracteres`);
    }
    return trimmed;
  }

  private async assertFriends(userIdA: string, userIdB: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userIdA, addresseeId: userIdB },
          { requesterId: userIdB, addresseeId: userIdA },
        ],
      },
    });
    if (!friendship) {
      throw new ForbiddenException('Vous devez etre amis pour echanger des messages');
    }
  }
}
