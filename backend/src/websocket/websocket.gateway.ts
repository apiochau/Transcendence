import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CollectionService } from '../collection/collection.service';
import { SimilarityService } from '../game/similarity.service';
import { SimilarityBucket } from '../game/types/suggestion.types';
import { LocalWord, WordService } from '../game/word.service';
import { MatchmakingMode, MatchmakingService } from '../matchmaking/matchmaking.service';
import { StatsService } from '../stats/stats.service';

interface JoinRoomPayload {
  roomId: string;
}

interface GameSignalPayload {
  roomId: string;
  event: string;
  data?: {
    wordId?: string;
    answer?: string;
  };
}

interface JwtPayload {
  sub: string;
}

interface MultiplayerHistoryItem {
  wordId: string;
  word: string;
  score: number;
  bucket: SimilarityBucket;
  createdAt: string;
}

interface PlayerState {
  socketIds: Set<string>;
  ready: boolean;
  shownWordIds: Set<string>;
  currentWordIds: string[];
  clickedSuggestions: MultiplayerHistoryItem[];
  finalAttemptCount: number;
  cooldownUntil: number | null;
  disconnectForfeitTimer: NodeJS.Timeout | null;
}

interface RoomState {
  players: Set<string>;
  playerStates: Map<string, PlayerState>;
  mode: MatchmakingMode;
  started: boolean;
  finished: boolean;
  secretWord: LocalWord | null;
  secretWordsByUser: Map<string, LocalWord>;
  stakeLockIds: string[];
  winnerUserId: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  finishedPayloads: Map<string, FinishedPayload>;
}

type RankedWord = LocalWord & { score: number; bucket: SimilarityBucket };

interface FinishedPayload {
  winnerUserId: string;
  loserUserId: string | null;
  mode: MatchmakingMode;
  secretWord: string;
  collectionRewardWord: string | null;
  durationSeconds: number;
  players: Array<{
    userId: string;
    isWinner: boolean;
    selectedWordCount: number;
    finalAttemptCount: number;
    bestScore: number;
  }>;
}

