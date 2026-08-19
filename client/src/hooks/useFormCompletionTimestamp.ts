import { useEffect, useRef, useState } from "react";

export function useFormCompletionTimestamp(isSubmitReady: boolean) {
  const [completionTimestamp, setCompletionTimestamp] = useState<string | undefined>();
  const wasSubmitReady = useRef(false);

  useEffect(() => {
    if (isSubmitReady && !wasSubmitReady.current) setCompletionTimestamp(new Date().toISOString());
    if (!isSubmitReady) setCompletionTimestamp(undefined);
    wasSubmitReady.current = isSubmitReady;
  }, [isSubmitReady]);

  return completionTimestamp;
}
