const fs = require('fs');

// --- APP.TSX ---
let appCode = fs.readFileSync('D:/adobe/src/App.tsx', 'utf8');

// 1. Remove TopBar
appCode = appCode.replace(/\/\/ ─── Top Bar ────────[^]+?\/\/ ─── Sidebar/m, '// ─── Sidebar');

// 2. Replace Sidebar
const oldSidebarRegex = /const Sidebar = \(\{ active, setActive, isDarkMode, toggleTheme \}: any\) => \{[^]+?\/\/ ─── Auth Modal/m;
const newSidebar = `const Sidebar = ({ active, setActive, user, onLogout, onLoginClick, isDarkMode, toggleTheme }: any) => {
  const topItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'site', icon: Building2, label: 'Site Analyzer' },
    { id: 'floor', icon: LayoutGrid, label: 'Floor Plans' },
    { id: 'materials', icon: Package, label: 'Materials' },
    { id: 'market', icon: Map, label: 'Masterplan' },
  ];
  const bottomItems = [
    { id: 'projects', icon: Briefcase, label: 'My Dashboard' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="builtattic-logo-sidebar" onClick={() => setActive('home')}>
          Adobe <br/><span style={{fontWeight: 400}}>Builtattic</span>
        </div>

        <div className="sidebar-search">
          <Search size={14} color="var(--text-secondary)" />
          <input type="text" placeholder="Search..." />
        </div>

        <div className="sidebar-nav-group">
          {topItems.map(item => (
            <div key={item.id} className={\`nav-item-wide \${active === item.id ? 'active' : ''}\`} onClick={() => setActive(item.id)}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="sidebar-bottom">
        <div className="sidebar-nav-group">
          {bottomItems.map(item => (
            <div key={item.id} className={\`nav-item-wide \${active === item.id ? 'active' : ''}\`} onClick={() => setActive(item.id)}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </div>
          ))}
          
          <div className="nav-item-wide" onClick={toggleTheme}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>Theme</span>
          </div>

          {user ? (
            <div className="nav-item-wide user-profile-item" onClick={onLogout}>
              <div className="profile-icon-small">{user.name.charAt(0)}</div>
              <span>Logout</span>
            </div>
          ) : (
            <div className="nav-item-wide" onClick={onLoginClick}>
              <LogIn size={18} />
              <span>Sign In</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Auth Modal`;
appCode = appCode.replace(oldSidebarRegex, newSidebar);

// 3. Remove TopBar invocation and update Sidebar invocation
appCode = appCode.replace(/<TopBar active=\{currentView\} setActive=\{setCurrentView\} user=\{user\}\s+onLogout=\{[^\}]+\}\s+onLoginClick=\{openLogin\} \/>\s*/, '');
appCode = appCode.replace(
  /<Sidebar active=\{currentView\} setActive=\{setCurrentView\} isDarkMode=\{isDarkMode\} toggleTheme=\{\(\) => setIsDarkMode\(!isDarkMode\)\} \/>/,
  `<Sidebar active={currentView} setActive={setCurrentView} user={user} onLogout={() => { localStorage.removeItem('token'); setUser(null); setMyGenerations([]); }} onLoginClick={openLogin} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />`
);

fs.writeFileSync('D:/adobe/src/App.tsx', appCode);

// --- INDEX.CSS ---
let cssCode = fs.readFileSync('D:/adobe/src/index.css', 'utf8');

// Remove .topbar blocks
cssCode = cssCode.replace(/\/\* ─── Top Bar ────────[^]+?\/\* ─── Body Layout/m, '/* ─── Body Layout');

// Update sidebar styles
const oldSidebarCssRegex = /\/\* ─── Sidebar \(Thin\) ────────[^]+?\/\* ─── Main Content/m;
const newSidebarCss = `/* ─── Sidebar (Wide) ───────────────────────────────────────────────────────── */

.sidebar {
  width: 260px;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px 20px;
  z-index: 100;
}

.builtattic-logo-sidebar {
  font-weight: 800;
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 24px;
  padding: 0 12px;
  cursor: pointer;
  line-height: 1.2;
}

.sidebar-search {
  display: flex;
  align-items: center;
  background-color: var(--bg-main);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
  margin-bottom: 24px;
}

.sidebar-search input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13px;
  width: 100%;
}

.sidebar-nav-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item-wide {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  width: 100%;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-item-wide span {
  font-size: 13px;
  font-weight: 500;
}

.nav-item-wide:hover, .nav-item-wide.active {
  background-color: var(--bg-main);
  color: var(--text-primary);
}

.profile-icon-small {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

/* ─── Main Content`;

cssCode = cssCode.replace(oldSidebarCssRegex, newSidebarCss);

fs.writeFileSync('D:/adobe/src/index.css', cssCode);
