// ═══════════════════════════════════════════════════════════════
// MOCK FIREBASE — simuluje Auth + Firestore v paměti
// Pro lokální testování bez internetu.
// Přihlášení: admin@test.cz / admin1 nebo ucitel@test.cz / ucitel1
// ═══════════════════════════════════════════════════════════════

(function() {

  // ─── Data v paměti ───
  var collections = {
    users: {
      "admin-uid-001": {
        email: "admin@test.cz",
        name: "Admin Testovací",
        role: "admin",
        createdAt: new Date()
      },
      "teacher-uid-001": {
        email: "ucitel@test.cz",
        name: "Jan Učitel",
        role: "teacher",
        createdAt: new Date()
      }
    },
    tests: {},
    groups: {}
  };

  var passwords = {
    "admin@test.cz": { password: "admin1", uid: "admin-uid-001" },
    "ucitel@test.cz": { password: "ucitel1", uid: "teacher-uid-001" }
  };

  var idCounter = 1000;
  function nextId() { return "mock-" + (++idCounter); }

  // ─── Firestore Document ───
  function makeDoc(id, data) {
    return {
      id: id,
      exists: data !== undefined && data !== null,
      data: function() { return data ? JSON.parse(JSON.stringify(data)) : undefined; }
    };
  }

  // ─── Firestore Query ───
  function FakeQuery(colName) {
    this._col = colName;
    this._filters = [];
  }

  FakeQuery.prototype.where = function(field, op, value) {
    var q = new FakeQuery(this._col);
    q._filters = this._filters.concat([{ field: field, op: op, value: value }]);
    return q;
  };

  FakeQuery.prototype.orderBy = function() {
    var q = new FakeQuery(this._col);
    q._filters = this._filters.slice();
    return q;
  };

  FakeQuery.prototype.get = function() {
    var col = collections[this._col] || {};
    var filters = this._filters;
    var docs = [];
    Object.keys(col).forEach(function(id) {
      var d = col[id];
      var pass = filters.every(function(f) {
        var val = d[f.field];
        if (f.op === '==') return val === f.value;
        if (f.op === 'array-contains') return Array.isArray(val) && val.indexOf(f.value) !== -1;
        return true;
      });
      if (pass) docs.push(makeDoc(id, d));
    });
    return Promise.resolve({ docs: docs });
  };

  FakeQuery.prototype.doc = function(id) {
    var colName = this._col;
    return {
      get: function() {
        var data = (collections[colName] || {})[id];
        return Promise.resolve(makeDoc(id, data));
      },
      set: function(data) {
        if (!collections[colName]) collections[colName] = {};
        collections[colName][id] = JSON.parse(JSON.stringify(data));
        return Promise.resolve();
      },
      delete: function() {
        if (collections[colName]) delete collections[colName][id];
        return Promise.resolve();
      }
    };
  };

  FakeQuery.prototype.add = function(data) {
    var id = nextId();
    if (!collections[this._col]) collections[this._col] = {};
    collections[this._col][id] = JSON.parse(JSON.stringify(data));
    return Promise.resolve({ id: id });
  };

  // ─── Firestore instance ───
  function createFirestore() {
    return {
      collection: function(name) { return new FakeQuery(name); }
    };
  }

  // ─── Auth instance ───
  var currentUser = null;
  var authListeners = [];

  function notifyAuth() {
    authListeners.forEach(function(fn) {
      try { fn(currentUser); } catch(e) { console.error(e); }
    });
  }

  function createAuth(isSecondary) {
    return {
      onAuthStateChanged: function(fn) {
        if (isSecondary) {
          setTimeout(function() { fn(null); }, 10);
          return function() {};
        }
        authListeners.push(fn);
        setTimeout(function() { fn(currentUser); }, 50);
        return function() {
          authListeners = authListeners.filter(function(f) { return f !== fn; });
        };
      },
      signInWithEmailAndPassword: function(email, pwd) {
        var entry = passwords[email];
        if (!entry) return Promise.reject({ code: 'auth/user-not-found', message: 'Účet nenalezen.' });
        if (entry.password !== pwd) return Promise.reject({ code: 'auth/wrong-password', message: 'Nesprávné heslo.' });
        currentUser = { uid: entry.uid, email: email };
        if (!isSecondary) notifyAuth();
        return Promise.resolve({ user: currentUser });
      },
      createUserWithEmailAndPassword: function(email, pwd) {
        var uid = nextId();
        passwords[email] = { password: pwd, uid: uid };
        return Promise.resolve({ user: { uid: uid, email: email } });
      },
      signOut: function() {
        if (!isSecondary) {
          currentUser = null;
          notifyAuth();
        }
        return Promise.resolve();
      }
    };
  }

  // ─── Firebase global objekt ───
  var mainAuth = createAuth(false);
  var mainFirestore = createFirestore();

  // Funkce firebase.firestore() + firebase.firestore.FieldValue
  function firestoreFn() { return mainFirestore; }
  firestoreFn.FieldValue = {
    serverTimestamp: function() { return new Date(); }
  };

  window.firebase = {
    initializeApp: function(config, name) {
      // Sekundární app (pro vytváření uživatelů)
      if (name) {
        var secAuth = createAuth(true);
        return {
          auth: function() { return secAuth; },
          delete: function() { return Promise.resolve(); }
        };
      }
      // Hlavní app
      return {};
    },
    auth: function() { return mainAuth; },
    firestore: firestoreFn
  };

  console.log("%c🔧 Mock Firebase loaded", "color: #f59e0b; font-weight: bold; font-size: 14px;");
  console.log("   Přihlášení: admin@test.cz / admin1");
  console.log("   Přihlášení: ucitel@test.cz / ucitel1");

})();