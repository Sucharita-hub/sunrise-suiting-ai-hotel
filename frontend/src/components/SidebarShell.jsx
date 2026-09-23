import { AppShell, Avatar, Group, NavLink, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { LogOut, MessageCircle, CalendarPlus, ClipboardList, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "book", label: "Book a Stay", icon: CalendarPlus },
  { key: "reservations", label: "My Reservations", icon: ClipboardList }
];

export default function SidebarShell({ active, onNavigate, children }) {
  const { user, isStaff, signOut } = useAuth();

  return (
    <AppShell navbar={{ width: 240, breakpoint: "sm" }} padding="lg">
      <AppShell.Navbar
        p="md"
        style={{ background: "#1b1730", color: "#eceaf2", border: "none" }}
      >
        <Title order={4} c="gold.3" mb="lg">
          Sunrise Suites
        </Title>

        <Stack gap={4}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              data-testid={`nav-${item.key}`}
              label={item.label}
              leftSection={<item.icon size={17} />}
              active={active === item.key}
              onClick={() => onNavigate(item.key)}
              color="gold"
              variant="filled"
              styles={{
                root: { borderRadius: 8, color: active === item.key ? "#1b1730" : "#c9c4dc" }
              }}
            />
          ))}

          {isStaff && (
            <NavLink
              data-testid="nav-admin"
              label="Admin"
              leftSection={<ShieldCheck size={17} />}
              active={active === "admin"}
              onClick={() => onNavigate("admin")}
              color="gold"
              variant="filled"
              styles={{
                root: { borderRadius: 8, color: active === "admin" ? "#1b1730" : "#c9c4dc" }
              }}
            />
          )}
        </Stack>

        <div style={{ marginTop: "auto" }}>
          <Group justify="space-between" mt="xl" pt="md" style={{ borderTop: "1px solid #372f5c" }}>
            <Group gap="xs">
              <Avatar size={28} radius="xl" color="gold">
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </Avatar>
              <Text size="xs" c="ink.1" style={{ maxWidth: 120 }} truncate>
                {user?.email}
              </Text>
            </Group>
            <UnstyledButton onClick={signOut} title="Sign out" aria-label="Sign out" c="ink.1">
              <LogOut size={16} />
            </UnstyledButton>
          </Group>
        </div>
      </AppShell.Navbar>

      <AppShell.Main style={{ background: "#faf8f4" }}>{children}</AppShell.Main>
    </AppShell>
  );
}
