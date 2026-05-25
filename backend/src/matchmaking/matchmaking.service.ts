import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface QueueEntry {
  userId: string;
  joinedAt: string;
}

export interface MatchResult {
  roomId: string;
  players: string[];
  createdAt: string;
}

@Injectable()
export class MatchmakingService {
  private readonly queue = new Map<string, QueueEntry>();
  private readonly matches = new Map<string, MatchResult>();

  join(userId: string) {
    const existingMatch = this.matches.get(userId);
    if (existingMatch) {
      return { status: 'matched' as const, match: existingMatch };
    }

    const opponent = Array.from(this.queue.values()).find((entry) => entry.userId !== userId);
    if (opponent) {
      this.queue.delete(opponent.userId);
      this.queue.delete(userId);

      const match: MatchResult = {
        roomId: `match-${randomUUID()}`,
        players: [opponent.userId, userId],
        createdAt: new Date().toISOString(),
      };

      this.matches.set(opponent.userId, match);
      this.matches.set(userId, match);

      return { status: 'matched' as const, match };
    }

    const entry = { userId, joinedAt: new Date().toISOString() };
    this.queue.set(userId, entry);
    return { status: 'queued' as const, entry };
  }

  leave(userId: string) {
    this.queue.delete(userId);
    this.matches.delete(userId);
    return { status: 'idle' as const };
  }

  status(userId: string) {
    const match = this.matches.get(userId);
    if (match) {
      return { status: 'matched' as const, match };
    }

    const entry = this.queue.get(userId);
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

  snapshot() {
    return Array.from(this.queue.values());
  }
}
