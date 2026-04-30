import Peer, { type DataConnection } from "peerjs";

import type { GameState, TurnAction } from "../core";

export type MultiplayerRole = "host" | "joiner";

export type ConnectionStatus =
  | "idle"
  | "hosting"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "peer-disconnected";

export interface ActionEnvelope {
  readonly type: "action";
  readonly actionId: string;
  readonly turn: number;
  readonly payload: TurnAction;
}

export interface SyncEnvelope {
  readonly type: "sync";
  readonly state: GameState;
}

export interface LeaveEnvelope {
  readonly type: "leave";
}

export type NetworkMessage = ActionEnvelope | SyncEnvelope | LeaveEnvelope;

export interface PeerSessionCallbacks {
  readonly onPeerIdAssigned: (id: string) => void;
  readonly onStatusChange: (status: ConnectionStatus) => void;
  readonly onRemoteAction: (envelope: ActionEnvelope) => void;
  readonly onSyncReceived: (envelope: SyncEnvelope) => void;
}

export interface PeerSessionHandle {
  send(message: NetworkMessage): void;
  destroy(): void;
}

export interface NetworkingBoundary {
  readonly id: "p2p-networking";
  readonly description: string;
}

export const networkingBoundary: NetworkingBoundary = {
  id: "p2p-networking",
  description:
    "Owns PeerJS transport, action ordering, and reconnect handling.",
};

export const RECONNECT_TIMEOUT_MS = 10_000;
export const PEER_ID_STORAGE_KEY = "rookys-peer-id";

export function createPeerSession(
  role: MultiplayerRole,
  joinId: string | null,
  callbacks: PeerSessionCallbacks,
): PeerSessionHandle {
  const savedPeerId = sessionStorage.getItem(PEER_ID_STORAGE_KEY);
  const peer = savedPeerId !== null ? new Peer(savedPeerId) : new Peer();
  let conn: DataConnection | null = null;
  const seenActionIds = new Set<string>();
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function attachConnection(dataConn: DataConnection) {
    conn = dataConn;

    conn.on("open", () => {
      clearReconnectTimer();
      callbacks.onStatusChange("connected");
    });

    conn.on("data", (data) => {
      const msg = data as NetworkMessage;
      if (msg.type === "action") {
        if (seenActionIds.has(msg.actionId)) {
          return;
        }
        seenActionIds.add(msg.actionId);
        callbacks.onRemoteAction(msg);
      } else if (msg.type === "leave") {
        clearReconnectTimer();
        callbacks.onStatusChange("peer-disconnected");
      } else {
        callbacks.onSyncReceived(msg as SyncEnvelope);
      }
    });

    conn.on("close", () => {
      callbacks.onStatusChange("reconnecting");
      reconnectTimer = setTimeout(() => {
        callbacks.onStatusChange("peer-disconnected");
      }, RECONNECT_TIMEOUT_MS);
      const retryConn = peer.connect(dataConn.peer);
      attachConnection(retryConn);
    });

    conn.on("error", () => {
      callbacks.onStatusChange("peer-disconnected");
    });
  }

  peer.on("open", (id) => {
    sessionStorage.setItem(PEER_ID_STORAGE_KEY, id);
    callbacks.onPeerIdAssigned(id);
    if (role === "host") {
      callbacks.onStatusChange("hosting");
    } else {
      callbacks.onStatusChange("connecting");
      const dataConn = peer.connect(joinId as string);
      attachConnection(dataConn);
    }
  });

  if (role === "host") {
    peer.on("connection", (dataConn) => {
      attachConnection(dataConn as DataConnection);
    });
  }

  peer.on("error", () => {
    callbacks.onStatusChange("peer-disconnected");
  });

  return {
    send(message: NetworkMessage) {
      conn?.send(message);
    },
    destroy() {
      clearReconnectTimer();
      conn?.send({ type: "leave" });
      conn?.close();
      peer.destroy();
      sessionStorage.removeItem(PEER_ID_STORAGE_KEY);
    },
  };
}
