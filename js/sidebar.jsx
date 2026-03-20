// ═══════════════════════════════════════════════════════════════
// BOČNÍ MENU
// ═══════════════════════════════════════════════════════════════

function Sidebar({ currentPage, setPage }) {
  var { userData, logout } = useAuth();
  var isAdmin = userData?.role === 'admin';

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>{APP_NAME}</h2>
        <span>{APP_SUBTITLE}</span>
      </div>
      <nav className="sidebar-nav">
        <button className={currentPage === 'evaluate' ? 'active' : ''}
          onClick={function() { setPage('evaluate'); }}>
          <span className="icon">📝</span> Vyhodnotit test
        </button>
        {isAdmin && (
          <>
            <button className={currentPage === 'users' ? 'active' : ''}
              onClick={function() { setPage('users'); }}>
              <span className="icon">👥</span> Správa uživatelů
            </button>
            <button className={currentPage === 'tests' ? 'active' : ''}
              onClick={function() { setPage('tests'); }}>
              <span className="icon">📋</span> Správa testů
            </button>
            <button className={currentPage === 'groups' ? 'active' : ''}
              onClick={function() { setPage('groups'); }}>
              <span className="icon">🏷️</span> Skupiny
            </button>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <strong>{userData?.name || userData?.email}</strong>
          {isAdmin ? 'Administrátor' : 'Učitel'}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={logout} style={{width:'100%'}}>
          Odhlásit se
        </button>
      </div>
    </div>
  );
}