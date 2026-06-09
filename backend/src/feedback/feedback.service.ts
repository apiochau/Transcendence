import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
//import { GameStatus } from '@prisma/client';

@Injectable()
export class FeedbackService 
{
  constructor(private readonly prisma: PrismaService,) {}


  async create(userId: string, dto: CreateFeedbackDto) 
  {

    const session =
      await this.prisma.gameSession.findUnique({
        where: { id: dto.sessionId,},
      });
       console.log('session:', session);//DEBUG
console.log('session.playerId:', session?.playerId);//DEBUG
console.log('userId:', userId);//DEBUG

    if (!session) {
      throw new NotFoundException('Session not found',);
      }

    if (session.status !== 'FINISHED') {
      throw new BadRequestException(
        'Feedback can only be submitted after the game is finished',
      );
    }


  // Prevent duplicate feedback submissions
    const existingFeedback =
      await this.prisma.feedback.findUnique({
        where: {userId_sessionId: {userId, sessionId: dto.sessionId,},},
      });

    if (existingFeedback) {
    throw new ConflictException('Feedback already submitted',);
      }


      
    // AI sentiment analysis

    return this.prisma.feedback.create({
      data: {
        userId,
        sessionId: dto.sessionId,
        content: dto.content,
      },
    });
  }


  
}