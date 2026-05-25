import { Injectable } from '@nestjs/common';
import { GameStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  createWaitingGame(playerOneId: string) {
    return this.prisma.game.create({
      data: {
        playerOneId,
        roomId: `game:${randomUUID()}`,
        status: GameStatus.WAITING,
      },
    });
  }

  findById(id: string) {
    return this.prisma.game.findUnique({ where: { id } });
  }

  listRecent() {
    return this.prisma.game.findMany({ orderBy: { createdAt: 'desc' }, take: 25 });
  }
}
