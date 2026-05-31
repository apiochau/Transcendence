import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GameStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { SimilarityService } from './similarity.service';
import { SuggestionService } from './suggestion.service';
import { SuggestionHistoryItem } from './types/suggestion.types';
import { WordService } from './word.service';

@Injectable()
export class GameService {
  private readonly soloPlayerId = 'solo-player';

  constructor(
    private readonly prisma: PrismaService,
    private readonly wordService: WordService,
    private readonly similarityService: SimilarityService,
    private readonly suggestionService: SuggestionService,
  ) {}

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

  async startSoloSession() {
    const secretWord = this.wordService.getRandomSecretWord();
    const session = await this.prisma.gameSession.create({
      data: {
        secretWordId: secretWord.id,
        playerId: this.soloPlayerId,
        status: GameStatus.ACTIVE,
      },
    });

    return {
      sessionId: session.id,
      status: session.status,
    };
  }

  getSoloSuggestions(sessionId: string) {
    return this.suggestionService.generateSuggestions(sessionId);
  }

  async clickSuggestion(sessionId: string, wordId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game session is already finished');
    }

    if (!session.currentWordIds.includes(wordId)) {
      throw new BadRequestException('This word is not part of the current suggestions');
    }

    const word = this.wordService.getWord(wordId);
    if (!word) {
      throw new NotFoundException('Suggested word not found');
    }

    const score = this.similarityService.calculateKnownSimilarity(session.secretWordId, word.id);
    const bucket = this.similarityService.getBucket(score);

    await this.prisma.suggestionHistory.upsert({
      where: {
        sessionId_wordId: {
          sessionId: session.id,
          wordId: word.id,
        },
      },
      update: {
        score,
        bucket,
      },
      create: {
        sessionId: session.id,
        playerId: session.playerId,
        wordId: word.id,
        score,
        bucket,
      },
    });

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        currentWordIds: [],
        nextSuggestionsAt: new Date(Date.now() + 5000),
      },
    });

    return {
      word: word.text,
      score,
      bucket,
    };
  }

  async submitFinalAnswer(sessionId: string, answer: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { secretWord: true },
    });

    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status !== GameStatus.ACTIVE) {
      return { success: false };
    }

    const normalizedAnswer = this.wordService.normalize(answer);
    const success = normalizedAnswer === session.secretWord.normalizedText;

    if (success) {
      await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          status: GameStatus.FINISHED,
          finishedAt: new Date(),
        },
      });
    }

    return { success };
  }

  async giveUpSoloSession(sessionId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { secretWord: true },
    });

    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status === GameStatus.ACTIVE) {
      await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          status: GameStatus.FINISHED,
          currentWordIds: [],
          nextSuggestionsAt: null,
          finishedAt: new Date(),
        },
      });
    }

    return {
      success: false,
      secretWord: session.secretWord.text,
    };
  }

  async getSoloHistory(sessionId: string): Promise<SuggestionHistoryItem[]> {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    const history = await this.prisma.suggestionHistory.findMany({
      where: { sessionId },
      include: { word: true },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
    });

    return history.map((item) => ({
      wordId: item.wordId,
      word: item.word.text,
      score: item.score,
      bucket: item.bucket as SuggestionHistoryItem['bucket'],
      createdAt: item.createdAt.toISOString(),
    }));
  }
}
