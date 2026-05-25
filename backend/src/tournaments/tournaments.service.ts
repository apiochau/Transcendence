import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.tournament.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(name: string) {
    return this.prisma.tournament.create({ data: { name } });
  }

  join(tournamentId: string, userId: string) {
    return this.prisma.tournamentEntry.create({ data: { tournamentId, userId } });
  }
}
