import AdminPaymentsView from "../app/components/AdminPaymentsView"
import { usePaymentRealtime } from "../features/payments/hooks/usePayments"
import { useNavigate } from "react-router-dom"

export default function AdminPaymentsPage() {
  const navigate = useNavigate()
  usePaymentRealtime()
  return (
    <div className="flex h-full min-h-screen flex-col overflow-hidden bg-background">
      <AdminPaymentsView onBack={() => navigate("/dashboard")} />
    </div>
  )
}
