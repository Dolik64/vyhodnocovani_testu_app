// ═══════════════════════════════════════════════════════════════
// BUŇKY ÚLOH — komponenty pro jednotlivé typy úloh v archu
// ═══════════════════════════════════════════════════════════════

// Otevřená odpověď (1.1–6.3, 13.x, 14.x)
function OpenTaskCell({ taskId, answer, points, marking, onMark }) {
  var cellClass = marking === true ? 'marked-correct' : marking === false ? 'marked-wrong' : '';
  return (
    <div className={'task-cell ' + cellClass}>
      <div className="task-id">
        <span>{taskId}</span>
        <span className="task-points">{points} b</span>
      </div>
      <div className="task-answer">{answer}</div>
      <div className="task-actions">
        <button className={'mark-btn correct-btn ' + (marking === true ? 'selected' : '')}
          onClick={function() { onMark(taskId, true); }}>✓ Správně</button>
        <button className={'mark-btn wrong-btn ' + (marking === false ? 'selected' : '')}
          onClick={function() { onMark(taskId, false); }}>✗ Špatně</button>
      </div>
    </div>
  );
}

// Geometrie (úloha 7)
function GeometryTaskCell({ taskId, points, marking, onMark }) {
  var cellClass = marking === true ? 'marked-correct' : marking === false ? 'marked-wrong' : '';
  return (
    <div className={'task-cell ' + cellClass}>
      <div className="task-id">
        <span>{taskId} — Geometrie (rýsování)</span>
        <span className="task-points">{points} b</span>
      </div>
      <div className="geo-grid">
        <button className={'geo-btn correct-btn ' + (marking === true ? 'selected' : '')}
          onClick={function() { onMark(taskId, true); }}>✓ Udělal/a</button>
        <button className={'geo-btn wrong-btn ' + (marking === false ? 'selected' : '')}
          onClick={function() { onMark(taskId, false); }}>✗ Neudělal/a</button>
      </div>
    </div>
  );
}

// Ano / Ne (8.1–8.3)
function YNTaskCell({ taskId, correctAnswer, points, selection, onSelect }) {
  var isAnswered = selection !== undefined;
  var isCorrect = isAnswered && selection === correctAnswer;
  return (
    <div className={'task-cell ' + (isAnswered ? (isCorrect ? 'marked-correct' : 'marked-wrong') : '')}>
      <div className="task-id">
        <span>{taskId}</span>
        <span className="task-points">{points} b</span>
      </div>
      <div className="yn-grid">
        {['A', 'N'].map(function(opt) { return (
          <button key={opt}
            className={'yn-btn ' + (selection === opt ? 'selected ' : '') + (selection === opt ? (isCorrect ? 'is-correct' : 'is-wrong') : '')}
            onClick={function() { onSelect(taskId, opt); }}>
            {opt === 'A' ? 'Ano' : 'Ne'}
          </button>
        ); })}
      </div>
    </div>
  );
}

// ABCDE výběr (9–12)
function ABCDETaskCell({ taskId, correctAnswer, points, selection, onSelect }) {
  var isAnswered = selection !== undefined;
  var isCorrect = isAnswered && selection === correctAnswer;
  return (
    <div className={'task-cell ' + (isAnswered ? (isCorrect ? 'marked-correct' : 'marked-wrong') : '')}>
      <div className="task-id">
        <span>{taskId}</span>
        <span className="task-points">{points} b</span>
      </div>
      <div className="abcde-grid">
        {['A', 'B', 'C', 'D', 'E'].map(function(opt) { return (
          <button key={opt}
            className={'abcde-btn ' + (selection === opt ? 'selected ' : '') + (selection === opt ? (isCorrect ? 'is-correct' : 'is-wrong') : '')}
            onClick={function() { onSelect(taskId, opt); }}>
            {opt}
          </button>
        ); })}
      </div>
    </div>
  );
}