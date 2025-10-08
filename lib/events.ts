import { EventEmitter } from "events";

const globalForEvents = global as unknown as {
  menuEvents?: EventEmitter;
};

export const menuEvents =
  globalForEvents.menuEvents ?? (() => {
    const em = new EventEmitter();
    em.setMaxListeners(100);
    globalForEvents.menuEvents = em;
    return em;
  })();

export function emitMenuUpdated(payload: unknown) {
  // Avoid throwing if no listeners
  try {
    menuEvents.emit("message", payload);
  } catch {}
}

