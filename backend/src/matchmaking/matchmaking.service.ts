import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CollectionService } from '../collection/collection.service';
import { PrismaService } from '../prisma.service';
import { GameStatus } from '@prisma/client';

export type MatchmakingMode = 'training' | 'daily' | 'duel';

export interface QueueEntry {
  userId: string;
  mode: MatchmakingMode;
  joinedAt: string;
  stakeLockId?: string;
  stakeWordId?: string;
  stakeWordText?: string;
  stakeRarity?: string;
}

export interface MatchResult {
  roomId: string;
  mode: MatchmakingMode;
  players: string[];
  createdAt: string;
  stakes?: Array<{
    userId: string;
    stakeLockId: string;
    wordId: string;
    word: string;
    rarity: string;
  }>;
}

@Injectable()
export class MatchmakingService {
  private readonly queues = new Map<string, Map<string, QueueEntry>>();
  private readonly matches = new Map<string, MatchResult>();
  private readonly roomConfigs = new Map<string, MatchResult>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly collectionService: CollectionService,
  ) {}

  async join(userId: string, mode: MatchmakingMode = 'training', stakeCollectionItemId?: string) {
    const existingMatch = this.matches.get(userId);
    if (existingMatch) {
      return { status: 'matched' as const, match: existingMatch };
    }

    if (mode === 'daily') {
      await this.assertDailyAvailable(userId);
    }

    const existingEntry = this.findQueuedEntry(userId);
    if (existingEntry) {
      return { status: 'queued' as const, entry: existingEntry };
    }

    const stakeEntry = mode === 'duel'
      ? await this.createDuelStakeEntry(userId, stakeCollectionItemId)
      : {};
    const entry: QueueEntry = {
      userId,
      mode,
      joinedAt: new Date().toISOString(),
      ...stakeEntry,
    };
    const queueKey = this.getQueueKey(entry);
    const queue = this.getQueue(queueKey);
    const opponent = Array.from(queue.values()).find((queuedEntry) => queuedEntry.userId !== userId);

    if (!opponent) {
      queue.set(userId, entry);
      return { status: 'queued' as const, entry };
    }

    queue.delete(opponent.userId);
    const match = await this.createMatch(opponent, entry);
    this.matches.set(opponent.userId, match);
    this.matches.set(userId, match);
    this.roomConfigs.set(match.roomId, match);

    return { status: 'matched' as const, match };
  }

  async leave(userId: string) {
    const entry = this.removeQueuedEntry(userId);
    if (entry?.stakeLockId) {
      await this.collectionService.refundStake(entry.stakeLockId);
    }

    return { status: 'idle' as const };
  }

  status(userId: string) {
    const match = this.matches.get(userId);
    if (match) {
      return { status: 'matched' as const, match };
    }

    const entry = this.findQueuedEntry(userId);
    if (entry) {
      return { status: 'queued' as const, entry };
    }

    return { status: 'idle' as const };
  }

  consumeMatch(userId: string) {
    const match = this.matches.get(userId);
    this.matches.delete(userId);
    return match ? { status: 'matched' as const, match } : { status: 'idle' as const };
  }

  getRoomConfig(roomId: string) {
    return this.roomConfigs.get(roomId);
  }

  async dailyStatus(userId: string) {
    const dayKey = this.getTodayKey();
    const attempt = await this.prisma.dailyMatchAttempt.findUnique({
      where: {
        userId_dayKey: {
          userId,
          dayKey,
        },
      },
    });

    return {
      dayKey,
      available: !attempt,
      usedAt: attempt?.createdAt ?? null,
      nextAvailableAt: attempt ? this.getNextDailyResetAt().toISOString() : null,
    };
  }

  snapshot() {
    return Array.from(this.queues.values()).flatMap((queue) => Array.from(queue.values()));
  }

  private async createDuelStakeEntry(userId: string, stakeCollectionItemId?: string) {
    if (!stakeCollectionItemId) {
      throw new BadRequestException('A collection word is required to enter Duel mode');
    }

    try {
      const stakeLock = await this.collectionService.createStakeLock(userId, stakeCollectionItemId);
      return {
        stakeLockId: stakeLock.id,
        stakeWordId: stakeLock.wordId,
        stakeWordText: stakeLock.word.text,
        stakeRarity: stakeLock.rarity,
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  private async createMatch(first: QueueEntry, second: QueueEntry): Promise<MatchResult> {
    const roomId = `match-${randomUUID()}`;

    if (first.mode === 'daily') {
      await this.consumeDailyAttempts([first.userId, second.userId], roomId);
    }

    const stakes = first.mode === 'duel'
      ? await Promise.all([first, second].map(async (entry) => {
        if (!entry.stakeLockId || !entry.stakeWordId || !entry.stakeWordText || !entry.stakeRarity) {
          throw new BadRequestException('Invalid duel stake');
        }

        await this.collectionService.assignStakeToRoom(entry.stakeLockId, roomId);
        return {
          userId: entry.userId,
          stakeLockId: entry.stakeLockId,
          wordId: entry.stakeWordId,
          word: entry.stakeWordText,
          rarity: entry.stakeRarity,
        };
      }))
      : undefined;

    await this.prisma.game.create({
      data: {
        roomId,
        playerOneId: first.userId,
        playerTwoId: second.userId,
        status: GameStatus.ACTIVE,
      },
    });

    return {
      roomId,
      mode: first.mode,
      players: [first.userId, second.userId],
      createdAt: new Date().toISOString(),
      stakes,
    };
  }

  private async consumeDailyAttempts(userIds: string[], roomId: string) {
    const dayKey = this.getTodayKey();

    try {
      await this.prisma.$transaction(
        userIds.map((userId) =>
          this.prisma.dailyMatchAttempt.create({
            data: {
              userId,
              dayKey,
              roomId,
            },
          }),
        ),
      );
    } catch {
      throw new BadRequestException('Daily match already used today');
    }
  }

  private async assertDailyAvailable(userId: string) {
    const status = await this.dailyStatus(userId);
    if (!status.available) {
      throw new BadRequestException('Daily mode is already used today');
    }
  }

  private getQueue(queueKey: string) {
    const existingQueue = this.queues.get(queueKey);
    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Map<string, QueueEntry>();
    this.queues.set(queueKey, queue);
    return queue;
  }

  private getQueueKey(entry: QueueEntry) {
    if (entry.mode === 'duel') {
      return `${entry.mode}:${entry.stakeRarity}`;
    }

    return entry.mode;
  }

  private findQueuedEntry(userId: string) {
    for (const queue of this.queues.values()) {
      const entry = queue.get(userId);
      if (entry) {
        return entry;
      }
    }

    return undefined;
  }

  private removeQueuedEntry(userId: string) {
    for (const queue of this.queues.values()) {
      const entry = queue.get(userId);
      if (entry) {
        queue.delete(userId);
        return entry;
      }
    }

    return undefined;
  }

  private getTodayKey(date = new Date()) {
    const parts = this.getParisDateParts(date);
    return `${parts.year}-${this.padDatePart(parts.month)}-${this.padDatePart(parts.day)}`;
  }

  private getNextDailyResetAt(now = new Date()) {
    const todayParts = this.getParisDateParts(now);
    const nextDayProbe = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day + 1, 12));
    const nextDayParts = this.getParisDateParts(nextDayProbe);
    const searchStart = Date.UTC(nextDayParts.year, nextDayParts.month - 1, nextDayParts.day, 0) - 3 * 60 * 60 * 1000;

    for (let minuteOffset = 0; minuteOffset <= 6 * 60; minuteOffset += 1) {
      const candidate = new Date(searchStart + minuteOffset * 60 * 1000);
      const parts = this.getParisDateTimeParts(candidate);
      if (
        parts.year === nextDayParts.year &&
        parts.month === nextDayParts.month &&
        parts.day === nextDayParts.day &&
        parts.hour === 0 &&
        parts.minute === 0
      ) {
        return candidate;
      }
    }

    return new Date(Date.UTC(nextDayParts.year, nextDayParts.month - 1, nextDayParts.day, 0));
  }

  private getParisDateParts(date: Date) {
    const parts = this.getParisDateTimeParts(date);
    return {
      year: parts.year,
      month: parts.month,
      day: parts.day,
    };
  }

  private getParisDateTimeParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const valueFor = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return {
      year: valueFor('year'),
      month: valueFor('month'),
      day: valueFor('day'),
      hour: valueFor('hour'),
      minute: valueFor('minute'),
    };
  }

  private padDatePart(value: number) {
    return String(value).padStart(2, '0');
  }
}
