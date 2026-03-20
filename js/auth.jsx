// ═══════════════════════════════════════════════════════════════
// PŘIHLÁŠENÍ — AuthProvider + LoginScreen
// ═══════════════════════════════════════════════════════════════

function AuthProvider({ children }) {
  var [user, setUser] = useState(undefined);
  var [userData, setUserData] = useState(null);

  useEffect(function() {
    var unsub = auth.onAuthStateChanged(async function(fbUser) {
      if (fbUser) {
        try {
          var doc = await db.collection('users').doc(fbUser.uid).get();
          if (doc.exists) {
            setUserData({ uid: fbUser.uid, email: fbUser.email, ...doc.data() });
            setUser(fbUser);
          } else {
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

  var logout = useCallback(function() { return auth.signOut(); }, []);

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

function LoginScreen() {
  var [email, setEmail] = useState('');
  var [password, setPassword] = useState('');
  var [error, setError] = useState('');
  var [loading, setLoading] = useState(false);

  var handleLogin = async function(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch(err) {
      var msgs = {
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
            <input className="form-input" type="email" placeholder="vas@email.cz"
              value={email} onChange={function(e) { setEmail(e.target.value); }}
              required autoFocus />
          </div>
          <div className="form-group">
            <label>Heslo</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={password} onChange={function(e) { setPassword(e.target.value); }}
              required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Přihlašování…' : 'Přihlásit se'}
          </button>
        </form>
      </div>
    </div>
  );
}