import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearTelemetryEvents, getTelemetryEvents } from "../telemetry";
import { loadModel } from "./index";

beforeEach(() => {
  clearTelemetryEvents();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadModel", () => {
  it("returns the resolved value when loader succeeds", async () => {
    const result = await loadModel(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(getTelemetryEvents()).toHaveLength(0);
  });

  it("records model_load_failure telemetry and rethrows when loader fails with Error", async () => {
    const err = new Error("network timeout");
    await expect(loadModel(() => Promise.reject(err))).rejects.toThrow(
      "network timeout",
    );

    const events = getTelemetryEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("model_load_failure");
    expect(events[0].detail?.message).toBe("network timeout");
  });

  it("records model_load_failure telemetry and rethrows when loader fails with non-Error", async () => {
    await expect(loadModel(() => Promise.reject("bad path"))).rejects.toBe(
      "bad path",
    );

    const events = getTelemetryEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("model_load_failure");
    expect(events[0].detail?.message).toBe("bad path");
  });
});
