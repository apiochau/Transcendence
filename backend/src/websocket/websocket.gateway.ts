import { Logger } from '@nestjs/common';
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

interface JoinRoomPayload {
  roomId: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload) {
    await client.join(payload.roomId);
    client.emit('room:joined', { roomId: payload.roomId });
  }

  @SubscribeMessage('room:leave')
  async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload) {
    await client.leave(payload.roomId);
    client.emit('room:left', { roomId: payload.roomId });
  }

  @SubscribeMessage('game:signal')
  gameSignal(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; event: string; data?: unknown }) {
    client.to(payload.roomId).emit('game:signal', payload);
  }
}
