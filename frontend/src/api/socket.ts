import { io } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

export function createSocket() {
  return io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
    autoConnect: false,
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 500,
    timeout: 10000,
    auth: {
      token: useAuthStore.getState().accessToken,
    },
  });
}
