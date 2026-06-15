import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

import { pipeline } from '@xenova/transformers';

enum SentimentType {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

@Injectable()
export class FeedbackService 
{
  private sentimentPipeline: any = null;

  constructor(private readonly prisma: PrismaService,) {}

  private async getSentimentPipeline() {
    if (!this.sentimentPipeline) {
      this.sentimentPipeline = await pipeline(
        'text-classification',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      );
    }

    return this.sentimentPipeline;
  }

  private async analyzeSentiment(
    content: string,
  ): Promise<{
    sentiment: SentimentType;
    score: number;
  }> {
    const normalized = content.trim().toLowerCase();

    const positiveOverride = new Set([
      "fine",
      "not bad",
      "good",
      "great",
    ]);

    const negativeOverride = new Set([
      "could be better",
      "not good",
      "bad",
      "terrible",
      "can be improved",
    ]);

    const neutralOverride = new Set([
      "",
      "-",
      ".",
      "...",
      "n/a",
      "na",
      "none",
      "nothing",
      "no comment",
      "no comments",
      "no feedback",
      "no idea",
      "idk",
      "i don't know",
      "it's okay",
      "its okay",
      "its ok",
      "it's ok",
      "ok",
    ]);

    if (neutralOverride.has(normalized)) {
      return { sentiment: SentimentType.NEUTRAL, score: 1 };
    }

    if (positiveOverride.has(normalized)) {
      return { sentiment: SentimentType.POSITIVE, score: 0.9 };
    }

    if (negativeOverride.has(normalized)) {
      return { sentiment: SentimentType.NEGATIVE, score: 0.9 };
    }

    //  AI fallback
    const classifier = await this.getSentimentPipeline();
    const result = await classifier(content);

    const prediction = result[0];
    const label = String(prediction.label).toUpperCase();
    const score = Number(prediction.score);


    // Low confidence = neutral
    if (score < 0.65) {
      return {
        sentiment: SentimentType.NEUTRAL,
        score,
      };
    }

    let sentiment: SentimentType;

    switch (label) {
      case "POSITIVE":
      case "LABEL_2":
        sentiment = SentimentType.POSITIVE;
        break;

      case "NEGATIVE":
      case "LABEL_0":
        sentiment = SentimentType.NEGATIVE;
        break;

      default:
        sentiment = SentimentType.NEUTRAL;
        break;
    }

    return {
      sentiment,
      score,
    };
  }

  async create( userId: string, dto: CreateFeedbackDto,) 
  {
    const session =
      await this.prisma.gameSession.findUnique({
        where: {
          id: dto.sessionId,
        },
      });

    if (!session) {
      throw new NotFoundException(
        'Session not found',
      );
    }

    if (session.status !== 'FINISHED') {
      throw new BadRequestException(
        'Feedback can only be submitted after the game is finished',
      );
    }

    const existingFeedback =
      await (this.prisma as any).feedback.findUnique({
        where: {
          userId_sessionId: {
            userId,
            sessionId: dto.sessionId,
          },
        },
      });

    if (existingFeedback) {
      throw new ConflictException(
        'Feedback already submitted',
      );
    }

    let sentiment: SentimentType | null =
      null;

    let score: number | null = null;

    try {
      const analysis =
        await this.analyzeSentiment(
          dto.content,
        );

      sentiment =
        analysis.sentiment;

      score =
        analysis.score;

      // console.log(
      //   '[SENTIMENT]',
      //   dto.content,
      //   analysis,
      // );//////////////
    } catch (error) {
      console.error(
        'Sentiment analysis failed:',
        error,
      );
    }

    return (this.prisma as any).feedback.create({
      data: {
        userId,
        sessionId: dto.sessionId,
        content: dto.content,
        sentiment,
        score,
      },
    });
  }
}
