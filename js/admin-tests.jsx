// ═══════════════════════════════════════════════════════════════
// SPRÁVA TESTŮ (admin)
// ═══════════════════════════════════════════════════════════════

function TestsPage() {
  var [tests, setTests] = useState([]);
  var [loading, setLoading] = useState(true);
  var [showModal, setShowModal] = useState(false);
  var [testName, setTestName] = useState('');
  var [jsonText, setJsonText] = useState('');
  var [error, setError] = useState('');
  var [saving, setSaving] = useState(false);

  var loadTests = async function() {
    try {
      var snap = await db.collection('tests').orderBy('createdAt', 'desc').get();
      setTests(snap.docs.map(function(d) { return { id: d.id, ...d.data() }; }));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(function() { loadTests(); }, []);

  var handleFileUpload = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        setTestName(data.name || file.name.replace('.json', ''));
        setJsonText(JSON.stringify(data.answers || data, null, 2));
      } catch(err) {
        setError('Neplatný JSON soubor.');
      }
    };
    reader.readAsText(file);
  };

  var saveTest = async function() {
    setError('');
    setSaving(true);
    try {
      var answers = JSON.parse(jsonText);
      var missing = ALL_TASK_IDS.filter(function(id) { return !answers[id]; });
      if (missing.length > 0) {
        setError('Chybí odpovědi pro úlohy: ' + missing.join(', '));
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

  var deleteTest = async function(id) {
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
          <button className="btn btn-primary btn-sm" onClick={function() { setShowModal(true); }}>
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
              {tests.map(function(t) {
                var maxPts = Object.values(t.answers || {}).reduce(function(s, a) { return s + (a.points || 0); }, 0);
                return (
                  <tr key={t.id}>
                    <td style={{fontWeight:600}}>{t.name}</td>
                    <td>{Object.keys(t.answers || {}).length}</td>
                    <td><strong>{maxPts} b</strong></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={function() { deleteTest(t.id); }}>Smazat</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={function(e) { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal modal-large fade-in">
            <h2>Nahrát nový test</h2>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Nahrát JSON soubor</label>
              <div className="file-upload-zone" onClick={function() { document.getElementById('jsonUpload').click(); }}>
                <input id="jsonUpload" type="file" accept=".json" onChange={handleFileUpload} />
                <p style={{color:'var(--text-muted)'}}>📁 Klikněte pro výběr JSON souboru</p>
              </div>
            </div>

            <div className="form-group">
              <label>Název testu</label>
              <input className="form-input" placeholder="Matematika 5 – Varianta A"
                value={testName} onChange={function(e) { setTestName(e.target.value); }} />
            </div>

            <div className="form-group">
              <label>Odpovědi (JSON) — nebo vložte ručně</label>
              <textarea className="json-textarea" placeholder='{"1.1": {"answer": "42", "points": 2}, ...}'
                value={jsonText} onChange={function(e) { setJsonText(e.target.value); }} />
            </div>

            <div style={{display:'flex', gap:'10px', marginTop:'24px'}}>
              <button className="btn btn-secondary" onClick={function() { setShowModal(false); setError(''); }} style={{flex:1}}>
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