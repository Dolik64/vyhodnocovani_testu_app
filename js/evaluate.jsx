// ═══════════════════════════════════════════════════════════════
// VYHODNOCENÍ TESTU — hlavní stránka pro učitele
// ═══════════════════════════════════════════════════════════════

function EvaluatePage() {
  var { userData } = useAuth();
  var [tests, setTests] = useState([]);
  var [selectedTestId, setSelectedTestId] = useState('');
  var [selectedTest, setSelectedTest] = useState(null);
  var [loading, setLoading] = useState(true);
  var [studentName, setStudentName] = useState('');
  var [markings, setMarkings] = useState({});
  var [showResults, setShowResults] = useState(false);

  useEffect(function() {
    var loadTests = async function() {
      try {
        if (userData.role === 'teacher') {
          var gSnap = await db.collection('groups').where('userIds', 'array-contains', userData.uid).get();
          var testIds = new Set();
          gSnap.docs.forEach(function(d) { (d.data().testIds || []).forEach(function(tid) { testIds.add(tid); }); });

          if (testIds.size > 0) {
            var tSnap = await db.collection('tests').get();
            setTests(tSnap.docs.filter(function(d) { return testIds.has(d.id); }).map(function(d) { return { id: d.id, ...d.data() }; }));
          } else {
            var tSnap = await db.collection('tests').get();
            setTests(tSnap.docs.map(function(d) { return { id: d.id, ...d.data() }; }));
          }
        } else {
          var tSnap = await db.collection('tests').get();
          setTests(tSnap.docs.map(function(d) { return { id: d.id, ...d.data() }; }));
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    loadTests();
  }, [userData]);

  var handleSelectTest = function(testId) {
    setSelectedTestId(testId);
    var test = tests.find(function(t) { return t.id === testId; });
    setSelectedTest(test || null);
    setMarkings({});
    setShowResults(false);
    setStudentName('');
  };

  var handleMark = function(taskId, value) {
    setMarkings(function(prev) {
      var next = { ...prev };
      next[taskId] = prev[taskId] === value ? undefined : value;
      return next;
    });
    setShowResults(false);
  };

  var answeredCount = Object.values(markings).filter(function(v) { return v !== undefined; }).length;
  var totalTasks = ALL_TASK_IDS.length;

  var evaluate = function() {
    setShowResults(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  var resetForm = function() {
    setMarkings({});
    setShowResults(false);
    setStudentName('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Výpočet výsledků
  var results = useMemo(function() {
    if (!selectedTest || !showResults) return null;
    var answers = selectedTest.answers;
    var earned = 0, maxPts = 0, correct = 0, wrong = 0, unanswered = 0;

    ALL_TASK_IDS.forEach(function(id) {
      var taskDef = answers[id];
      if (!taskDef) return;
      maxPts += taskDef.points || 0;
      var m = markings[id];

      if (m === undefined) { unanswered++; return; }

      var type = getTaskType(id);
      if (type === 'open' || type === 'geometry') {
        if (m === true) { earned += taskDef.points; correct++; }
        else { wrong++; }
      } else {
        if (m === taskDef.answer) { earned += taskDef.points; correct++; }
        else { wrong++; }
      }
    });

    return { earned: earned, maxPts: maxPts, correct: correct, wrong: wrong, unanswered: unanswered,
      pct: maxPts > 0 ? Math.round((earned / maxPts) * 100) : 0 };
  }, [selectedTest, markings, showResults]);

  if (loading) return <div style={{padding:'40px', color:'var(--text-muted)'}}>Načítání testů…</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Vyhodnotit test</h1>
        <p>Vyberte test, zadejte odpovědi žáka a nechte aplikaci spočítat body.</p>
      </div>

      <div className="card">
        <div className="form-group" style={{marginBottom:0}}>
          <label>Vyberte test</label>
          <select className="form-select" value={selectedTestId}
            onChange={function(e) { handleSelectTest(e.target.value); }}>
            <option value="">— Vyberte test —</option>
            {tests.map(function(t) { return (
              <option key={t.id} value={t.id}>{t.name}</option>
            ); })}
          </select>
        </div>
      </div>

      {selectedTest && (
        <div className="sheet-container">
          <div className="sheet-header">
            <div className="test-name">{selectedTest.name}</div>
            <div className="student-name-input">
              <label>Jméno a příjmení žáka:</label>
              <input className="form-input" placeholder="Karel Novotný"
                value={studentName} onChange={function(e) { setStudentName(e.target.value); }} style={{flex:1}} />
            </div>
          </div>

          {SHEET_LAYOUT.map(function(section, si) { return (
            <div className="sheet-section" key={si}>
              <div className="sheet-section-label">{section.label}</div>
              {section.rows.map(function(row, ri) { return (
                <div className={'sheet-row cols-' + row.cols} key={ri}>
                  {row.tasks.map(function(taskId) {
                    var type = getTaskType(taskId);
                    var taskDef = selectedTest.answers[taskId] || {};

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
              ); })}
            </div>
          ); })}

          {showResults && results && (
            <div className="results-panel fade-in">
              <h2>Výsledky {studentName ? '— ' + studentName : ''}</h2>
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

          <div className="evaluate-bar">
            <div className="progress">
              Vyplněno: <strong>{answeredCount} / {totalTasks}</strong> úloh
            </div>
            <div style={{display:'flex', gap:'10px'}}>
              {showResults && (
                <button className="btn btn-secondary" onClick={resetForm}>Nový žák</button>
              )}
              <button className="btn-evaluate" onClick={evaluate} disabled={answeredCount === 0}>
                {showResults ? 'Přepočítat' : 'Vyhodnotit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}