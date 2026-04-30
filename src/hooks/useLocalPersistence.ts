import { useEffect, useRef } from "react";

import type { GameState } from "../modules/core";
import type { ActionLogEntry } from "./types";

export const GAME_STORAGE_KEY = "rookys-game-state";
export const LOG_STORAGE_KEY = "rookys-action-log";

export function useLocalPersistence(
  gameState: GameState,
  actionLog: readonly ActionLogEntry[],
  enabled: boolean,
): void {
  const enabledRef = useRef(enabled);

  useEffect(() => {
    if (!enabledRef.current) return;
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(actionLog));
  }, [gameState, actionLog]);
}
