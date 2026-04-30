export type TelemetryEventType =
  | "connection_failure"
  | "reconnect_timeout"
  | "model_load_failure";

export interface TelemetryEvent {
  readonly type: TelemetryEventType;
  readonly timestamp: number;
  readonly detail?: Record<string, unknown>;
}

const MAX_EVENTS = 50;
const events: TelemetryEvent[] = [];

export function recordEvent(
  type: TelemetryEventType,
  detail?: Record<string, unknown>,
): void {
  const event: TelemetryEvent =
    detail !== undefined ? { type, timestamp: Date.now(), detail } : { type, timestamp: Date.now() };
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.shift();
  }
  console.warn("[rookys:telemetry]", event);
}

export function getTelemetryEvents(): readonly TelemetryEvent[] {
  return events;
}

export function clearTelemetryEvents(): void {
  events.length = 0;
}
