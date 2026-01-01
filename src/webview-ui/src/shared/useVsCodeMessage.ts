import { useEffect, useCallback } from 'react';

export function useVsCodeMessage<T = unknown>(
  handler: (message: T) => void
): void {
  const messageHandler = useCallback(
    (event: MessageEvent<T>) => {
      handler(event.data);
    },
    [handler]
  );

  useEffect(() => {
    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [messageHandler]);
}

