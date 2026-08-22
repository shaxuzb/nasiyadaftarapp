type BackHandlerCallback = () => boolean;

interface RegisteredBackHandler {
  id: number;
  callback: BackHandlerCallback;
}

let nextHandlerId = 0;
const registeredHandlers = new Map<number, RegisteredBackHandler>();

export function registerBackHandler(callback: BackHandlerCallback): () => void {
  const id = nextHandlerId++;
  registeredHandlers.set(id, { id, callback });

  return () => {
    registeredHandlers.delete(id);
  };
}

export function handleRegisteredBackPress(): boolean {
  const handlers = Array.from(registeredHandlers.values()).sort(
    (first, second) => second.id - first.id,
  );

  for (const { callback } of handlers) {
    if (callback()) {
      return true;
    }
  }

  return false;
}
