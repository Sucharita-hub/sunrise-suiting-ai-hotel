import { createTheme } from "@mantine/core";

// Dusk take on "Sunrise Suites" — deep navy-plum ink with a gold accent,
// deliberately not the bright orange/yellow a literal "sunrise" theme
// would default to.
export const theme = createTheme({
  primaryColor: "gold",
  colors: {
    gold: ["#fdf6e8", "#f8e7c1", "#f3d798", "#eec86e", "#eabc4f", "#e8b23a", "#dda02c", "#c48c22", "#ab791b", "#916513"],
    ink: ["#eceaf2", "#c9c4dc", "#a6a0c6", "#837bb0", "#645c95", "#4c4577", "#372f5c", "#241d3f", "#1b1730", "#120e21"]
  },
  fontFamily: "Inter, system-ui, sans-serif",
  headings: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: "600" },
  defaultRadius: "md",
  components: {
    Button: { defaultProps: { radius: "md" } }
  }
});
