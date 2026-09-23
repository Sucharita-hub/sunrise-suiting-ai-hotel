import React from "react";
import ReactDOM from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "./theme";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <AuthProvider>
        <App />
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>
);
