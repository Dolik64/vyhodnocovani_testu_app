// ═══════════════════════════════════════════════════════════════
// SPRÁVA UŽIVATELŮ (admin)
// ═══════════════════════════════════════════════════════════════

function UsersPage() {
  var [users, setUsers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [showModal, setShowModal] = useState(false);
  var [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'teacher' });
  var [creating, setCreating] = useState(false);
  var [error, setError] = useState('');

  var loadUsers = async function() {
    try {
      var snap = await db.collection('users').get();
      setUsers(snap.docs.map(function(d) { return { id: d.id, ...d.data() }; }));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(function() { loadUsers(); }, []);

  var createUser = async function() {
    setError('');
    setCreating(true);
    try {
      var secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary_' + Date.now());
      var cred = await secondaryApp.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
      await db.collection('users').doc(cred.user.uid).set({
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await secondaryApp.auth().signOut();
      await secondaryApp.delete();
      setShowModal(false);
      setNewUser({ email: '', password: '', name: '', role: 'teacher' });
      loadUsers();
    } catch(e) {
      setError(e.message);
    }
    setCreating(false);
  };

  var deleteUser = async function(userId) {
    if (!confirm('Opravdu smazat tohoto uživatele? (Smaže se záznam v databázi. Pro úplné smazání Auth účtu použijte Firebase Console.)')) return;
    try {
      await db.collection('users').doc(userId).delete();
      loadUsers();
    } catch(e) { console.error(e); }
  };

  if (loading) return <div style={{padding:'40px', color:'var(--text-muted)'}}>Načítání uživatelů…</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Správa uživatelů</h1>
        <p>Přidávejte a spravujte učitele, kteří mohou vyhodnocovat testy.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Uživatelé ({users.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={function() { setShowModal(true); }}>
            + Přidat uživatele
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Jméno</th>
              <th>Email</th>
              <th>Role</th>
              <th style={{width:'100px'}}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(function(u) { return (
              <tr key={u.id}>
                <td style={{fontWeight:600}}>{u.name || '—'}</td>
                <td>{u.email}</td>
                <td>
                  <span className={'badge ' + (u.role === 'admin' ? 'badge-admin' : 'badge-teacher')}>
                    {u.role === 'admin' ? 'Admin' : 'Učitel'}
                  </span>
                </td>
                <td>
                  {u.role !== 'admin' && (
                    <button className="btn btn-danger btn-sm" onClick={function() { deleteUser(u.id); }}>
                      Smazat
                    </button>
                  )}
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={function(e) { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal fade-in">
            <h2>Nový uživatel</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Jméno</label>
              <input className="form-input" placeholder="Jan Novák"
                value={newUser.name} onChange={function(e) { setNewUser({...newUser, name: e.target.value}); }} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" placeholder="jan@skola.cz"
                value={newUser.email} onChange={function(e) { setNewUser({...newUser, email: e.target.value}); }} />
            </div>
            <div className="form-group">
              <label>Heslo</label>
              <input className="form-input" type="text" placeholder="min. 6 znaků"
                value={newUser.password} onChange={function(e) { setNewUser({...newUser, password: e.target.value}); }} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={newUser.role}
                onChange={function(e) { setNewUser({...newUser, role: e.target.value}); }}>
                <option value="teacher">Učitel</option>
                <option value="admin">Administrátor</option>
              </select>
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'24px'}}>
              <button className="btn btn-secondary" onClick={function() { setShowModal(false); }} style={{flex:1}}>
                Zrušit
              </button>
              <button className="btn btn-primary" onClick={createUser}
                disabled={creating || !newUser.email || !newUser.password}
                style={{flex:1, width:'auto'}}>
                {creating ? 'Vytvářím…' : 'Vytvořit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}