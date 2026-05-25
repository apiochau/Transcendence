import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, {
      autoConnect: false,
      auth: () => ({ token: useAuthStore.getState().accessToken }),
    });
  }

  return socket;
}
