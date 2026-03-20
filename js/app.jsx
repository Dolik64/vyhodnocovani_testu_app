const { useState, useEffect, useCallback, useMemo, createContext, useContext } = React;


// Initialize Firebase (config loaded from config.js)
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const doc = await db.collection('users').doc(fbUser.uid).get();
          if (doc.exists) {
            setUserData({ uid: fbUser.uid, email: fbUser.email, ...doc.data() });
            setUser(fbUser);
          } else {
            // User exists in auth but not in Firestore — deny access
            await auth.signOut();
            setUser(null);
            setUserData(null);
          }
        } catch(e) {
          console.error("Error loading user data:", e);
          setUser(null);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
    });
    return unsub;
  }, []);

  const logout = useCallback(() => auth.signOut(), []);

  if (user === undefined) {
    return <div className="loading-spinner">Načítání…</div>;
  }

  return (
    <AuthContext.Provider value={{ user, userData, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() { return useContext(AuthContext); }

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch(err) {
      const msgs = {
        'auth/user-not-found': 'Účet nenalezen.',
        'auth/wrong-password': 'Nesprávné heslo.',
        'auth/invalid-email': 'Neplatný email.',
        'auth/too-many-requests': 'Příliš mnoho pokusů. Zkuste později.',
      };
      setError(msgs[err.code] || 'Chyba přihlášení: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card fade-in">
        <div className="login-logo">
          <h1>{APP_NAME}</h1>
          <p>{LOGIN_SUBTITLE}</p>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="vas@email.cz"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Heslo</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Přihlašování…' : 'Přihlásit se'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════
function Sidebar({ currentPage, setPage }) {
  const { userData, logout } = useAuth();
  const isAdmin = userData?.role === 'admin';

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>{APP_NAME}</h2>
        <span>{APP_SUBTITLE}</span>
      </div>
      <nav className="sidebar-nav">
        <button
          className={currentPage === 'evaluate' ? 'active' : ''}
          onClick={() => setPage('evaluate')}
        >
          <span className="icon">📝</span> Vyhodnotit test
        </button>
        {isAdmin && (
          <>
            <button
              className={currentPage === 'users' ? 'active' : ''}
              onClick={() => setPage('users')}
            >
              <span className="icon">👥</span> Správa uživatelů
            </button>
            <button
              className={currentPage === 'tests' ? 'active' : ''}
              onClick={() => setPage('tests')}
            >
              <span className="icon">📋</span> Správa testů
            </button>
            <button
              className={currentPage === 'groups' ? 'active' : ''}
              onClick={() => setPage('groups')}
            >
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

// ═══════════════════════════════════════════════════════════════
// ADMIN: USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'teacher' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const snap = await db.collection('users').get();
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    setError('');
    setCreating(true);
    try {
      // Create auth user via a secondary app to not log out current admin
      const secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary_' + Date.now());
      const cred = await secondaryApp.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
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

  const deleteUser = async (userId) => {
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
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
            {users.map(u => (
              <tr key={u.id}>
                <td style={{fontWeight:600}}>{u.name || '—'}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-teacher'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Učitel'}
                  </span>
                </td>
                <td>
                  {u.role !== 'admin' && (
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>
                      Smazat
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal fade-in">
            <h2>Nový uživatel</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Jméno</label>
              <input className="form-input" placeholder="Jan Novák"
                value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" placeholder="jan@skola.cz"
                value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Heslo</label>
              <input className="form-input" type="text" placeholder="min. 6 znaků"
                value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="teacher">Učitel</option>
                <option value="admin">Administrátor</option>
              </select>
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'24px'}}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{flex:1}}>
                Zrušit
              </button>
              <button className="btn btn-primary" onClick={createUser} disabled={creating || !newUser.email || !newUser.password}
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

// ═══════════════════════════════════════════════════════════════
// ADMIN: TEST MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function TestsPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [testName, setTestName] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTests = async () => {
    try {
      const snap = await db.collection('tests').orderBy('createdAt', 'desc').get();
      setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadTests(); }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setTestName(data.name || file.name.replace('.json', ''));
        setJsonText(JSON.stringify(data.answers || data, null, 2));
      } catch(err) {
        setError('Neplatný JSON soubor.');
      }
    };
    reader.readAsText(file);
  };

  const saveTest = async () => {
    setError('');
    setSaving(true);
    try {
      const answers = JSON.parse(jsonText);
      // Validate that all task IDs exist
      const missing = ALL_TASK_IDS.filter(id => !answers[id]);
      if (missing.length > 0) {
        setError(`Chybí odpovědi pro úlohy: ${missing.join(', ')}`);
        setSaving(false);
        return;
      }
      await db.collection('tests').add({
        name: testName,
        answers: answers,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setShowModal(false);
      setTestName('');
      setJsonText('');
      loadTests();
    } catch(e) {
      setError('Chyba JSON: ' + e.message);
    }
    setSaving(false);
  };

  const deleteTest = async (id) => {
    if (!confirm('Opravdu smazat tento test?')) return;
    await db.collection('tests').doc(id).delete();
    loadTests();
  };

  if (loading) return <div style={{padding:'40px', color:'var(--text-muted)'}}>Načítání testů…</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Správa testů</h1>
        <p>Nahrávejte JSON soubory se správnými odpověďmi a bodováním.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Testy ({tests.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + Přidat test
          </button>
        </div>
        {tests.length === 0 ? (
          <p style={{color:'var(--text-muted)', padding:'20px 0'}}>Zatím žádné testy. Přidejte první test.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Název testu</th>
                <th>Počet úloh</th>
                <th>Max bodů</th>
                <th style={{width:'100px'}}></th>
              </tr>
            </thead>
            <tbody>
              {tests.map(t => {
                const maxPts = Object.values(t.answers || {}).reduce((s, a) => s + (a.points || 0), 0);
                return (
                  <tr key={t.id}>
                    <td style={{fontWeight:600}}>{t.name}</td>
                    <td>{Object.keys(t.answers || {}).length}</td>
                    <td><strong>{maxPts} b</strong></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteTest(t.id)}>Smazat</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal fade-in" style={{maxWidth:'600px'}}>
            <h2>Nahrát nový test</h2>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Nahrát JSON soubor</label>
              <div className="file-upload-zone" onClick={() => document.getElementById('jsonUpload').click()}>
                <input id="jsonUpload" type="file" accept=".json" onChange={handleFileUpload} />
                <p style={{color:'var(--text-muted)'}}>📁 Klikněte pro výběr JSON souboru</p>
              </div>
            </div>

            <div className="form-group">
              <label>Název testu</label>
              <input className="form-input" placeholder="Matematika 5 – Varianta A"
                value={testName} onChange={e => setTestName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Odpovědi (JSON) — nebo vložte ručně</label>
              <textarea className="json-textarea" placeholder='{"1.1": {"answer": "42", "points": 2}, ...}'
                value={jsonText} onChange={e => setJsonText(e.target.value)} />
            </div>

            <div style={{display:'flex', gap:'10px', marginTop:'24px'}}>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setError(''); }} style={{flex:1}}>
                Zrušit
              </button>
              <button className="btn btn-primary" onClick={saveTest}
                disabled={saving || !testName || !jsonText} style={{flex:1, width:'auto'}}>
                {saving ? 'Ukládám…' : 'Uložit test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN: GROUPS
// ═══════════════════════════════════════════════════════════════
function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);

  useEffect(() => {
    Promise.all([
      db.collection('groups').get(),
      db.collection('users').where('role', '==', 'teacher').get(),
      db.collection('tests').get(),
    ]).then(([gSnap, uSnap, tSnap]) => {
      setGroups(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTests(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const saveGroup = async () => {
    await db.collection('groups').add({
      name: groupName,
      userIds: selectedUsers,
      testIds: selectedTests,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setShowModal(false);
    setGroupName('');
    setSelectedUsers([]);
    setSelectedTests([]);
    const snap = await db.collection('groups').get();
    setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const deleteGroup = async (id) => {
    if (!confirm('Smazat skupinu?')) return;
    await db.collection('groups').doc(id).delete();
    setGroups(groups.filter(g => g.id !== id));
  };

  const toggleItem = (arr, setArr, item) => {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  if (loading) return <div style={{padding:'40px', color:'var(--text-muted)'}}>Načítání…</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Skupiny</h1>
        <p>Přiřaďte učitelům konkrétní testy skrze skupiny.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Skupiny ({groups.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + Nová skupina
          </button>
        </div>
        {groups.length === 0 ? (
          <p style={{color:'var(--text-muted)', padding:'20px 0'}}>Zatím žádné skupiny.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Název</th><th>Učitelé</th><th>Testy</th><th style={{width:'100px'}}></th></tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id}>
                  <td style={{fontWeight:600}}>{g.name}</td>
                  <td>{(g.userIds || []).length} učitelů</td>
                  <td>{(g.testIds || []).length} testů</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteGroup(g.id)}>Smazat</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal fade-in">
            <h2>Nová skupina</h2>
            <div className="form-group">
              <label>Název skupiny</label>
              <input className="form-input" placeholder="5. ročník – sada A"
                value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Učitelé</label>
              {users.map(u => (
                <label key={u.id} style={{display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', cursor:'pointer', fontSize:'14px'}}>
                  <input type="checkbox" checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleItem(selectedUsers, setSelectedUsers, u.id)} />
                  {u.name || u.email}
                </label>
              ))}
              {users.length === 0 && <p style={{color:'var(--text-muted)', fontSize:'13px'}}>Žádní učitelé.</p>}
            </div>
            <div className="form-group">
              <label>Testy</label>
              {tests.map(t => (
                <label key={t.id} style={{display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', cursor:'pointer', fontSize:'14px'}}>
                  <input type="checkbox" checked={selectedTests.includes(t.id)}
                    onChange={() => toggleItem(selectedTests, setSelectedTests, t.id)} />
                  {t.name}
                </label>
              ))}
              {tests.length === 0 && <p style={{color:'var(--text-muted)', fontSize:'13px'}}>Žádné testy.</p>}
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'24px'}}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{flex:1}}>Zrušit</button>
              <button className="btn btn-primary" onClick={saveGroup} disabled={!groupName} style={{flex:1, width:'auto'}}>Uložit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TASK CELL COMPONENTS
// ═══════════════════════════════════════════════════════════════

function OpenTaskCell({ taskId, answer, points, marking, onMark }) {
  const cellClass = marking === true ? 'marked-correct' : marking === false ? 'marked-wrong' : '';
  return (
    <div className={`task-cell ${cellClass}`}>
      <div className="task-id">
        <span>{taskId}</span>
        <span className="task-points">{points} b</span>
      </div>
      <div className="task-answer">{answer}</div>
      <div className="task-actions">
        <button className={`mark-btn correct-btn ${marking === true ? 'selected' : ''}`}
          onClick={() => onMark(taskId, true)}>✓ Správně</button>
        <button className={`mark-btn wrong-btn ${marking === false ? 'selected' : ''}`}
          onClick={() => onMark(taskId, false)}>✗ Špatně</button>
      </div>
    </div>
  );
}

function GeometryTaskCell({ taskId, points, marking, onMark }) {
  const cellClass = marking === true ? 'marked-correct' : marking === false ? 'marked-wrong' : '';
  return (
    <div className={`task-cell ${cellClass}`}>
      <div className="task-id">
        <span>{taskId} — Geometrie (rýsování)</span>
        <span className="task-points">{points} b</span>
      </div>
      <div className="geo-grid">
        <button className={`geo-btn correct-btn ${marking === true ? 'selected' : ''}`}
          onClick={() => onMark(taskId, true)}>✓ Udělal/a</button>
        <button className={`geo-btn wrong-btn ${marking === false ? 'selected' : ''}`}
          onClick={() => onMark(taskId, false)}>✗ Neudělal/a</button>
      </div>
    </div>
  );
}

function YNTaskCell({ taskId, correctAnswer, points, selection, onSelect }) {
  const isAnswered = selection !== undefined;
  const isCorrect = isAnswered && selection === correctAnswer;
  return (
    <div className={`task-cell ${isAnswered ? (isCorrect ? 'marked-correct' : 'marked-wrong') : ''}`}>
      <div className="task-id">
        <span>{taskId}</span>
        <span className="task-points">{points} b</span>
      </div>
      <div className="yn-grid">
        {['A', 'N'].map(opt => (
          <button key={opt}
            className={`yn-btn ${selection === opt ? 'selected' : ''} ${selection === opt ? (isCorrect ? 'is-correct' : 'is-wrong') : ''}`}
            onClick={() => onSelect(taskId, opt)}>
            {opt === 'A' ? 'Ano' : 'Ne'}
          </button>
        ))}
      </div>
    </div>
  );
}

function ABCDETaskCell({ taskId, correctAnswer, points, selection, onSelect }) {
  const isAnswered = selection !== undefined;
  const isCorrect = isAnswered && selection === correctAnswer;
  return (
    <div className={`task-cell ${isAnswered ? (isCorrect ? 'marked-correct' : 'marked-wrong') : ''}`}>
      <div className="task-id">
        <span>{taskId}</span>
        <span className="task-points">{points} b</span>
      </div>
      <div className="abcde-grid">
        {['A', 'B', 'C', 'D', 'E'].map(opt => (
          <button key={opt}
            className={`abcde-btn ${selection === opt ? 'selected' : ''} ${selection === opt ? (isCorrect ? 'is-correct' : 'is-wrong') : ''}`}
            onClick={() => onSelect(taskId, opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EVALUATION PAGE
// ═══════════════════════════════════════════════════════════════
function EvaluatePage() {
  const { userData } = useAuth();
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');

  // Markings: { "1.1": true/false, "8.1": "A"/"N", "9": "C", ... }
  const [markings, setMarkings] = useState({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const loadTests = async () => {
      try {
        // If user is teacher, load tests from their groups
        if (userData.role === 'teacher') {
          const gSnap = await db.collection('groups').where('userIds', 'array-contains', userData.uid).get();
          const testIds = new Set();
          gSnap.docs.forEach(d => (d.data().testIds || []).forEach(tid => testIds.add(tid)));

          if (testIds.size > 0) {
            const tSnap = await db.collection('tests').get();
            setTests(tSnap.docs.filter(d => testIds.has(d.id)).map(d => ({ id: d.id, ...d.data() })));
          } else {
            // No groups assigned — show all tests as fallback
            const tSnap = await db.collection('tests').get();
            setTests(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        } else {
          // Admin sees all
          const tSnap = await db.collection('tests').get();
          setTests(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    loadTests();
  }, [userData]);

  const handleSelectTest = (testId) => {
    setSelectedTestId(testId);
    const test = tests.find(t => t.id === testId);
    setSelectedTest(test || null);
    setMarkings({});
    setShowResults(false);
    setStudentName('');
  };

  const handleMark = (taskId, value) => {
    setMarkings(prev => ({ ...prev, [taskId]: prev[taskId] === value ? undefined : value }));
    setShowResults(false);
  };

  const answeredCount = Object.values(markings).filter(v => v !== undefined).length;
  const totalTasks = ALL_TASK_IDS.length;

  const evaluate = () => {
    setShowResults(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const resetForm = () => {
    setMarkings({});
    setShowResults(false);
    setStudentName('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate results
  const results = useMemo(() => {
    if (!selectedTest || !showResults) return null;
    const answers = selectedTest.answers;
    let earned = 0;
    let maxPts = 0;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    ALL_TASK_IDS.forEach(id => {
      const taskDef = answers[id];
      if (!taskDef) return;
      maxPts += taskDef.points || 0;
      const m = markings[id];

      if (m === undefined) {
        unanswered++;
        return;
      }

      const type = getTaskType(id);
      if (type === 'open' || type === 'geometry') {
        if (m === true) { earned += taskDef.points; correct++; }
        else { wrong++; }
      } else {
        // yn or abcde — compare selection
        if (m === taskDef.answer) { earned += taskDef.points; correct++; }
        else { wrong++; }
      }
    });

    return { earned, maxPts, correct, wrong, unanswered, pct: maxPts > 0 ? Math.round((earned / maxPts) * 100) : 0 };
  }, [selectedTest, markings, showResults]);

  if (loading) return <div style={{padding:'40px', color:'var(--text-muted)'}}>Načítání testů…</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Vyhodnotit test</h1>
        <p>Vyberte test, zadejte odpovědi žáka a nechte aplikaci spočítat body.</p>
      </div>

      {/* Test selection */}
      <div className="card">
        <div className="form-group" style={{marginBottom:0}}>
          <label>Vyberte test</label>
          <select className="form-select" value={selectedTestId} onChange={e => handleSelectTest(e.target.value)}>
            <option value="">— Vyberte test —</option>
            {tests.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Answer sheet */}
      {selectedTest && (
        <div className="sheet-container">
          <div className="sheet-header">
            <div className="test-name">{selectedTest.name}</div>
            <div className="student-name-input">
              <label>Jméno a příjmení žáka:</label>
              <input className="form-input" placeholder="Karel Novotný"
                value={studentName} onChange={e => setStudentName(e.target.value)} style={{flex:1}} />
            </div>
          </div>

          {SHEET_LAYOUT.map((section, si) => (
            <div className="sheet-section" key={si}>
              <div className="sheet-section-label">{section.label}</div>
              {section.rows.map((row, ri) => (
                <div className={`sheet-row cols-${row.cols}`} key={ri}>
                  {row.tasks.map(taskId => {
                    const type = getTaskType(taskId);
                    const taskDef = selectedTest.answers[taskId] || {};

                    if (type === 'open') {
                      return <OpenTaskCell key={taskId} taskId={taskId}
                        answer={taskDef.answer} points={taskDef.points || 0}
                        marking={markings[taskId]} onMark={handleMark} />;
                    }
                    if (type === 'geometry') {
                      return <GeometryTaskCell key={taskId} taskId={taskId}
                        points={taskDef.points || 0}
                        marking={markings[taskId]} onMark={handleMark} />;
                    }
                    if (type === 'yn') {
                      return <YNTaskCell key={taskId} taskId={taskId}
                        correctAnswer={taskDef.answer} points={taskDef.points || 0}
                        selection={markings[taskId]} onSelect={handleMark} />;
                    }
                    if (type === 'abcde') {
                      return <ABCDETaskCell key={taskId} taskId={taskId}
                        correctAnswer={taskDef.answer} points={taskDef.points || 0}
                        selection={markings[taskId]} onSelect={handleMark} />;
                    }
                    return null;
                  })}
                </div>
              ))}
            </div>
          ))}

          {/* Results */}
          {showResults && results && (
            <div className="results-panel fade-in">
              <h2>
                Výsledky {studentName ? `— ${studentName}` : ''}
              </h2>
              <div className="results-score">
                {results.earned} <span>/ {results.maxPts} bodů ({results.pct} %)</span>
              </div>
              <div className="results-bar">
                <div className="results-bar-fill" style={{
                  width: results.pct + '%',
                  background: results.pct >= 70 ? 'var(--correct)' : results.pct >= 40 ? '#f59e0b' : 'var(--wrong)'
                }} />
              </div>
              <div className="results-details">
                <div className="results-stat">
                  <div className="val" style={{color:'var(--correct)'}}>{results.correct}</div>
                  <div className="label">Správně</div>
                </div>
                <div className="results-stat">
                  <div className="val" style={{color:'var(--wrong)'}}>{results.wrong}</div>
                  <div className="label">Špatně</div>
                </div>
                <div className="results-stat">
                  <div className="val">{results.unanswered}</div>
                  <div className="label">Nehodnoceno</div>
                </div>
              </div>
            </div>
          )}

          {/* Evaluate bar */}
          <div className="evaluate-bar">
            <div className="progress">
              Vyplněno: <strong>{answeredCount} / {totalTasks}</strong> úloh
            </div>
            <div style={{display:'flex', gap:'10px'}}>
              {showResults && (
                <button className="btn btn-secondary" onClick={resetForm}>
                  Nový žák
                </button>
              )}
              <button className="btn-evaluate" onClick={evaluate}
                disabled={answeredCount === 0}>
                {showResults ? 'Přepočítat' : 'Vyhodnotit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
function AppContent() {
  const { user, userData } = useAuth();
  const [page, setPage] = useState('evaluate');

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