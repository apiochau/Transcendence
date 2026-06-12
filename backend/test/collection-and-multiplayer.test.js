const assert = require('node:assert/strict');
const test = require('node:test');
const { CollectionService } = require('../dist/collection/collection.service');
const { CategoryFallbackService } = require('../dist/game/category-fallback.service');
const { EmbeddingService } = require('../dist/game/embedding.service');
const { SimilarityService } = require('../dist/game/similarity.service');
const { WordNormalizerService } = require('../dist/game/word-normalizer.service');
const { WordService } = require('../dist/game/word.service');
const { MatchmakingService } = require('../dist/matchmaking/matchmaking.service');
const { StatsService } = require('../dist/stats/stats.service');
const { RealtimeGateway } = require('../dist/websocket/websocket.gateway');

class MockSocket {
  constructor(id, userId) {
    this.id = id;
    this.data = { userId };
    this.rooms = new Set([id]);
    this.events = [];
  }

  async join(roomId) {
    this.rooms.add(roomId);
  }

  async leave(roomId) {
    this.rooms.delete(roomId);
  }

  emit(event, payload) {
    this.events.push({ event, payload });
  }
}

class MockServer {
  constructor() {
    this.socketsById = new Map();
  }

  add(socket) {
    this.socketsById.set(socket.id, socket);
  }

  to(target) {
    return {
      emit: (event, payload) => {
        const targets = Array.isArray(target) ? target : [target];
        for (const currentTarget of targets) {
          const socket = this.socketsById.get(currentTarget);
          if (socket) {
            socket.emit(event, payload);
            continue;
          }

          for (const roomSocket of this.socketsById.values()) {
            if (roomSocket.rooms.has(currentTarget)) {
              roomSocket.emit(event, payload);
            }
          }
        }
      },
    };
  }
}

function createWordService() {
  const normalizer = new WordNormalizerService();
  const embeddingService = new EmbeddingService(normalizer);
  const categoryFallbackService = new CategoryFallbackService(normalizer);
  const prisma = {
    word: {
      upsert: async () => ({}),
    },
  };
  const wordService = new WordService(prisma, normalizer, embeddingService, categoryFallbackService);
  return { wordService, similarityService: new SimilarityService(wordService) };
}

function createGateway(roomConfig) {
  const { wordService, similarityService } = createWordService();
  const secretWord = wordService.getWord('telephone');
  wordService.getRandomSecretWord = () => secretWord;
  const collectionAwards = [];
  const duelSettlements = [];
  const statsResults = [];
  const gateway = new RealtimeGateway(
    { verify: () => ({ sub: 'unused' }) },
    { get: () => 'test-secret' },
    { recordOneVsOneResult: async (winnerId, loserId) => statsResults.push({ winnerId, loserId }) },
    wordService,
    similarityService,
    {
      awardWord: async (userId, wordId) => collectionAwards.push({ userId, wordId }),
      settleDuelStakes: async (winnerId, stakeLockIds) => duelSettlements.push({ winnerId, stakeLockIds }),
    },
    { getRoomConfig: () => roomConfig },
  );
  const server = new MockServer();
  gateway.server = server;
  return { gateway, server, collectionAwards, duelSettlements, statsResults };
}

function lastEvent(socket, eventName) {
  return socket.events.filter((event) => event.event === eventName).at(-1);
}

async function startTwoPlayerGame(roomConfig) {
  const setup = createGateway(roomConfig);
  const playerOne = new MockSocket('socket-1', 'player-1');
  const playerTwo = new MockSocket('socket-2', 'player-2');
  setup.server.add(playerOne);
  setup.server.add(playerTwo);

  await setup.gateway.joinRoom(playerOne, { roomId: 'room-a' });
  await setup.gateway.joinRoom(playerTwo, { roomId: 'room-a' });
  setup.gateway.gameSignal(playerOne, { roomId: 'room-a', event: 'player:ready' });
  setup.gateway.gameSignal(playerTwo, { roomId: 'room-a', event: 'player:ready' });

  return { ...setup, playerOne, playerTwo };
}

