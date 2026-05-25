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

interface GameSignalPayload {
  roomId: string;
  event: string;
  data?: {
    answerIndex?: number;
  };
}

interface QuizQuestion {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
}

interface RoomState {
  players: Set<string>;
  ready: Set<string>;
  currentQuestionIndex: number;
  answers: Map<string, number>;
  started: boolean;
  acceptingAnswers: boolean;
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 'realtime',
    question: 'Quel outil est utilise pour le temps reel dans cette app ?',
    answers: ['Socket.IO', 'SMTP', 'GraphQL uniquement', 'Redis CLI'],
    correctIndex: 0,
  },
  {
    id: 'backend',
    question: 'Quel framework backend lance l API ?',
    answers: ['NestJS', 'Vite', 'Tailwind CSS', 'Zustand'],
    correctIndex: 0,
  },
  {
    id: 'database',
    question: 'Quel ORM est branche sur PostgreSQL ?',
    answers: ['Prisma', 'Axios', 'React Router', 'Nginx'],
    correctIndex: 0,
  },
];

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly rooms = new Map<string, RoomState>();

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`socket disconnected: ${client.id}`);
    this.removeClientFromRooms(client);
  }

  @SubscribeMessage('room:join')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload) {
    await client.join(payload.roomId);
    const room = this.getRoomState(payload.roomId);
    room.players.add(client.id);
    client.emit('room:joined', { roomId: payload.roomId });
    this.emitReadyState(payload.roomId);

    if (room.started) {
      client.emit('game:started', { totalQuestions: quizQuestions.length });
      this.emitQuestionToClient(client, room);
    }
  }

  @SubscribeMessage('room:leave')
  async leaveRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomPayload) {
    await client.leave(payload.roomId);
    this.removeClientFromRoom(client.id, payload.roomId);
    client.emit('room:left', { roomId: payload.roomId });
  }

  @SubscribeMessage('game:signal')
  gameSignal(@ConnectedSocket() client: Socket, @MessageBody() payload: GameSignalPayload) {
    if (payload.event === 'player:ready') {
      this.markPlayerReady(client, payload.roomId);
      return;
    }

    if (payload.event === 'game:answer') {
      this.submitAnswer(client, payload);
      return;
    }

    client.to(payload.roomId).emit('game:signal', payload);
  }

  private getRoomState(roomId: string) {
    const existingRoom = this.rooms.get(roomId);
    if (existingRoom) {
      return existingRoom;
    }

    const room: RoomState = {
      players: new Set<string>(),
      ready: new Set<string>(),
      currentQuestionIndex: 0,
      answers: new Map<string, number>(),
      started: false,
      acceptingAnswers: false,
    };

    this.rooms.set(roomId, room);
    return room;
  }

  private markPlayerReady(client: Socket, roomId: string) {
    const room = this.getRoomState(roomId);
    room.players.add(client.id);
    room.ready.add(client.id);
    this.server.to(roomId).emit('game:signal', { roomId, event: 'player:ready' });
    this.emitReadyState(roomId);

    if (!room.started && room.players.size >= 2 && room.ready.size >= 2) {
      room.started = true;
      room.acceptingAnswers = true;
      room.currentQuestionIndex = 0;
      room.answers.clear();
      this.server.to(roomId).emit('game:started', { totalQuestions: quizQuestions.length });
      this.emitCurrentQuestion(roomId);
    }
  }

  private submitAnswer(client: Socket, payload: GameSignalPayload) {
    const room = this.rooms.get(payload.roomId);
    if (!room?.started || !room.acceptingAnswers || payload.data?.answerIndex === undefined) {
      return;
    }

    room.answers.set(client.id, payload.data.answerIndex);
    this.server.to(payload.roomId).emit('game:answer-state', {
      answered: room.answers.size,
      players: room.players.size,
    });

    if (room.answers.size >= room.players.size) {
      this.revealAnswer(payload.roomId, room);
    }
  }

  private revealAnswer(roomId: string, room: RoomState) {
    room.acceptingAnswers = false;
    const question = quizQuestions[room.currentQuestionIndex];
    this.server.to(roomId).emit('game:answer-result', {
      questionId: question.id,
      correctIndex: question.correctIndex,
    });

    setTimeout(() => {
      room.currentQuestionIndex += 1;
      room.answers.clear();

      if (room.currentQuestionIndex >= quizQuestions.length) {
        this.server.to(roomId).emit('game:finished');
        this.rooms.delete(roomId);
        return;
      }

      this.emitCurrentQuestion(roomId);
    }, 1800);
  }

  private emitReadyState(roomId: string) {
    const room = this.getRoomState(roomId);
    this.server.to(roomId).emit('game:ready-state', {
      players: room.players.size,
      ready: room.ready.size,
      started: room.started,
    });
  }

  private emitCurrentQuestion(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const question = this.getPublicQuestion(room.currentQuestionIndex);
    room.acceptingAnswers = true;
    this.server.to(roomId).emit('game:question', question);
  }

  private emitQuestionToClient(client: Socket, room: RoomState) {
    client.emit('game:question', this.getPublicQuestion(room.currentQuestionIndex));
  }

  private getPublicQuestion(index: number) {
    const question = quizQuestions[index];
    return {
      id: question.id,
      question: question.question,
      answers: question.answers,
      index,
      total: quizQuestions.length,
    };
  }

  private removeClientFromRooms(client: Socket) {
    for (const roomId of client.rooms) {
      if (roomId !== client.id) {
        this.removeClientFromRoom(client.id, roomId);
      }
    }
  }

  private removeClientFromRoom(clientId: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.players.delete(clientId);
    room.ready.delete(clientId);
    room.answers.delete(clientId);

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      return;
    }

    this.emitReadyState(roomId);
  }
}
