import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { io, Socket } from 'socket.io-client';

interface ChatUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  recipientId: string | null;
  isGlobal: boolean;
  sender: ChatUser;
}

interface FriendshipRow {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  friend: ChatUser;
}

type View = 'global' | 'friends-list' | 'private';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatWidget() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(() => localStorage.getItem('chat:open') === 'true');
  const [view, setView] = useState<View>('global');
  const [activeFriend, setActiveFriend] = useState<ChatUser | null>(null);
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [friends, setFriends] = useState<FriendshipRow[]>([]);
  const [unreadByFriend, setUnreadByFriend] = useState<Record<string, number>>({});
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>(view);
  const activeFriendRef = useRef<ChatUser | null>(activeFriend);
  const openRef = useRef(open);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { activeFriendRef.current = activeFriend; }, [activeFriend]);
  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    localStorage.setItem('chat:open', String(open));
  }, [open]);

  useEffect(() => {
    if (!accessToken) return;

    apiClient.get<ChatMessage[]>('/chat/global').then(({ data }) => {
      setGlobalMessages(Array.isArray(data) ? data : []);
    });

    const socket = io(import.meta.env.VITE_API_URL ?? '/', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('chat:message', (msg: ChatMessage) => {
      setGlobalMessages((prev) => [...prev, msg]);
      if (!openRef.current || viewRef.current !== 'global') {
        setUnreadGlobal((u) => u + 1);
      }
    });

    socket.on('chat:private-message', (msg: ChatMessage) => {
      const currentFriendId = activeFriendRef.current?.id;
      const otherUserId = msg.senderId === user?.id ? msg.recipientId : msg.senderId;

      if (
        openRef.current &&
        viewRef.current === 'private' &&
        (msg.senderId === currentFriendId || msg.recipientId === currentFriendId)
      ) {
        setPrivateMessages((prev) => [...prev, msg]);
      } else if (otherUserId && msg.senderId !== user?.id) {
        setUnreadByFriend((prev) => ({ ...prev, [otherUserId]: (prev[otherUserId] ?? 0) + 1 }));
      }
    });

    socket.on('chat:error', (err: { message: string }) => {
      setError(err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user?.id]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      });
    }
  }, [open, view, globalMessages.length, privateMessages.length]);

  useEffect(() => {
    if (open && view === 'global') setUnreadGlobal(0);
  }, [open, view, globalMessages.length]);

  async function openFriendsList() {
    setView('friends-list');
    setError(null);
    try {
      const { data } = await apiClient.get<FriendshipRow[]>('/friends');
      const list = Array.isArray(data) ? data : [];
      setFriends(list.filter((r) => r.status === 'ACCEPTED'));
    } catch {
      setError('Impossible de charger les amis.');
    }
  }

  async function openConversation(friend: ChatUser) {
    setActiveFriend(friend);
    setView('private');
    setError(null);
    setUnreadByFriend((prev) => ({ ...prev, [friend.id]: 0 }));
    try {
      const { data } = await apiClient.get<ChatMessage[]>(`/chat/private/${friend.id}`);
      setPrivateMessages(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger la conversation.');
      setPrivateMessages([]);
    }
  }

  function backToGlobal() {
    setView('global');
    setActiveFriend(null);
  }

  function sendMessage() {
    const content = input.trim();
    if (content.length === 0 || !socketRef.current) return;
    setError(null);

    if (view === 'global') {
      socketRef.current.emit('chat:global', { content });
    } else if (view === 'private' && activeFriend) {
      socketRef.current.emit('chat:private', { recipientId: activeFriend.id, content });
    }
    setInput('');
  }

  if (!user) return null;

  const totalUnread =
    unreadGlobal + Object.values(unreadByFriend).reduce((sum, n) => sum + n, 0);
  const messages = view === 'private' ? privateMessages : globalMessages;
  const canSend = view === 'global' || (view === 'private' && activeFriend);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="flex h-[480px] w-80 flex-col rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              {view !== 'global' && (
                <button
                  type="button"
                  onClick={backToGlobal}
                  className="text-slate-400 hover:text-slate-600"
                  title="Retour"
                >
                  ←
                </button>
              )}
              <h2 className="text-sm font-semibold">
                {view === 'global' && 'Chat global'}
                {view === 'friends-list' && 'Messages privés'}
                {view === 'private' && (activeFriend?.displayName ?? activeFriend?.username ?? '')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {view === 'global' && (
                <button
                  type="button"
                  onClick={openFriendsList}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Privés
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
          </div>

          {view === 'friends-list' ? (
            <div className="chat-scroll flex-1 space-y-1 overflow-y-auto p-2">
              {friends.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  Aucun ami pour le moment.
                </p>
              ) : (
                friends.map((row) => {
                  const unread = unreadByFriend[row.friend.id] ?? 0;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => openConversation(row.friend)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        {row.friend.avatarUrl ? (
                          <img
                            src={row.friend.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                            {(row.friend.displayName ?? row.friend.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{row.friend.displayName ?? row.friend.username}</p>
                          <p className="text-xs text-slate-500">@{row.friend.username}</p>
                        </div>
                      </div>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div ref={listRef} className="chat-scroll flex-1 space-y-2 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-slate-400">Aucun message pour le moment.</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        isMine ? 'bg-accent text-white' : 'bg-slate-700 text-white'
                      }`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold opacity-80">
                            {isMine ? 'Moi' : (msg.sender.displayName ?? msg.sender.username)}
                          </p>
                          <p className="text-[10px] opacity-60">{formatTime(msg.createdAt)}</p>
                        </div>
                        <p className="break-words">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {error && (
            <p className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          {canSend && (
            <div className="flex gap-2 border-t border-slate-200 p-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ecris un message..."
                maxLength={500}
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="shrink-0 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Envoyer
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-800"
        >
          💬 Chat
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}