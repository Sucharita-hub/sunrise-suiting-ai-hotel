import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppShell, Avatar, Burger, Group, NavLink, ScrollArea, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { LogOut, MessageCircle, CalendarPlus, ClipboardList, ShieldCheck, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThreadsProvider, useThreads } from "../context/ThreadsContext";

const NAV_ITEMS = [
  { key: "book", to: "/book", label: "Book a Stay", icon: CalendarPlus },
  { key: "reservations", to: "/reservations", label: "My Reservations", icon: ClipboardList }
];

function ChatNavSection({ closeNav }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { threads, threadsLoading, activeThreadId, setActiveThreadId, startNewChat } = useThreads();
  const [expanded, setExpanded] = useState(true);
  const isChatActive = location.pathname === "/";

  function goToChat(action) {
    action?.();
    navigate("/");
    closeNav();
  }

  return (
    <NavLink
      data-testid="nav-chat"
      label="Chat"
      leftSection={<MessageCircle size={17} />}
      active={isChatActive}
      color="gold"
      variant="filled"
      opened={expanded}
      childrenOffset={20}
      onClick={() => {
        setExpanded((o) => !o);
        if (!isChatActive) navigate("/");
      }}
      styles={{ root: { borderRadius: 8, color: isChatActive ? "#0f172a" : "#cbd5e1" } }}
    >
      <UnstyledButton
        data-testid="new-chat"
        onClick={() => goToChat(startNewChat)}
        p={6}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", borderRadius: 6, color: "#5eead4" }}
      >
        <Plus size={14} />
        <Text size="sm">New chat</Text>
      </UnstyledButton>

      <ScrollArea.Autosize mah={220} type="auto">
        <Stack gap={2} mt={4}>
          {threadsLoading && (
            <Text size="xs" c="dimmed" px={6}>
              Loading…
            </Text>
          )}
          {!threadsLoading && threads.length === 0 && (
            <Text size="xs" c="dimmed" px={6}>
              No conversations yet.
            </Text>
          )}
          {threads.map((t) => (
            <UnstyledButton
              key={t.id}
              data-testid="thread-item"
              onClick={() => goToChat(() => setActiveThreadId(t.id))}
              p={6}
              style={{
                display: "block",
                width: "100%",
                borderRadius: 6,
                background: t.id === activeThreadId && isChatActive ? "#134e4a" : "transparent",
                color: t.id === activeThreadId && isChatActive ? "#5eead4" : "#cbd5e1"
              }}
            >
              <Text size="sm" truncate>
                {t.title || "New conversation"}
              </Text>
            </UnstyledButton>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </NavLink>
  );
}

function SidebarNav({ closeNav }) {
  const { isStaff } = useAuth();
  const location = useLocation();

  return (
    <Stack gap={4}>
      <ChatNavSection closeNav={closeNav} />

      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <NavLink
            key={item.key}
            component={Link}
            to={item.to}
            onClick={closeNav}
            data-testid={`nav-${item.key}`}
            label={item.label}
            leftSection={<item.icon size={17} />}
            active={isActive}
            color="gold"
            variant="filled"
            styles={{
              root: { borderRadius: 8, color: isActive ? "#0f172a" : "#cbd5e1" }
            }}
          />
        );
      })}

      {isStaff && (
        <NavLink
          component={Link}
          to="/admin"
          onClick={closeNav}
          data-testid="nav-admin"
          label="Admin"
          leftSection={<ShieldCheck size={17} />}
          active={location.pathname === "/admin"}
          color="gold"
          variant="filled"
          styles={{
            root: { borderRadius: 8, color: location.pathname === "/admin" ? "#0f172a" : "#cbd5e1" }
          }}
        />
      )}
    </Stack>
  );
}

export default function SidebarShell({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);

  // The mobile off-canvas navbar overlays the whole page while open, including
  // the burger that opened it — without this there is no way to dismiss it
  // short of picking a nav link (NavLink onClick already calls closeNav).
  useEffect(() => {
    if (!navOpened) return;
    function handleKey(event) {
      if (event.key === "Escape") closeNav();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navOpened, closeNav]);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <ThreadsProvider>
      <AppShell navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !navOpened } }} padding="lg">
        <AppShell.Navbar
          p="md"
          style={{ background: "#0f172a", color: "#f1f5f9", border: "none", display: "flex", flexDirection: "column" }}
        >
          <Title order={4} c="gold.3" mb="lg">
            Sunrise Suites
          </Title>

          <ScrollArea style={{ flex: 1 }} type="auto">
            <SidebarNav closeNav={closeNav} />
          </ScrollArea>

          <div>
            <Group justify="space-between" mt="xl" pt="md" style={{ borderTop: "1px solid #1e293b" }}>
              <Group gap="xs">
                <Avatar size={28} radius="xl" color="gold">
                  {user?.email?.[0]?.toUpperCase() ?? "?"}
                </Avatar>
                <Text size="xs" c="ink.1" style={{ maxWidth: 120 }} truncate>
                  {user?.email}
                </Text>
              </Group>
              <UnstyledButton onClick={handleSignOut} title="Sign out" aria-label="Sign out" c="ink.1">
                <LogOut size={16} />
              </UnstyledButton>
            </Group>
          </div>
        </AppShell.Navbar>

        <AppShell.Main style={{ background: "#f8fafc" }}>
          <Group hiddenFrom="sm" mb="md" justify="space-between" style={{ position: "relative", zIndex: 401 }}>
            <Group gap="xs">
              <Burger
                opened={navOpened}
                onClick={toggleNav}
                size="sm"
                aria-label="Toggle navigation"
                data-testid="nav-burger"
                color={navOpened ? "white" : "#0f172a"}
                style={navOpened ? { background: "#0f172a", borderRadius: 8, padding: 4 } : undefined}
              />
              {!navOpened && (
                <Title order={5} c="ink.9">
                  Sunrise Suites
                </Title>
              )}
            </Group>
          </Group>
          {children}
        </AppShell.Main>
      </AppShell>
    </ThreadsProvider>
  );
}
