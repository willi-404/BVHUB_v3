import AdminMembersView from "../app/components/AdminMembersView";
export default function AdminPage() { return <AdminMembersView onBack={() => window.history.back()} />; }
