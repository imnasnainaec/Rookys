export interface ActionEnvelope<TAction = unknown> {
  readonly actionId: string;
  readonly turn: number;
  readonly payload: TAction;
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
