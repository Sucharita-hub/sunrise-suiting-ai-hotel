import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

const ThreadsContext = createContext(null);

// Thread list lives here (not inside ChatTab) so the sidebar nav can render
// it nested under "Chat" and stay in sync no matter which tab is active.
export function ThreadsProvider({ children }) {
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState(null);
  // React StrictMode double-invokes this provider's mount effect, and
  // sendText() also triggers a refresh right after a new thread is created —
  // so multiple GET /api/threads calls can be in flight at once with no
  // guarantee they resolve in the order they were sent. Without this guard,
  // a slower *earlier* request resolving after a faster *later* one would
  // silently stomp a correct, populated list back to whatever the stale
  // response says (e.g. "No conversations yet" right after actually chatting).
  const latestRequestIdRef = useRef(0);

  const refreshThreads = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    try {
      const result = await api.listThreads();
      if (requestId !== latestRequestIdRef.current) return; // a newer request already won
      setThreads(result.threads ?? []);
    } catch {
      // nav list is a convenience; leave it as-is on failure
    } finally {
      if (requestId === latestRequestIdRef.current) setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  function startNewChat() {
    setActiveThreadId(null);
  }

  return (
    <ThreadsContext.Provider
      value={{ threads, threadsLoading, activeThreadId, setActiveThreadId, startNewChat, refreshThreads }}
    >
      {children}
    </ThreadsContext.Provider>
  );
}

export function useThreads() {
  const ctx = useContext(ThreadsContext);
  if (!ctx) throw new Error("useThreads must be used within a ThreadsProvider");
  return ctx;
}
