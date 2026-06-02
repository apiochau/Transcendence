import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GameModule } from '../game/game.module';
import { StatsModule } from '../stats/stats.module';
import { RealtimeGateway } from './websocket.gateway';

@Module({
  imports: [JwtModule.register({}), StatsModule, GameModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class WebsocketModule {}
