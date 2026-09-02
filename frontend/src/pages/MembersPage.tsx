import AdminMembersView from "../app/components/AdminMembersView";
export default function MembersPage() { return <AdminMembersView onBack={() => window.history.back()} />; }
