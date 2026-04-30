import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearTelemetryEvents, getTelemetryEvents, recordEvent } from "./index";

beforeEach(() => {
  clearTelemetryEvents();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordEvent", () => {
  it("stores an event with the correct type and a timestamp", () => {
    const before = Date.now();
    recordEvent("connection_failure");
    const after = Date.now();

    const events = getTelemetryEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("connection_failure");
    expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(events[0].timestamp).toBeLessThanOrEqual(after);
  });

  it("stores optional detail when provided", () => {
    recordEvent("model_load_failure", { path: "/model.json", code: 404 });

    const events = getTelemetryEvents();
    expect(events[0].detail).toEqual({ path: "/model.json", code: 404 });
  });

  it("omits detail key when not provided", () => {
    recordEvent("reconnect_timeout");

    const events = getTelemetryEvents();
    expect(Object.prototype.hasOwnProperty.call(events[0], "detail")).toBe(
      false,
    );
  });

  it("calls console.warn with the telemetry prefix and event object", () => {
    const spy = vi.spyOn(console, "warn");
    recordEvent("connection_failure");

    expect(spy).toHaveBeenCalledWith(
      "[rookys:telemetry]",
      expect.objectContaining({ type: "connection_failure" }),
    );
  });

  it("accumulates multiple events in insertion order", () => {
    recordEvent("connection_failure");
    recordEvent("reconnect_timeout");
    recordEvent("model_load_failure");

    const types = getTelemetryEvents().map((e) => e.type);
    expect(types).toEqual([
      "connection_failure",
      "reconnect_timeout",
      "model_load_failure",
    ]);
  });

  it("evicts oldest event when the ring buffer exceeds 50 entries", () => {
    for (let i = 0; i < 51; i++) {
      recordEvent("connection_failure", { seq: i });
    }

    const events = getTelemetryEvents();
    expect(events).toHaveLength(50);
    expect(events[0].detail?.seq).toBe(1);
    expect(events[49].detail?.seq).toBe(50);
  });
});

describe("clearTelemetryEvents", () => {
  it("removes all stored events", () => {
    recordEvent("connection_failure");
    recordEvent("reconnect_timeout");

    clearTelemetryEvents();

    expect(getTelemetryEvents()).toHaveLength(0);
  });
});
