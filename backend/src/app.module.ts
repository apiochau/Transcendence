import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CollectionModule } from './collection/collection.module';
import { FriendsModule } from './friends/friends.module';
import { GameModule } from './game/game.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma.module';
import { StatsModule } from './stats/stats.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { UsersModule } from './users/users.module';
import { WebsocketModule } from './websocket/websocket.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CollectionModule,
    UsersModule,
    FriendsModule,
    GameModule,
    ChatModule,
    MatchmakingModule,
    TournamentsModule,
    StatsModule,
    WebsocketModule,
    NotificationsModule,
  ],
})
export class AppModule {}