test('online game starts two players and sends controlled suggestions', async () => {
  const { playerOne, playerTwo } = await startTwoPlayerGame();

  assert.ok(lastEvent(playerOne, 'game:started'));
  assert.ok(lastEvent(playerTwo, 'game:started'));
  assert.equal(lastEvent(playerOne, 'game:suggestions').payload.suggestions.length, 4);
  assert.equal(lastEvent(playerTwo, 'game:suggestions').payload.suggestions.length, 4);
});

test('training win records stats without collection reward', async () => {
  const { gateway, playerOne, playerTwo, collectionAwards, statsResults } = await startTwoPlayerGame();

  gateway.gameSignal(playerOne, { roomId: 'room-a', event: 'final-answer', data: { answer: 'telephone' } });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(collectionAwards, []);
  assert.deepEqual(statsResults, [{ winnerId: 'player-1', loserId: 'player-2' }]);
  assert.equal(lastEvent(playerOne, 'game:finished').payload.winnerUserId, 'player-1');
  assert.equal(lastEvent(playerTwo, 'game:finished').payload.winnerUserId, 'player-1');
  assert.equal(lastEvent(playerOne, 'game:finished').payload.mode, 'training');
  assert.equal(lastEvent(playerOne, 'game:finished').payload.collectionRewardWord, null);
});

test('daily win awards secret word and records stats', async () => {
  const { gateway, playerOne, collectionAwards, statsResults } = await startTwoPlayerGame({
    roomId: 'room-a',
    mode: 'daily',
    players: ['player-1', 'player-2'],
  });

  gateway.gameSignal(playerOne, { roomId: 'room-a', event: 'final-answer', data: { answer: 'telephone' } });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(collectionAwards, [{ userId: 'player-1', wordId: 'telephone' }]);
  assert.deepEqual(statsResults, [{ winnerId: 'player-1', loserId: 'player-2' }]);
  assert.equal(lastEvent(playerOne, 'game:finished').payload.mode, 'daily');
  assert.equal(lastEvent(playerOne, 'game:finished').payload.collectionRewardWord, 'telephone');
});

test('rejoining during online game restores session state', async () => {
  const { gateway, server, playerOne } = await startTwoPlayerGame();
  const firstSuggestion = lastEvent(playerOne, 'game:suggestions').payload.suggestions[0];

  gateway.gameSignal(playerOne, {
    roomId: 'room-a',
    event: 'suggestion:click',
    data: { wordId: firstSuggestion.wordId },
  });

  const resumedSocket = new MockSocket('socket-1b', 'player-1');
  server.add(resumedSocket);
  await gateway.joinRoom(resumedSocket, { roomId: 'room-a' });

  const sessionState = lastEvent(resumedSocket, 'game:session-state').payload;
  assert.equal(sessionState.history.length, 1);
  assert.equal(sessionState.history[0].wordId, firstSuggestion.wordId);
  assert.ok(sessionState.cooldownMs > 0);
});

test('training forfeit gives victory without collection reward', async () => {
  const { gateway, playerOne, playerTwo, collectionAwards, statsResults } = await startTwoPlayerGame();

  gateway.gameSignal(playerTwo, { roomId: 'room-a', event: 'player:forfeit' });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(collectionAwards, []);
  assert.deepEqual(statsResults, [{ winnerId: 'player-1', loserId: 'player-2' }]);
  assert.equal(lastEvent(playerTwo, 'game:finished').payload.loserUserId, 'player-2');
});

test('duel uses opponent staked words as player secrets and settles stakes', async () => {
  const roomConfig = {
    roomId: 'room-a',
    mode: 'duel',
    players: ['player-1', 'player-2'],
    stakes: [
      { userId: 'player-1', stakeLockId: 'stake-1', wordId: 'chien', word: 'chien', rarity: 'common' },
      { userId: 'player-2', stakeLockId: 'stake-2', wordId: 'chat', word: 'chat', rarity: 'common' },
    ],
  };
  const { gateway, playerOne, playerTwo, duelSettlements } = await startTwoPlayerGame(roomConfig);

  gateway.gameSignal(playerOne, { roomId: 'room-a', event: 'final-answer', data: { answer: 'chat' } });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(duelSettlements, [{ winnerId: 'player-1', stakeLockIds: ['stake-1', 'stake-2'] }]);
  assert.equal(lastEvent(playerOne, 'game:finished').payload.secretWord, 'chat');
  assert.equal(lastEvent(playerTwo, 'game:finished').payload.secretWord, 'chien');
  assert.equal(lastEvent(playerOne, 'game:finished').payload.mode, 'duel');
  assert.equal(lastEvent(playerOne, 'game:finished').payload.collectionRewardWord, 'chat');
  assert.equal(lastEvent(playerTwo, 'game:finished').payload.collectionRewardWord, null);
});

