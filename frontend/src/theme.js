import { createTheme } from "@mantine/core";

// Slate + teal — a plain, modern working palette. Deliberately not the
// bright orange/yellow a literal "sunrise" theme would default to, and not
// a gold/navy "boutique hotel lounge" look either.
export const theme = createTheme({
  primaryColor: "gold",
  colors: {
    gold: ["#f0fdfa", "#ccfbf1", "#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0d9488", "#0f766e", "#115e59", "#134e4a"],
    ink: ["#f1f5f9", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b", "#0f172a", "#0b1220", "#060a12"]
  },
  fontFamily: "'Sora', system-ui, sans-serif",
  headings: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: "600" },
  defaultRadius: "md",
  components: {
    Button: { defaultProps: { radius: "md" } }
  }
});