const SUGGESTION_COOLDOWN_MS = 5000;
const DISCONNECT_FORFEIT_GRACE_MS = 30000;
const REQUIRED_PLAYER_COUNT = 2;
const BUCKETS: SimilarityBucket[] = ['hot', 'warm', 'cold', 'frozen'];
const BUCKET_FALLBACK_ORDER: Record<SimilarityBucket, SimilarityBucket[]> = {
  hot: ['hot', 'warm', 'cold', 'frozen'],
  warm: ['warm', 'hot', 'cold', 'frozen'],
  cold: ['cold', 'warm', 'frozen', 'hot'],
  frozen: ['frozen', 'cold', 'warm', 'hot'],
};

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly rooms = new Map<string, RoomState>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly statsService: StatsService,
    private readonly wordService: WordService,
    private readonly similarityService: SimilarityService,
    private readonly collectionService: CollectionService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.authenticateClient(client);
    this.logger.log(`socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`socket disconnected: ${client.id}`);
    this.removeClientFromRooms(client);
  }

  @SubscribeMessage('room:join')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload) {
    const userId = this.getAuthenticatedUserId(client);

    if (!userId) {
      client.emit('game:error', { message: 'Socket not authenticated' });
      return;
    }

    const room = this.getRoomState(payload.roomId);
    if (!room.players.has(userId) && room.players.size >= REQUIRED_PLAYER_COUNT) {
      client.emit('game:error', { message: 'Room is already full' });
      return;
    }

    await client.join(payload.roomId);
    room.players.add(userId);
    const playerState = this.getPlayerState(room, userId);
    playerState.socketIds.add(client.id);
    this.clearDisconnectForfeitTimer(playerState);
    client.emit('room:joined', { roomId: payload.roomId, playerId: userId });
    this.emitReadyState(payload.roomId);

    if (room.started) {
      this.emitSessionState(payload.roomId, room, userId);
      return;
    }

    if (room.finished) {
      const finishedPayload = room.finishedPayloads.get(userId);
      if (finishedPayload) {
        client.emit('game:finished', finishedPayload);
      }
    }
  }

  @SubscribeMessage('room:leave')
  async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload) {
    await client.leave(payload.roomId);
    this.removeClientFromRoom(client, payload.roomId);
    client.emit('room:left', { roomId: payload.roomId });
  }

  @SubscribeMessage('game:signal')
  gameSignal(@ConnectedSocket() client: Socket, @MessageBody() payload: GameSignalPayload) {
    if (payload.event === 'player:ready') {
      this.markPlayerReady(client, payload.roomId);
      return;
    }

    if (payload.event === 'suggestions:next') {
      this.generateSuggestionsForClient(client, payload.roomId);
      return;
    }

    if (payload.event === 'suggestion:click') {
      this.clickSuggestion(client, payload);
      return;
    }

    if (payload.event === 'final-answer') {
      void this.submitFinalAnswer(client, payload);
      return;
    }

    if (payload.event === 'player:forfeit') {
      void this.forfeitRoom(client, payload.roomId);
      return;
    }
  }

  private getRoomState(roomId: string) {
    const existingRoom = this.rooms.get(roomId);
    if (existingRoom) {
      return existingRoom;
    }

    const room: RoomState = {
      players: new Set<string>(),
      playerStates: new Map<string, PlayerState>(),
      mode: 'training',
      started: false,
      finished: false,
      secretWord: null,
      secretWordsByUser: new Map<string, LocalWord>(),
      stakeLockIds: [],
      winnerUserId: null,
      startedAt: null,
      finishedAt: null,
      finishedPayloads: new Map<string, FinishedPayload>(),
    };

    this.rooms.set(roomId, room);
    return room;
  }

  private getPlayerState(room: RoomState, userId: string) {
    const existingState = room.playerStates.get(userId);
    if (existingState) {
      return existingState;
    }

    const playerState: PlayerState = {
      socketIds: new Set<string>(),
      ready: false,
      shownWordIds: new Set<string>(),
      currentWordIds: [],
      clickedSuggestions: [],
      finalAttemptCount: 0,
      cooldownUntil: null,
      disconnectForfeitTimer: null,
    };
    room.playerStates.set(userId, playerState);
    return playerState;
  }

  private markPlayerReady(client: Socket, roomId: string) {
    const userId = this.getAuthenticatedUserId(client);
    if (!userId) {
      client.emit('game:error', { message: 'Socket not authenticated' });
      return;
    }

    const room = this.getRoomState(roomId);
    room.players.add(userId);
    const playerState = this.getPlayerState(room, userId);
    playerState.socketIds.add(client.id);
    playerState.ready = true;

    this.emitReadyState(roomId);

    if (this.canStartRoom(room)) {
      this.startRoom(roomId, room);
    }
  }

  private canStartRoom(room: RoomState) {
    if (room.started || room.finished || room.players.size < REQUIRED_PLAYER_COUNT) {
      return false;
    }

    return Array.from(room.players).every((userId) => this.getPlayerState(room, userId).ready);
  }

  private startRoom(roomId: string, room: RoomState) {
    room.started = true;
    room.finished = false;
    room.winnerUserId = null;
    this.configureRoomMode(roomId, room);
    room.startedAt = Date.now();
    room.finishedAt = null;
    room.finishedPayloads.clear();

    for (const userId of room.players) {
      const playerState = this.getPlayerState(room, userId);
      playerState.shownWordIds.clear();
      playerState.currentWordIds = [];
      playerState.clickedSuggestions = [];
      playerState.finalAttemptCount = 0;
      playerState.cooldownUntil = null;
      this.clearDisconnectForfeitTimer(playerState);
    }

    this.server.to(roomId).emit('game:started', { roomId });
    for (const userId of room.players) {
      this.generateSuggestions(roomId, room, userId);
      this.emitOpponentState(roomId, room, userId);
    }
    this.emitReadyState(roomId);
  }

  private configureRoomMode(roomId: string, room: RoomState) {
    const roomConfig = this.matchmakingService.getRoomConfig(roomId);
    room.mode = roomConfig?.mode ?? 'training';
    room.secretWordsByUser.clear();
    room.stakeLockIds = [];

    if (room.mode === 'duel' && roomConfig?.stakes?.length === REQUIRED_PLAYER_COUNT) {
      for (const userId of room.players) {
        const opponentStake = roomConfig.stakes.find((stake) => stake.userId !== userId);
        if (!opponentStake) {
          throw new Error('Duel room is missing opponent stake');
        }

        const secretWord = this.wordService.getWord(opponentStake.wordId);
        if (!secretWord) {
          throw new Error(`Duel stake word "${opponentStake.wordId}" is not known`);
        }

        room.secretWordsByUser.set(userId, secretWord);
      }

      room.secretWord = null;
      room.stakeLockIds = roomConfig.stakes.map((stake) => stake.stakeLockId);
      return;
    }

    const secretWord = this.wordService.getRandomSecretWord();
    room.secretWord = secretWord;
    for (const userId of room.players) {
      room.secretWordsByUser.set(userId, secretWord);
    }
  }

  private generateSuggestionsForClient(client: Socket, roomId: string) {
    const userId = this.getAuthenticatedUserId(client);
    const room = this.rooms.get(roomId);

    if (!userId || !room) {
      client.emit('game:error', { message: 'Room not found' });
      return;
    }

    this.generateSuggestions(roomId, room, userId);
  }

  private generateSuggestions(roomId: string, room: RoomState, userId: string) {
    const secretWord = this.getPlayerSecretWord(room, userId);
    const playerState = room.playerStates.get(userId);

    if (!secretWord || !playerState || !room.started || room.finished) {
      return;
    }

    if (playerState.cooldownUntil && playerState.cooldownUntil > Date.now()) {
      this.emitToPlayer(room, userId, 'game:error', {
        message: 'Suggestions are still cooling down',
        remainingMs: playerState.cooldownUntil - Date.now(),
      });
      return;
    }

    const excludedWordIds = new Set<string>([secretWord.id, ...playerState.shownWordIds]);
    const rankedWords = this.shuffle(this.similarityService.rankKnownWordsBySimilarity(secretWord.id, excludedWordIds));
    const selected = new Map<string, RankedWord>();

    for (const bucket of BUCKETS) {
      const word = this.pickFromBucket(bucket, rankedWords, selected);
      if (word) {
        selected.set(word.id, word);
      }
    }

    for (const word of rankedWords) {
      if (selected.size >= 4) {
        break;
      }

      if (!selected.has(word.id)) {
        selected.set(word.id, word);
      }
    }

    const suggestions = this.shuffle(Array.from(selected.values()).slice(0, 4));
    playerState.currentWordIds = suggestions.map((word) => word.id);
    suggestions.forEach((word) => playerState.shownWordIds.add(word.id));
    playerState.cooldownUntil = null;

    this.emitToPlayer(room, userId, 'game:suggestions', {
      roomId,
      suggestions: suggestions.map((word) => ({ wordId: word.id, word: word.text })),
    });
  }

  private clickSuggestion(client: Socket, payload: GameSignalPayload) {
    const userId = this.getAuthenticatedUserId(client);
    const room = this.rooms.get(payload.roomId);
    const wordId = payload.data?.wordId;

    const secretWord = userId && room ? this.getPlayerSecretWord(room, userId) : undefined;

    if (!userId || !room || !wordId || !secretWord || !room.started || room.finished) {
      return;
    }

    const playerState = room.playerStates.get(userId);
    if (!playerState || !playerState.currentWordIds.includes(wordId)) {
      client.emit('game:error', { message: 'This suggestion is not available anymore' });
      return;
    }

    const word = this.wordService.getWord(wordId);
    if (!word) {
      client.emit('game:error', { message: 'Unknown suggestion' });
      return;
    }

    const score = this.similarityService.calculateKnownSimilarity(secretWord.id, word.id);
    const bucket = this.similarityService.getBucket(score);
    const historyItem: MultiplayerHistoryItem = {
      wordId: word.id,
      word: word.text,
      score,
      bucket,
      createdAt: new Date().toISOString(),
    };

    playerState.clickedSuggestions.push(historyItem);
    playerState.currentWordIds = [];
    playerState.cooldownUntil = Date.now() + SUGGESTION_COOLDOWN_MS;

    client.emit('game:suggestion-result', {
      ...historyItem,
      cooldownMs: SUGGESTION_COOLDOWN_MS,
    });
    this.emitOpponentStates(payload.roomId, room);
  }

  private async submitFinalAnswer(client: Socket, payload: GameSignalPayload) {
    const userId = this.getAuthenticatedUserId(client);
    const room = this.rooms.get(payload.roomId);
    const answer = payload.data?.answer;

    const secretWord = userId && room ? this.getPlayerSecretWord(room, userId) : undefined;

    if (!userId || !room || !secretWord || !room.started || room.finished || typeof answer !== 'string') {
      return;
    }

    const playerState = room.playerStates.get(userId);
    if (!playerState) {
      return;
    }

    playerState.finalAttemptCount += 1;
    const normalizedAnswer = this.wordService.normalize(answer);
    const success = normalizedAnswer === secretWord.normalizedText;

    if (!success) {
      client.emit('game:final-answer-result', { success: false });
      this.emitOpponentStates(payload.roomId, room);
      return;
    }

    client.emit('game:final-answer-result', { success: true });
    await this.finishRoom(payload.roomId, room, userId);
  }

  private pickFromBucket(
    targetBucket: SimilarityBucket,
    rankedWords: RankedWord[],
    selected: Map<string, unknown>,
  ) {
    for (const bucket of BUCKET_FALLBACK_ORDER[targetBucket]) {
      const candidate = rankedWords.find((word) => word.bucket === bucket && !selected.has(word.id));
      if (candidate) {
        return candidate;
      }
    }

    return undefined;
  }

  private emitReadyState(roomId: string) {
    const room = this.getRoomState(roomId);
    this.server.to(roomId).emit('game:ready-state', {
      players: room.players.size,
      ready: Array.from(room.players).filter((userId) => this.getPlayerState(room, userId).ready).length,
      started: room.started,
    });
  }

  private emitCurrentSuggestionsToPlayer(room: RoomState, userId: string) {
    const playerState = room.playerStates.get(userId);
    if (!playerState) {
      return;
    }

    this.emitToPlayer(room, userId, 'game:suggestions', {
      suggestions: playerState.currentWordIds
        .map((wordId) => this.wordService.getWord(wordId))
        .filter((word): word is LocalWord => Boolean(word))
        .map((word) => ({ wordId: word.id, word: word.text })),
    });
  }

  private emitSessionState(roomId: string, room: RoomState, userId: string) {
    const playerState = room.playerStates.get(userId);
    if (!playerState) {
      return;
    }

    const currentSuggestions = playerState.currentWordIds
      .map((wordId) => this.wordService.getWord(wordId))
      .filter((word): word is LocalWord => Boolean(word))
      .map((word) => ({ wordId: word.id, word: word.text }));

    this.emitToPlayer(room, userId, 'game:session-state', {
      roomId,
      started: room.started,
      finished: room.finished,
      suggestions: currentSuggestions,
      history: playerState.clickedSuggestions,
      cooldownMs: playerState.cooldownUntil ? Math.max(0, playerState.cooldownUntil - Date.now()) : 0,
      opponentState: this.buildOpponentState(roomId, room, userId),
    });
  }

  private emitOpponentStates(roomId: string, room: RoomState) {
    for (const userId of room.players) {
      this.emitOpponentState(roomId, room, userId);
    }
  }

  private emitOpponentState(roomId: string, room: RoomState, receiverUserId: string) {
    this.emitToPlayer(room, receiverUserId, 'game:opponent-state', this.buildOpponentState(roomId, room, receiverUserId));
  }

  private buildOpponentState(roomId: string, room: RoomState, receiverUserId: string) {
    const opponentId = Array.from(room.players).find((userId) => userId !== receiverUserId);
    if (!opponentId) {
      return {
        roomId,
        topSuggestions: [],
        finalAttemptCount: 0,
      };
    }

    const opponentState = this.getPlayerState(room, opponentId);
    return {
      roomId,
      opponentUserId: opponentId,
      topSuggestions: opponentState.clickedSuggestions
        .slice()
        .sort((left, right) => right.score - left.score)
        .slice(0, 5)
        .map((item, index) => ({
          rank: index + 1,
          score: item.score,
          bucket: item.bucket,
          createdAt: item.createdAt,
        })),
      finalAttemptCount: opponentState.finalAttemptCount,
    };
  }

  private async forfeitRoom(client: Socket, roomId: string) {
    const userId = this.getAuthenticatedUserId(client);
    const room = this.rooms.get(roomId);

    if (!userId || !room || room.finished) {
      return;
    }

    const winnerUserId = Array.from(room.players).find((playerId) => playerId !== userId);
    if (!winnerUserId || !this.getPlayerSecretWord(room, winnerUserId)) {
      this.removeClientFromRoom(client, roomId);
      return;
    }

    await this.finishRoom(roomId, room, winnerUserId);
  }

  private async finishRoom(roomId: string, room: RoomState, winnerUserId: string) {
    const winnerSecretWord = this.getPlayerSecretWord(room, winnerUserId);
    if (room.finished || !winnerSecretWord) {
      return;
    }

    room.finished = true;
    room.started = false;
    room.winnerUserId = winnerUserId;
    room.finishedAt = Date.now();
    const loserUserId = Array.from(room.players).find((userId) => userId !== winnerUserId) ?? null;

    for (const userId of room.players) {
      this.clearDisconnectForfeitTimer(this.getPlayerState(room, userId));
    }

    if (room.mode === 'daily') {
      try {
        await this.collectionService.awardWord(winnerUserId, winnerSecretWord.id);
      } catch (error) {
        this.logger.warn(`failed to award daily word "${winnerSecretWord.id}" to winner: ${(error as Error).message}`);
      }
    }

    if (room.mode === 'duel') {
      try {
        await this.collectionService.settleDuelStakes(winnerUserId, room.stakeLockIds);
      } catch (error) {
        this.logger.warn(`failed to settle duel stakes: ${(error as Error).message}`);
      }
    }

    for (const userId of room.players) {
      const finishedPayload = this.buildFinishedPayload(room, userId, winnerUserId, loserUserId);
      room.finishedPayloads.set(userId, finishedPayload);
      this.emitToPlayer(room, userId, 'game:finished', finishedPayload);
    }

    if (loserUserId) {
      try {
        await this.statsService.recordOneVsOneResult(winnerUserId, loserUserId);
      } catch (error) {
        this.logger.warn(`failed to record 1v1 result: ${(error as Error).message}`);
      }
    }
  }

  private buildFinishedPayload(
    room: RoomState,
    receiverUserId: string,
    winnerUserId: string,
    loserUserId: string | null,
  ): FinishedPayload {
    const receiverSecretWord = this.getPlayerSecretWord(room, receiverUserId);
    const isRewardedWinner = receiverUserId === winnerUserId && (room.mode === 'daily' || room.mode === 'duel');
    return {
      winnerUserId,
      loserUserId,
      mode: room.mode,
      secretWord: receiverSecretWord?.text ?? '',
      collectionRewardWord: isRewardedWinner ? receiverSecretWord?.text ?? null : null,
      durationSeconds: room.startedAt && room.finishedAt
        ? Math.max(1, Math.round((room.finishedAt - room.startedAt) / 1000))
        : 0,
      players: Array.from(room.players).map((userId) => {
        const playerState = this.getPlayerState(room, userId);
        return {
          userId,
          isWinner: userId === winnerUserId,
          selectedWordCount: playerState.clickedSuggestions.length,
          finalAttemptCount: playerState.finalAttemptCount,
          bestScore: playerState.clickedSuggestions.reduce(
            (bestScore, item) => Math.max(bestScore, item.score),
            0,
          ),
        };
      }),
    };
  }

  private getPlayerSecretWord(room: RoomState, userId: string) {
    return room.secretWordsByUser.get(userId) ?? room.secretWord ?? undefined;
  }

  private emitToPlayer(room: RoomState, userId: string, event: string, payload: unknown) {
    const playerState = room.playerStates.get(userId);
    if (!playerState || playerState.socketIds.size === 0) {
      return;
    }

    this.server.to(Array.from(playerState.socketIds)).emit(event, payload);
  }

  private authenticateClient(client: Socket) {
    const token = client.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) {
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'change-me-in-production',
      });
      client.data.userId = payload.sub;
    } catch (error) {
      this.logger.warn(`socket authentication failed: ${(error as Error).message}`);
    }
  }

  private getAuthenticatedUserId(client: Socket) {
    return typeof client.data.userId === 'string' ? client.data.userId : undefined;
  }

  private removeClientFromRooms(client: Socket) {
    for (const roomId of client.rooms) {
      if (roomId !== client.id) {
        this.removeClientFromRoom(client, roomId);
      }
    }
  }

  private removeClientFromRoom(client: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    const userId = this.getAuthenticatedUserId(client);

    if (!room || !userId) {
      return;
    }

    const playerState = room.playerStates.get(userId);
    playerState?.socketIds.delete(client.id);

    if (room.started && !room.finished && playerState && playerState.socketIds.size === 0) {
      this.scheduleDisconnectForfeit(roomId, userId, playerState);
    }

    if (!room.started && playerState && playerState.socketIds.size === 0) {
      room.players.delete(userId);
      room.playerStates.delete(userId);
    }

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      return;
    }

    this.emitReadyState(roomId);
  }

  private scheduleDisconnectForfeit(roomId: string, userId: string, playerState: PlayerState) {
    this.clearDisconnectForfeitTimer(playerState);
    playerState.disconnectForfeitTimer = setTimeout(() => {
      const room = this.rooms.get(roomId);
      const disconnectedPlayerState = room?.playerStates.get(userId);
      if (
        !room ||
        !disconnectedPlayerState ||
        !room.started ||
        room.finished ||
        disconnectedPlayerState.socketIds.size > 0
      ) {
        return;
      }

      const winnerUserId = Array.from(room.players).find((playerId) => playerId !== userId);
      if (winnerUserId) {
        void this.finishRoom(roomId, room, winnerUserId);
      }
    }, DISCONNECT_FORFEIT_GRACE_MS);
  }

  private clearDisconnectForfeitTimer(playerState: PlayerState) {
    if (!playerState.disconnectForfeitTimer) {
      return;
    }

    clearTimeout(playerState.disconnectForfeitTimer);
    playerState.disconnectForfeitTimer = null;
  }

  private shuffle<T>(items: T[]): T[] {
    const shuffledItems = [...items];

    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledItems[index], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[index]];
    }

    return shuffledItems;
  }
}
