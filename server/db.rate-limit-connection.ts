type RateLimitConnection = {
  query: (...args: unknown[]) => Promise<unknown>;
  destroy: () => void;
  release: () => void;
};

function isQueryTimeout(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "PROTOCOL_SEQUENCE_TIMEOUT";
}

/**
 * Runs quota queries while ensuring timed-out connections are discarded,
 * never returned to the pool. Other outcomes release the connection normally.
 */
export async function withRateLimitConnection<T>(
  connection: RateLimitConnection,
  operation: (query: RateLimitConnection["query"]) => Promise<T>,
): Promise<T> {
  let destroyed = false;
  const query: RateLimitConnection["query"] = async (...args) => {
    try {
      return await connection.query(...args);
    } catch (error) {
      if (isQueryTimeout(error) && !destroyed) {
        destroyed = true;
        connection.destroy();
      }
      throw error;
    }
  };

  try {
    return await operation(query);
  } finally {
    if (!destroyed) connection.release();
  }
}
