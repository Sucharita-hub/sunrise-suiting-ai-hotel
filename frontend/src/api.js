const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export function askAssistant(message, history) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ message, history })
  });
}

export function checkAvailability(payload) {
  return request("/availability", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