test('collection service sorts by rarity then value and totals quantities', async () => {
  const collectionService = new CollectionService({
    wordCollectionItem: {
      findMany: async () => [
        {
          id: '1',
          userId: 'user-1',
          wordId: 'eau',
          quantity: 2,
          firstWonAt: new Date('2026-01-01T00:00:00Z'),
          lastWonAt: new Date('2026-01-02T00:00:00Z'),
          word: { text: 'eau', normalizedText: 'eau', rarityLabel: 'common', rarity: 10, value: 50, category: 'eau' },
        },
        {
          id: '2',
          userId: 'user-1',
          wordId: 'algorithme',
          quantity: 1,
          firstWonAt: new Date('2026-01-01T00:00:00Z'),
          lastWonAt: new Date('2026-01-01T00:00:00Z'),
          word: { text: 'algorithme', normalizedText: 'algorithme', rarityLabel: 'epic', rarity: 80, value: 1800, category: 'informatique' },
        },
      ],
    },
  });

  const collection = await collectionService.getCollection('user-1');

  assert.equal(collection.totalValue, 1900);
  assert.equal(collection.uniqueCount, 2);
  assert.equal(collection.totalCount, 3);
  assert.equal(collection.items[0].wordId, 'algorithme');
});

test('startup reconciliation refunds open duel stakes', async () => {
  const refundedCollectionItems = [];
  const updatedStakeLocks = [];
  const stakeLocks = [
    { id: 'queued-stake', userId: 'user-1', wordId: 'chat', status: 'QUEUED' },
    { id: 'matched-stake', userId: 'user-2', wordId: 'chien', status: 'MATCHED' },
  ];
  const collectionService = new CollectionService({
    wordStakeLock: {
      findMany: async () => stakeLocks.map(({ id }) => ({ id })),
      findUnique: async ({ where }) => stakeLocks.find((stakeLock) => stakeLock.id === where.id),
      update: async ({ where, data }) => updatedStakeLocks.push({ id: where.id, status: data.status }),
    },
    wordCollectionItem: {
      upsert: async ({ where }) => refundedCollectionItems.push(where.userId_wordId),
    },
    $transaction: async (operations) => Promise.all(operations),
  });

  await collectionService.onModuleInit();

  assert.deepEqual(refundedCollectionItems, [
    { userId: 'user-1', wordId: 'chat' },
    { userId: 'user-2', wordId: 'chien' },
  ]);
  assert.deepEqual(updatedStakeLocks, [
    { id: 'queued-stake', status: 'REFUNDED' },
    { id: 'matched-stake', status: 'REFUNDED' },
  ]);
});

test('leaderboard ranks players by collection value instead of rating', async () => {
  const statsService = new StatsService({
    user: {
      findMany: async () => [
        {
          id: 'player-low-rating',
          username: 'rich',
          displayName: null,
          avatarUrl: null,
          stats: { wins: 1, gamesPlayed: 1 },
          wordCollection: [{ quantity: 1, word: { value: 5000 } }],
        },
        {
          id: 'player-high-rating',
          username: 'poor',
          displayName: null,
          avatarUrl: null,
          stats: { wins: 99, gamesPlayed: 99 },
          wordCollection: [{ quantity: 1, word: { value: 50 } }],
        },
        {
          id: 'player-empty',
          username: 'empty',
          displayName: null,
          avatarUrl: null,
          stats: null,
          wordCollection: [],
        },
      ],
    },
  });

  const leaderboard = await statsService.leaderboard();

  assert.equal(leaderboard[0].id, 'player-low-rating');
  assert.equal(leaderboard[0].collectionValue, 5000);
  assert.equal(leaderboard[1].collectionValue, 50);
  assert.equal(leaderboard[2].id, 'player-empty');
  assert.equal(leaderboard[2].collectionValue, 0);
});

