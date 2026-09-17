import { useNavigate } from "react-router-dom"
import AdminEventsView from "../app/components/AdminEventsView"

export default function AdminEventsPage() {
  const navigate = useNavigate()

  return (
    <main className="h-dvh overflow-y-auto bg-background">
      <AdminEventsView onBack={() => navigate("/dashboard")} />
    </main>
  )
}
