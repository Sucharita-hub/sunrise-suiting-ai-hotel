import { useState } from "react";
import { Box, Button, Paper, PasswordInput, SegmentedControl, Stack, Text, TextInput, Title, Alert } from "@mantine/core";
import { useAuth } from "../context/AuthContext";
import loginArt from "../assets/illustrations/login.svg";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setPendingConfirmation(false);
    setPending(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        if (!data.session) {
          setPendingConfirmation(true);
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Incorrect email or password." : err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Box className="auth-grid" style={{ minHeight: "100vh" }}>
      <Box
        style={{
          background: "linear-gradient(160deg, #1b1730 0%, #241d3f 60%, #372f5c 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "3rem",
          color: "white"
        }}
      >
        <img src={loginArt} alt="" style={{ maxWidth: 320, width: "100%", marginBottom: "2rem" }} />
        <Title order={1} ta="center" c="gold.2" style={{ fontSize: "2rem" }}>
          Sunrise Suites
        </Title>
        <Text ta="center" c="ink.1" mt="sm" maw={380}>
          Your evening concierge — ask about the hotel, check what's open for your dates, and book a stay without
          leaving the chat.
        </Text>
      </Box>

      <Box style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4", padding: "2rem" }}>
        <Paper w={360} maw="100%" p="xl" radius="lg" withBorder shadow="sm">
          <SegmentedControl
            fullWidth
            mb="lg"
            value={mode}
            onChange={setMode}
            data={[
              { label: "Sign in", value: "signin" },
              { label: "Create account", value: "signup" }
            ]}
          />

          <form onSubmit={submit}>
            <Stack gap="sm">
              <TextInput
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                disabled={pending}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
              <PasswordInput
                label="Password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                disabled={pending}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />

              {error && (
                <Alert color="red" variant="light" data-testid="auth-error">
                  {error}
                </Alert>
              )}
              {pendingConfirmation && (
                <Alert color="gold" variant="light">
                  Account created. If email confirmation is enabled on this Supabase project, check your inbox before
                  signing in.
                </Alert>
              )}

              <Button type="submit" loading={pending} fullWidth mt="sm">
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Box>
  );
}
