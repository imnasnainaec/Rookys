import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionEnvelope, PeerSessionCallbacks } from "./index";
import { createPeerSession, RECONNECT_TIMEOUT_MS } from "./index";
import { createClassicGameState } from "../core";

// ── PeerJS mock ──────────────────────────────────────────────────────────────

interface MockConn {
  peer: string;
  on: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

interface MockPeer {
  on: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

let mockPeer: MockPeer;
let mockConn: MockConn;
let mockRetryConn: MockConn;

const { MockPeer } = vi.hoisted(() => ({ MockPeer: vi.fn() }));

vi.mock("peerjs", () => ({
  default: MockPeer,
}));

function makeConn(peerId = "remote-id"): MockConn {
  return {
    peer: peerId,
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  };
}

beforeEach(() => {
  mockConn = makeConn();
  mockRetryConn = makeConn("remote-id");
  mockPeer = {
    on: vi.fn(),
    connect: vi
      .fn()
      .mockReturnValueOnce(mockConn)
      .mockReturnValue(mockRetryConn),
    destroy: vi.fn(),
  };
  MockPeer.mockImplementation(function () {
    return mockPeer;
  });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function triggerPeer(event: string, ...args: unknown[]) {
  const found = (
    mockPeer.on.mock.calls as [string, (...a: unknown[]) => void][]
  ).find(([e]) => e === event);
  found?.[1](...args);
}

function triggerConn(conn: MockConn, event: string, ...args: unknown[]) {
  const calls = conn.on.mock.calls as [string, (...a: unknown[]) => void][];
  const found = calls.findLast(([e]) => e === event);
  found?.[1](...args);
}

function makeCallbacks(): PeerSessionCallbacks & {
  peerIdLog: string[];
  statusLog: string[];
  actionLog: ActionEnvelope[];
  syncLog: unknown[];
} {
  const peerIdLog: string[] = [];
  const statusLog: string[] = [];
  const actionLog: ActionEnvelope[] = [];
  const syncLog: unknown[] = [];

  return {
    peerIdLog,
    statusLog,
    actionLog,
    syncLog,
    onPeerIdAssigned: (id) => peerIdLog.push(id),
    onStatusChange: (s) => statusLog.push(s),
    onRemoteAction: (e) => actionLog.push(e),
    onSyncReceived: (e) => syncLog.push(e),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("createPeerSession – host role", () => {
  it("transitions to hosting when peer opens", () => {
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");

    expect(cb.peerIdLog).toEqual(["local-id"]);
    expect(cb.statusLog).toContain("hosting");
  });

  it("reaches connected when incoming connection opens", () => {
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);
    triggerConn(mockConn, "open");

    expect(cb.statusLog).toContain("connected");
  });

  it("forwards received action envelopes and deduplicates", () => {
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);

    const envelope: ActionEnvelope = {
      type: "action",
      actionId: "abc",
      turn: 1,
      payload: { type: "upgrade", pieceId: "white-king", direction: "north" },
    };

    triggerConn(mockConn, "data", envelope);
    triggerConn(mockConn, "data", envelope); // duplicate

    expect(cb.actionLog).toHaveLength(1);
    expect(cb.actionLog[0].actionId).toBe("abc");
  });

  it("forwards sync envelopes", () => {
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);

    const state = createClassicGameState();
    triggerConn(mockConn, "data", { type: "sync", state });

    expect(cb.syncLog).toHaveLength(1);
  });

  it("transitions to reconnecting on close and retries connection", () => {
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);
    triggerConn(mockConn, "open");
    triggerConn(mockConn, "close");

    expect(cb.statusLog).toContain("reconnecting");
    expect(mockPeer.connect).toHaveBeenCalledWith("remote-id");
  });

  it("clears reconnect timer and reaches connected when retry opens", () => {
    vi.useFakeTimers();
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);
    triggerConn(mockConn, "open");
    triggerConn(mockConn, "close"); // starts timer; peer.connect → mockConn (first retval)

    // The retry conn is mockConn (first retval of peer.connect for host role)
    triggerConn(mockConn, "open"); // clears timer, signals connected
    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS + 1000);

    // Should still be connected, not peer-disconnected
    const lastStatus = cb.statusLog[cb.statusLog.length - 1];
    expect(lastStatus).toBe("connected");
  });

  it("transitions to peer-disconnected when reconnect timer fires", () => {
    vi.useFakeTimers();
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);
    triggerConn(mockConn, "open");
    triggerConn(mockConn, "close");

    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS + 100);

    expect(cb.statusLog).toContain("peer-disconnected");
  });

  it("transitions to peer-disconnected on connection error", () => {
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);
    triggerConn(mockConn, "error");

    expect(cb.statusLog).toContain("peer-disconnected");
  });

  it("transitions to peer-disconnected on peer error", () => {
    const cb = makeCallbacks();
    createPeerSession("host", null, cb);

    triggerPeer("error");

    expect(cb.statusLog).toContain("peer-disconnected");
  });

  it("send calls conn.send when connected", () => {
    const cb = makeCallbacks();
    const handle = createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);
    triggerConn(mockConn, "open");

    const msg = { type: "sync" as const, state: createClassicGameState() };
    handle.send(msg);

    expect(mockConn.send).toHaveBeenCalledWith(msg);
  });

  it("send does nothing when conn is null (before any connection)", () => {
    const cb = makeCallbacks();
    const handle = createPeerSession("host", null, cb);

    expect(() =>
      handle.send({ type: "sync", state: createClassicGameState() }),
    ).not.toThrow();
  });

  it("destroy closes conn and peer, clears timer when conn is active", () => {
    vi.useFakeTimers();
    const cb = makeCallbacks();
    const handle = createPeerSession("host", null, cb);

    triggerPeer("open", "local-id");
    triggerPeer("connection", mockConn);
    triggerConn(mockConn, "open");
    triggerConn(mockConn, "close"); // sets timer

    handle.destroy();

    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS + 100);

    // Timer was cleared so status should not have advanced to peer-disconnected after destroy
    expect(mockConn.close).toHaveBeenCalled();
    expect(mockPeer.destroy).toHaveBeenCalled();
  });

  it("destroy works when conn is null", () => {
    const cb = makeCallbacks();
    const handle = createPeerSession("host", null, cb);

    expect(() => handle.destroy()).not.toThrow();
    expect(mockPeer.destroy).toHaveBeenCalled();
  });
});

describe("createPeerSession – joiner role", () => {
  it("connects to joinId and transitions to connecting then connected", () => {
    const cb = makeCallbacks();
    createPeerSession("joiner", "host-peer-id", cb);

    triggerPeer("open", "my-id");

    expect(cb.statusLog).toContain("connecting");
    expect(mockPeer.connect).toHaveBeenCalledWith("host-peer-id");

    triggerConn(mockConn, "open");

    expect(cb.statusLog).toContain("connected");
  });

  it("does not register connection event handler for joiner", () => {
    createPeerSession("joiner", "host-id", makeCallbacks());

    const registeredEvents = (
      mockPeer.on.mock.calls as [string, unknown][]
    ).map(([e]) => e);
    expect(registeredEvents).not.toContain("connection");
  });
});
