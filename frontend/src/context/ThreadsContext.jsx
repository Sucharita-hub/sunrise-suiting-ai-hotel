import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const ThreadsContext = createContext(null);

// Thread list lives here (not inside ChatTab) so the sidebar nav can render
// it nested under "Chat" and stay in sync no matter which tab is active.
export function ThreadsProvider({ children }) {
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState(null);

  const refreshThreads = useCallback(async () => {
    try {
      const result = await api.listThreads();
      setThreads(result.threads ?? []);
    } catch {
      // nav list is a convenience; leave it as-is on failure
    } finally {
      setThreadsLoading(false);
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
