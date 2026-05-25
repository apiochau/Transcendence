import { Injectable } from '@nestjs/common';

export interface QueueEntry {
  userId: string;
  joinedAt: string;
}

@Injectable()
export class MatchmakingService {
  private readonly queue = new Map<string, QueueEntry>();

  join(userId: string) {
    const entry = { userId, joinedAt: new Date().toISOString() };
    this.queue.set(userId, entry);
    return entry;
  }

  leave(userId: string) {
    this.queue.delete(userId);
    return { queued: false };
  }

  snapshot() {
    return Array.from(this.queue.values());
  }
}
