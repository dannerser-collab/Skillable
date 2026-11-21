import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  AckResponse,
  BotDifficulty,
  ClientToServerEvents,
  JoinedRoom,
  PlayerIdentity,
  PlayerSlot,
  RoomState,
  ServerToClientEvents,
} from '../../../shared/types.ts';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const ACK_TIMEOUT_MS = 6000;

export function useArenaSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [mySlot, setMySlot] = useState<PlayerSlot | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  useEffect(() => {
    // Mismo origen que la página: en dev pasa por el proxy de Vite (ws: true),
    // en build lo sirve Express; funciona igual en localhost, LAN (QR) o túnel público.
    const socket: TypedSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleRoomState = (nextState: RoomState) => {
      setRoomState(nextState);
      setClockOffsetMs(nextState.serverNow - Date.now());
    };

    const handleRoomError = (payload: { message: string }) => {
      setError(payload.message);
    };

    const handleRoundStart = (round: RoomState['rounds'][number]) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const rounds = [...prev.rounds];
        const idx = round.index - 1;
        rounds[idx] = round;
        return {
          ...prev,
          phase: 'round',
          currentRoundIndex: idx,
          rounds,
        };
      });
    };

    const handleOpponentActivity = ({
      slot,
      activity,
    }: {
      slot: PlayerSlot;
      activity: RoomState['players'][PlayerSlot] extends infer P
        ? P extends { activity: infer A }
          ? A
          : never
        : never;
    }) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const player = prev.players[slot];
        if (!player) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [slot]: { ...player, activity },
          },
        };
      });
    };

    const handleRoundResult = (round: RoomState['rounds'][number]) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const rounds = [...prev.rounds];
        rounds[round.index - 1] = round;
        return {
          ...prev,
          phase: 'verdict',
          rounds,
        };
      });
    };

    const handleDuelFinished = (final: NonNullable<RoomState['final']>) => {
      setRoomState((prev) => (prev ? { ...prev, phase: 'finished', final } : prev));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:state', handleRoomState);
    socket.on('room:error', handleRoomError);
    socket.on('duel:roundStart', handleRoundStart);
    socket.on('duel:opponentActivity', handleOpponentActivity);
    socket.on('duel:roundResult', handleRoundResult);
    socket.on('duel:finished', handleDuelFinished);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:state', handleRoomState);
      socket.off('room:error', handleRoomError);
      socket.off('duel:roundStart', handleRoundStart);
      socket.off('duel:opponentActivity', handleOpponentActivity);
      socket.off('duel:roundResult', handleRoundResult);
      socket.off('duel:finished', handleDuelFinished);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const withAckTimeout = useCallback(
    <T,>(
      actionLabel: string,
      emitter: (socket: TypedSocket, resolveAck: (res: AckResponse<T>) => void) => void,
      onSuccess: (data: T) => void,
    ) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        setError('Aún conectando con el servidor de Arena. Verifica que el backend esté activo.');
        return Promise.resolve(false);
      }
      setError(null);
      setBusyAction(actionLabel);

      return new Promise<boolean>((resolve) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          setBusyAction(null);
          setError('El servidor de Arena tardó demasiado en responder.');
          resolve(false);
        }, ACK_TIMEOUT_MS);

        emitter(socket, (res) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          setBusyAction(null);
          if (res.ok) {
            onSuccess(res.data);
            resolve(true);
          } else {
            setError(res.error);
            resolve(false);
          }
        });
      });
    },
    [],
  );

  const applyJoinedRoom = useCallback((joined: JoinedRoom) => {
    setMySlot(joined.slot);
    setRoomState(joined.state);
    setClockOffsetMs(joined.state.serverNow - Date.now());
  }, []);

  const createRoom = useCallback(
    (identity: PlayerIdentity, fixedSkillId?: string) =>
      withAckTimeout<JoinedRoom>(
        'create',
        (socket, ack) => socket.emit('room:create', { ...identity, fixedSkillId }, ack),
        applyJoinedRoom,
      ),
    [applyJoinedRoom, withAckTimeout],
  );

  const joinRoom = useCallback(
    (identity: PlayerIdentity, code: string) =>
      withAckTimeout<JoinedRoom>(
        'join',
        (socket, ack) =>
          socket.emit('room:join', { ...identity, code: code.trim().toUpperCase() }, ack),
        applyJoinedRoom,
      ),
    [applyJoinedRoom, withAckTimeout],
  );

  const quickBot = useCallback(
    (identity: PlayerIdentity, difficulty: BotDifficulty, fixedSkillId?: string) =>
      withAckTimeout<JoinedRoom>(
        'quickBot',
        (socket, ack) =>
          socket.emit('duel:quickBot', { ...identity, difficulty, fixedSkillId }, ack),
        applyJoinedRoom,
      ),
    [applyJoinedRoom, withAckTimeout],
  );

  const addBot = useCallback(
    (difficulty: BotDifficulty) =>
      withAckTimeout<RoomState>(
        'addBot',
        (socket, ack) => socket.emit('room:addBot', { difficulty }, ack),
        (nextState) => {
          setRoomState(nextState);
          setClockOffsetMs(nextState.serverNow - Date.now());
        },
      ),
    [withAckTimeout],
  );

  const submitAnswer = useCallback(
    (text: string) =>
      withAckTimeout<undefined>(
        'submit',
        (socket, ack) => socket.emit('duel:submit', { text }, ack),
        () => undefined,
      ),
    [withAckTimeout],
  );

  const rematch = useCallback(
    () =>
      withAckTimeout<RoomState>(
        'rematch',
        (socket, ack) => socket.emit('duel:rematch', ack),
        (nextState) => {
          setRoomState(nextState);
          setClockOffsetMs(nextState.serverNow - Date.now());
        },
      ),
    [withAckTimeout],
  );

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    setRoomState(null);
    setMySlot(null);
    setError(null);
    setBusyAction(null);
  }, []);

  const markReady = useCallback(() => {
    socketRef.current?.emit('room:ready');
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.emit('duel:typing', isTyping);
  }, []);

  const nextRound = useCallback(() => {
    socketRef.current?.emit('duel:nextRound');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    connected,
    roomState,
    mySlot,
    busyAction,
    error,
    clockOffsetMs,
    createRoom,
    joinRoom,
    quickBot,
    addBot,
    submitAnswer,
    rematch,
    leaveRoom,
    markReady,
    setTyping,
    nextRound,
    clearError,
  };
}
