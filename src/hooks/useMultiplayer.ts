import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { PlayerPaletteOption } from "../components/uiOptionsConfig";
import {
  applyAction,
  createClassicGameState,
  evaluateTurn,
  getPieceAtSquare,
  type GameState,
  type PlayerColor,
} from "../modules/core";
import {
  createPeerSession,
  type ActionEnvelope,
  type ConnectionStatus,
  type MultiplayerRole,
  type PeerSessionHandle,
  type SyncEnvelope,
} from "../modules/networking";
import { describeAction, describeStatus } from "../modules/ui";
import type { ActionLogEntry } from "./types";

export type MultiplayerState =
  | { readonly active: false }
  | {
      readonly active: true;
      readonly role: MultiplayerRole;
      readonly status: ConnectionStatus;
      readonly localPeerId: string | null;
    };

interface UseMultiplayerOptions {
  readonly initialSearchParams: string | undefined;
  readonly gameState: GameState;
  readonly setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  readonly setActionLog: React.Dispatch<
    React.SetStateAction<readonly ActionLogEntry[]>
  >;
  readonly resetSelection: () => void;
  readonly fileLabelsRef: { current: readonly string[] };
  readonly playerPaletteRef: { current: PlayerPaletteOption };
}

interface UseMultiplayerReturn {
  readonly multiplayer: MultiplayerState;
  readonly isHost: boolean;
  readonly localPlayerColor: PlayerColor | null;
  readonly sessionHandleRef: { current: PeerSessionHandle | null };
  readonly handleHostGame: () => void;
  readonly handleLeaveMultiplayer: () => void;
}

export function useMultiplayer({
  initialSearchParams,
  gameState,
  setGameState,
  setActionLog,
  resetSelection,
  fileLabelsRef,
  playerPaletteRef,
}: UseMultiplayerOptions): UseMultiplayerReturn {
  const [multiplayer, setMultiplayer] = useState<MultiplayerState>(() => {
    const search = initialSearchParams ?? window.location.search;
    const params = new URLSearchParams(search);
    if (params.get("join") !== null) {
      return {
        active: true,
        role: "joiner",
        status: "idle",
        localPeerId: null,
      };
    }
    return { active: false };
  });

  const sessionHandleRef = useRef<PeerSessionHandle | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const handleRemoteActionRef = useRef<
    ((envelope: ActionEnvelope) => void) | null
  >(null);
  const handleSyncReceivedRef = useRef<
    ((envelope: SyncEnvelope) => void) | null
  >(null);

  // Keep resetSelection fresh for callbacks that fire asynchronously
  const callbacksRef = useRef({ resetSelection });
  useLayoutEffect(() => {
    callbacksRef.current.resetSelection = resetSelection;
  });

  useEffect(() => {
    const search = initialSearchParams ?? window.location.search;
    const params = new URLSearchParams(search);
    const joinId = params.get("join");
    if (joinId === null) return;
    if (initialSearchParams === undefined) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    const handle = createPeerSession("joiner", joinId, {
      onPeerIdAssigned: (id) =>
        setMultiplayer((prev) =>
          prev.active ? { ...prev, localPeerId: id } : prev,
        ),
      onStatusChange: (status) =>
        setMultiplayer((prev) => (prev.active ? { ...prev, status } : prev)),
      onRemoteAction: (envelope) => handleRemoteActionRef.current?.(envelope),
      onSyncReceived: (envelope) => handleSyncReceivedRef.current?.(envelope),
    });
    sessionHandleRef.current = handle;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHost = multiplayer.active && multiplayer.role === "host";
  const localPlayerColor: PlayerColor | null = multiplayer.active
    ? multiplayer.role === "host"
      ? "white"
      : "black"
    : null;

  useLayoutEffect(() => {
    gameStateRef.current = gameState;
    handleRemoteActionRef.current = (envelope: ActionEnvelope) => {
      const current = gameStateRef.current;
      if (envelope.turn !== current.turn.ply) {
        if (isHost) {
          sessionHandleRef.current?.send({ type: "sync", state: current });
        }
        return;
      }
      const action = envelope.payload;
      const movingPiece = current.pieces.find((p) => p.id === action.pieceId)!;
      const capturedPiece =
        action.type === "move"
          ? getPieceAtSquare(current, action.to)
          : undefined;
      const nextState = applyAction(current, action);
      const nextEvaluation = evaluateTurn(nextState);
      setActionLog((prev) => [
        ...prev,
        {
          ply: current.turn.ply,
          text: describeAction(
            movingPiece,
            action,
            capturedPiece,
            fileLabelsRef.current,
          ),
          outcome: describeStatus(
            nextEvaluation.status,
            playerPaletteRef.current.labels,
          ),
        },
      ]);
      setGameState(nextState);
      callbacksRef.current.resetSelection();
    };
    handleSyncReceivedRef.current = (envelope: SyncEnvelope) => {
      setGameState(envelope.state);
      callbacksRef.current.resetSelection();
    };
  });

  function handleHostGame() {
    setMultiplayer({
      active: true,
      role: "host",
      status: "idle",
      localPeerId: null,
    });
    const handle = createPeerSession("host", null, {
      onPeerIdAssigned: (id) =>
        setMultiplayer((prev) =>
          prev.active ? { ...prev, localPeerId: id } : prev,
        ),
      onStatusChange: (status) =>
        setMultiplayer((prev) => (prev.active ? { ...prev, status } : prev)),
      onRemoteAction: (envelope) => handleRemoteActionRef.current?.(envelope),
      onSyncReceived: (envelope) => handleSyncReceivedRef.current?.(envelope),
    });
    sessionHandleRef.current = handle;
  }

  function handleLeaveMultiplayer() {
    sessionHandleRef.current?.destroy();
    sessionHandleRef.current = null;
    setMultiplayer({ active: false });
    setGameState(createClassicGameState());
    setActionLog([]);
    callbacksRef.current.resetSelection();
  }

  return {
    multiplayer,
    isHost,
    localPlayerColor,
    sessionHandleRef,
    handleHostGame,
    handleLeaveMultiplayer,
  };
}
