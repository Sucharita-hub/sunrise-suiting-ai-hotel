import { Navigate, Route, Routes } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { useAuth } from "./context/AuthContext";
import AuthScreen from "./screens/AuthScreen";
import SidebarShell from "./components/SidebarShell";
import ChatTab from "./tabs/ChatTab";
import BookStayTab from "./tabs/BookStayTab";
import ReservationsTab from "./tabs/ReservationsTab";
import AdminTab from "./tabs/AdminTab";

function ProtectedLayout() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return (
    <SidebarShell>
      <Routes>
        <Route index element={<ChatTab />} />
        <Route path="book" element={<BookStayTab />} />
        <Route path="reservations" element={<ReservationsTab />} />
        <Route path="admin" element={<AdminGuard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SidebarShell>
  );
}

function AdminGuard() {
  const { isStaff, roleLoading } = useAuth();
  if (roleLoading) {
    return (
      <Center h="60vh">
        <Loader color="gold" />
      </Center>
    );
  }
  if (!isStaff) return <Navigate to="/" replace />;
  return <AdminTab />;
}

function GuestOnlyLayout({ children }) {
  const { session } = useAuth();
  if (session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Loader color="gold" />
      </Center>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnlyLayout>
            <AuthScreen mode="signin" />
          </GuestOnlyLayout>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestOnlyLayout>
            <AuthScreen mode="signup" />
          </GuestOnlyLayout>
        }
      />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
