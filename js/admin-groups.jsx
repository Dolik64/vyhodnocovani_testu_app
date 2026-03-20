// ═══════════════════════════════════════════════════════════════
// SKUPINY (admin)
// ═══════════════════════════════════════════════════════════════

function GroupsPage() {
  var [groups, setGroups] = useState([]);
  var [users, setUsers] = useState([]);
  var [tests, setTests] = useState([]);
  var [loading, setLoading] = useState(true);
  var [showModal, setShowModal] = useState(false);
  var [groupName, setGroupName] = useState('');
  var [selectedUsers, setSelectedUsers] = useState([]);
  var [selectedTests, setSelectedTests] = useState([]);

  useEffect(function() {
    Promise.all([
      db.collection('groups').get(),
      db.collection('users').where('role', '==', 'teacher').get(),
      db.collection('tests').get(),
    ]).then(function(results) {
      setGroups(results[0].docs.map(function(d) { return { id: d.id, ...d.data() }; }));
      setUsers(results[1].docs.map(function(d) { return { id: d.id, ...d.data() }; }));
      setTests(results[2].docs.map(function(d) { return { id: d.id, ...d.data() }; }));
      setLoading(false);
    });
  }, []);

  var saveGroup = async function() {
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
    var snap = await db.collection('groups').get();
    setGroups(snap.docs.map(function(d) { return { id: d.id, ...d.data() }; }));
  };

  var deleteGroup = async function(id) {
    if (!confirm('Smazat skupinu?')) return;
    await db.collection('groups').doc(id).delete();
    setGroups(groups.filter(function(g) { return g.id !== id; }));
  };

  var toggleItem = function(arr, setArr, item) {
    setArr(arr.includes(item) ? arr.filter(function(i) { return i !== item; }) : [...arr, item]);
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
          <button className="btn btn-primary btn-sm" onClick={function() { setShowModal(true); }}>
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
              {groups.map(function(g) { return (
                <tr key={g.id}>
                  <td style={{fontWeight:600}}>{g.name}</td>
                  <td>{(g.userIds || []).length} učitelů</td>
                  <td>{(g.testIds || []).length} testů</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={function() { deleteGroup(g.id); }}>Smazat</button>
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={function(e) { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal fade-in">
            <h2>Nová skupina</h2>
            <div className="form-group">
              <label>Název skupiny</label>
              <input className="form-input" placeholder="5. ročník – sada A"
                value={groupName} onChange={function(e) { setGroupName(e.target.value); }} />
            </div>
            <div className="form-group">
              <label>Učitelé</label>
              {users.map(function(u) { return (
                <label key={u.id} style={{display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', cursor:'pointer', fontSize:'14px'}}>
                  <input type="checkbox" checked={selectedUsers.includes(u.id)}
                    onChange={function() { toggleItem(selectedUsers, setSelectedUsers, u.id); }} />
                  {u.name || u.email}
                </label>
              ); })}
              {users.length === 0 && <p style={{color:'var(--text-muted)', fontSize:'13px'}}>Žádní učitelé.</p>}
            </div>
            <div className="form-group">
              <label>Testy</label>
              {tests.map(function(t) { return (
                <label key={t.id} style={{display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', cursor:'pointer', fontSize:'14px'}}>
                  <input type="checkbox" checked={selectedTests.includes(t.id)}
                    onChange={function() { toggleItem(selectedTests, setSelectedTests, t.id); }} />
                  {t.name}
                </label>
              ); })}
              {tests.length === 0 && <p style={{color:'var(--text-muted)', fontSize:'13px'}}>Žádné testy.</p>}
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'24px'}}>
              <button className="btn btn-secondary" onClick={function() { setShowModal(false); }} style={{flex:1}}>Zrušit</button>
              <button className="btn btn-primary" onClick={saveGroup} disabled={!groupName} style={{flex:1, width:'auto'}}>Uložit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}