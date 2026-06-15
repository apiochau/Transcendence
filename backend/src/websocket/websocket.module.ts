import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CollectionModule } from '../collection/collection.module';
import { GameModule } from '../game/game.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { StatsModule } from '../stats/stats.module';
import { RealtimeGateway } from './websocket.gateway';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [JwtModule.register({}), StatsModule, GameModule, CollectionModule, MatchmakingModule, PrismaModule],
  imports: [JwtModule.register({}), StatsModule, GameModule, CollectionModule, MatchmakingModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class WebsocketModule {}
