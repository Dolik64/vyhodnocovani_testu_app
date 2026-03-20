// ═══════════════════════════════════════════════════════════════
// HLAVNÍ APLIKACE — spojuje všechny komponenty dohromady
// ═══════════════════════════════════════════════════════════════

function AppContent() {
  var { user, userData } = useAuth();
  var [page, setPage] = useState('evaluate');

  if (!user) return <LoginScreen />;

  return (
    <div className="app-layout">
      <Sidebar currentPage={page} setPage={setPage} />
      <div className="main-content">
        {page === 'evaluate' && <EvaluatePage />}
        {page === 'users' && userData?.role === 'admin' && <UsersPage />}
        {page === 'tests' && userData?.role === 'admin' && <TestsPage />}
        {page === 'groups' && userData?.role === 'admin' && <GroupsPage />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);