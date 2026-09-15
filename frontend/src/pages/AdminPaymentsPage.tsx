import AdminPaymentsView from "../app/components/AdminPaymentsView"
import { usePaymentRealtime } from "../features/payments/hooks/usePayments"
import { useNavigate } from "react-router-dom"

export default function AdminPaymentsPage() {
  const navigate = useNavigate()
  usePaymentRealtime()
  return <AdminPaymentsView onBack={() => navigate("/dashboard")} />
}
