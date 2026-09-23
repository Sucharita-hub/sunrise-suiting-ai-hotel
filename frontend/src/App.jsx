import { useState } from "react";
import { Center, Loader } from "@mantine/core";
import { useAuth } from "./context/AuthContext";
import AuthScreen from "./screens/AuthScreen";
import SidebarShell from "./components/SidebarShell";
import ChatTab from "./tabs/ChatTab";
import BookStayTab from "./tabs/BookStayTab";
import ReservationsTab from "./tabs/ReservationsTab";
import AdminTab from "./tabs/AdminTab";

const TABS = {
  chat: ChatTab,
  book: BookStayTab,
  reservations: ReservationsTab,
  admin: AdminTab
};

export default function App() {
  const { loading, session } = useAuth();
  const [active, setActive] = useState("chat");

  if (loading) {
    return (
      <Center h="100vh">
        <Loader color="gold" />
      </Center>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const ActiveTab = TABS[active] ?? ChatTab;

  return (
    <SidebarShell active={active} onNavigate={setActive}>
      <ActiveTab />
    </SidebarShell>
  );
}