test('daily matchmaking is consumed once a match is created', async () => {
  const dailyAttempts = new Set();
  const prisma = {
    dailyMatchAttempt: {
      findUnique: async ({ where }) => {
        const key = `${where.userId_dayKey.userId}:${where.userId_dayKey.dayKey}`;
        return dailyAttempts.has(key) ? { id: key, createdAt: new Date(), dayKey: where.userId_dayKey.dayKey } : null;
      },
      create: async ({ data }) => {
        const key = `${data.userId}:${data.dayKey}`;
        if (dailyAttempts.has(key)) {
          throw new Error('duplicate daily');
        }
        dailyAttempts.add(key);
        return { id: key, ...data };
      },
    },
    game: {
      create: async ({ data }) => ({ id: data.roomId, ...data }),
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  const service = new MatchmakingService(prisma, { refundStake: async () => {} });

  const first = await service.join('daily-1', 'daily');
  const second = await service.join('daily-2', 'daily');

  assert.equal(first.status, 'queued');
  assert.equal(second.status, 'matched');
  assert.equal((await service.dailyStatus('daily-1')).available, false);
  service.consumeMatch('daily-1');
  await assert.rejects(() => service.join('daily-1', 'daily'), /Daily mode is already used today/);
});

test('daily matchmaking stays locked even when user already has a queued entry', async () => {
  const usedDailyUsers = new Set(['daily-locked']);
  const prisma = {
    dailyMatchAttempt: {
      findUnique: async ({ where }) => {
        const { userId, dayKey } = where.userId_dayKey;
        return usedDailyUsers.has(userId) ? { id: `${userId}:${dayKey}`, createdAt: new Date(), dayKey } : null;
      },
    },
  };
  const service = new MatchmakingService(prisma, { refundStake: async () => {} });

  const queuedTraining = await service.join('daily-locked', 'training');

  assert.equal(queuedTraining.status, 'queued');
  await assert.rejects(() => service.join('daily-locked', 'daily'), /Daily mode is already used today/);
});

test('duel matchmaking pairs only same rarity and refunds queued stake on leave', async () => {
  const refundedStakeIds = [];
  const stakeByItemId = {
    commonA: { id: 'stake-a', wordId: 'chien', rarity: 'common', word: { text: 'chien' } },
    commonB: { id: 'stake-b', wordId: 'chat', rarity: 'common', word: { text: 'chat' } },
    rareA: { id: 'stake-c', wordId: 'telephone', rarity: 'rare', word: { text: 'telephone' } },
  };
  const service = new MatchmakingService(
    {
      dailyMatchAttempt: {},
      game: {
        create: async ({ data }) => ({ id: data.roomId, ...data }),
      },
      $transaction: async (operations) => Promise.all(operations),
    },
    {
      createStakeLock: async (_userId, itemId) => stakeByItemId[itemId],
      assignStakeToRoom: async (stakeLockId, roomId) => ({ id: stakeLockId, roomId }),
      refundStake: async (stakeLockId) => refundedStakeIds.push(stakeLockId),
    },
  );

  const commonQueue = await service.join('duel-1', 'duel', 'commonA');
  const rareQueue = await service.join('duel-2', 'duel', 'rareA');
  const commonMatch = await service.join('duel-3', 'duel', 'commonB');

  assert.equal(commonQueue.status, 'queued');
  assert.equal(rareQueue.status, 'queued');
  assert.equal(commonMatch.status, 'matched');
  assert.equal(commonMatch.match.stakes.length, 2);
  assert.deepEqual(commonMatch.match.stakes.map((stake) => stake.rarity), ['common', 'common']);

  await service.leave('duel-2');
  assert.deepEqual(refundedStakeIds, ['stake-c']);
});
