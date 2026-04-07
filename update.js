const fs = require('fs');
let code = fs.readFileSync('D:/adobe/src/App.tsx', 'utf8');

// 1. Add Menu, Bell to lucide imports
code = code.replace(/Ruler, Compass, Download\n} from 'lucide-react';/, "Ruler, Compass, Download, Menu, Bell\n} from 'lucide-react';");

// 2. Replace Sidebar
const sidebarRegex = /\/\/ ─── Sidebar ────────[^]+?\/\/ ─── Auth Modal/m;
const newSidebar = `// ─── Top Bar ──────────────────────────────────────────────────────────────────

const TopBar = ({ active, setActive, user, onLogout, onLoginClick }: any) => {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="builtattic-logo" onClick={() => setActive('home')}>
          Adobe <span style={{fontWeight: 400}}>Builtattic</span>
        </div>
        <div className="topbar-links">
          <span className={active === 'home' ? 'active' : ''} onClick={() => setActive('home')}>Creativity & Design</span>
          <span className={active === 'site' ? 'active' : ''} onClick={() => setActive('site')}>Site Analyzer</span>
          <span className={active === 'floor' ? 'active' : ''} onClick={() => setActive('floor')}>Floor Plans</span>
          <span className={active === 'materials' ? 'active' : ''} onClick={() => setActive('materials')}>Materials</span>
          <span className={active === 'market' ? 'active' : ''} onClick={() => setActive('market')}>Masterplan</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="search-box">
          <Search size={14} color="var(--text-secondary)" />
          <input type="text" placeholder="Search Builtattic" />
        </div>
        <Bell size={18} color="var(--text-secondary)" style={{ cursor: 'pointer', margin: '0 8px' }} />
        {user ? (
          <div className="profile-icon" onClick={onLogout} title="Logout">{user.name.charAt(0)}</div>
        ) : (
          <div className="login-btn" onClick={onLoginClick}>Sign In</div>
        )}
      </div>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({ active, setActive, isDarkMode, toggleTheme }: any) => {
  const items = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'apps', icon: LayoutGrid, label: 'Apps' },
    { id: 'projects', icon: Briefcase, label: 'Projects' },
    { id: 'files', icon: FileText, label: 'Files' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="nav-item" style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
          <Menu size={20} />
        </div>
        {items.map(item => (
          <div key={item.id} className={\`nav-item \${active === item.id || (active !== 'home' && item.id === 'apps') ? 'active' : ''}\`} onClick={() => setActive(item.id === 'apps' || item.id === 'files' ? 'projects' : item.id)}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sidebar-bottom">
        <div className="nav-item" onClick={toggleTheme} title="Toggle Theme">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </div>
      </div>
    </div>
  );
};

// ─── Auth Modal`;
code = code.replace(sidebarRegex, newSidebar);

// 3. Replace Main App
const appRegex = /\/\/ ─── Main App ────────[^]+?export default App;/m;
const newApp = `// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('home');
  const [activeTab, setActiveTab] = useState('All');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true;
  });

  useEffect(() => { document.body.classList.toggle('dark', isDarkMode); localStorage.setItem('theme', isDarkMode ? 'dark' : 'light'); }, [isDarkMode]);

  const [stats, setStats] = useState<any>(null);
  const [designs, setDesigns] = useState<any[]>([]);
  const [associates, setAssociates] = useState<any[]>([]);
  const [myGenerations, setMyGenerations] = useState<any[]>([]);

  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(\`\${API_URL}/user/me\`, { headers: { 'Authorization': \`Bearer \${token}\` } })
        .then(r => r.json()).then(data => { if (!data.error) setUser(data); }).catch(() => {});
    }
  }, []);

  const fetchStats = useCallback(() => { fetch(\`\${API_URL}/stats\`).then(r => r.json()).then(setStats).catch(() => {}); }, []);
  const fetchDesigns = useCallback((cat?: string) => {
    const url = cat && cat !== 'All' ? \`\${API_URL}/designs?category=\${cat}\` : \`\${API_URL}/designs\`;
    fetch(url).then(r => r.json()).then(d => Array.isArray(d) && setDesigns(d)).catch(() => {});
  }, []);
  const fetchAssociates = useCallback(() => { fetch(\`\${API_URL}/associates\`).then(r => r.json()).then(d => Array.isArray(d) && setAssociates(d)).catch(() => {}); }, []);
  const fetchMyGenerations = useCallback(() => {
    if (!user) return;
    fetch(\`\${API_URL}/my/generations?limit=10\`, { headers: { ...authHeaders() } })
      .then(r => r.json()).then(d => Array.isArray(d) && setMyGenerations(d)).catch(() => {});
  }, [user]);

  useEffect(() => { fetchStats(); fetchDesigns(); fetchAssociates(); }, [fetchStats, fetchDesigns, fetchAssociates]);
  useEffect(() => { fetchMyGenerations(); }, [fetchMyGenerations]);

  const handleTabChange = (tab: string) => { setActiveTab(tab); fetchDesigns(tab); };
  const refreshAll = () => { fetchStats(); fetchDesigns(); fetchMyGenerations(); };
  const openLogin = () => { setIsLoginView(true); setIsAuthModalOpen(true); };

  const handleBannerGenerate = () => {
    if (selectedFile) { setCurrentView('site'); return; }
    if (!prompt) return;
    const lower = prompt.toLowerCase();
    const floorKeywords = ['bhk', 'floor plan', 'floorplan', 'bedroom', 'house plan', 'cabin', 'villa', 'apartment', 'duplex', 'bungalow', 'penthouse', 'studio', 'flat', 'residence'];
    const materialKeywords = ['material', 'cement', 'steel', 'brick', 'tile', 'paint', 'wood', 'marble', 'granite', 'plywood', 'sand', 'aggregate', 'rebar'];
    if (floorKeywords.some(k => lower.includes(k))) setCurrentView('floor');
    else if (materialKeywords.some(k => lower.includes(k))) setCurrentView('materials');
    else setCurrentView('market');
  };

  const typeIcons: any = { 'site-analysis': Building2, masterplan: Map, 'floor-plan': LayoutGrid, 'material-search': Package };
  const typeColors: any = { 'site-analysis': '#0066ff', masterplan: '#7c3aed', 'floor-plan': '#0891b2', 'material-search': '#d97706' };

  return (
    <div className="app-container">
      <TopBar active={currentView} setActive={setCurrentView} user={user}
        onLogout={() => { localStorage.removeItem('token'); setUser(null); setMyGenerations([]); }}
        onLoginClick={openLogin} />

      <div className="body-layout">
        <Sidebar active={currentView} setActive={setCurrentView} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />

        <div className="main-content">
          <AnimatePresence mode="wait">
            <motion.div key={currentView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} style={{ width: '100%', height: '100%', paddingBottom: '40px' }}>

              {currentView === 'home' && (
                <>
                  <div className="hero-section">
                    <div className="hero-bg" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop), linear-gradient(135deg, #1e3a8a, #8b5cf6, #d946ef)' }}></div>
                    <div className="hero-content">
                      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>Create something new</motion.h1>
                      
                      <motion.div className="firefly-prompt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="prompt-header">
                          <span>Prompt</span>
                          <p>Describe what you want to generate or analyze</p>
                        </div>
                        <div className="prompt-input-row">
                          <input type="text" placeholder="E.g. A modern 3BHK floor plan, or analyze construction site..." value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBannerGenerate()} />
                          <button className="firefly-generate-btn" onClick={handleBannerGenerate} disabled={!prompt}>
                            <Sparkles size={16} /> Generate
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="firefly-categories">
                    {['⭐ Featured', '✨ Generative AI', '🏢 Commercial', '🏠 Residential', '📐 Floor Plans', '📦 Materials'].map((cat, i) => (
                      <div key={i} className={\`firefly-chip \${i === 0 ? 'active' : ''}\`}>{cat}</div>
                    ))}
                  </div>

                  <div className="firefly-grid">
                    <motion.div className="firefly-card" whileHover={{ y: -4 }} onClick={() => setCurrentView('site')}>
                      <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=250&fit=crop" alt="Site Analyzer" />
                      <div className="card-body">
                        <h4>Analyze a construction site</h4>
                        <p>Upload a photo for AI-powered stage detection and valuation.</p>
                        <span className="card-badge"><Building2 size={12}/> Builtattic AI</span>
                      </div>
                    </motion.div>

                    <motion.div className="firefly-card" whileHover={{ y: -4 }} onClick={() => setCurrentView('floor')}>
                      <img src="https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=400&h=250&fit=crop" alt="Floor Plans" />
                      <div className="card-body">
                        <h4>Generate a new floor plan</h4>
                        <p>Create AI floor plan variants with detailed cost estimates.</p>
                        <span className="card-badge"><LayoutGrid size={12}/> Builtattic AI</span>
                      </div>
                    </motion.div>

                    <motion.div className="firefly-card" whileHover={{ y: -4 }} onClick={() => setCurrentView('market')}>
                      <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=250&fit=crop" alt="Masterplan" />
                      <div className="card-body">
                        <h4>Explore masterplan hotspots</h4>
                        <p>Discover AI-identified high-growth real estate hotspots.</p>
                        <span className="card-badge"><Map size={12}/> Builtattic AI</span>
                      </div>
                    </motion.div>

                    <motion.div className="firefly-card" whileHover={{ y: -4 }} onClick={() => setCurrentView('materials')}>
                      <img src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=250&fit=crop" alt="Materials" />
                      <div className="card-body">
                        <h4>Find construction materials</h4>
                        <p>AI-sourced supplier data and accurate material pricing.</p>
                        <span className="card-badge"><Package size={12}/> Builtattic AI</span>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}

              {currentView === 'site' && <SiteView user={user} onLoginClick={openLogin} onGenerated={refreshAll} />}
              {currentView === 'market' && <MarketView user={user} onLoginClick={openLogin} onGenerated={refreshAll} />}
              {currentView === 'floor' && <FloorView onGenerated={refreshAll} />}
              {currentView === 'materials' && <MaterialsView onGenerated={refreshAll} />}
              {currentView === 'projects' && <ProjectsView user={user} onLoginClick={openLogin} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="right-panel">
          <h3>Recent files</h3>
          {user && myGenerations.length > 0 ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {myGenerations.map((gen: any) => {
                const Icon = typeIcons[gen.type] || FileText;
                const color = typeColors[gen.type] || '#0066ff';
                return (
                  <div key={gen._id} className="recent-gen-item" onClick={() => setCurrentView('projects')}>
                    <div style={{ width: '32px', height: '32px', background: \`\${color}15\`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{gen.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{timeAgo(gen.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="recent-files-empty">
              <FileText size={32} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
              <p>No recent files</p>
              <span>Files you save or upload will appear here.</span>
              <button className="upload-btn" onClick={() => setCurrentView('site')}>
                <Upload size={14} /> Upload
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAuthModalOpen && <AuthModal isLogin={isLoginView} setIsLogin={setIsLoginView} onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(userData: any) => { setUser(userData); setIsAuthModalOpen(false); fetchMyGenerations(); fetchStats(); }} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDesign && <DesignDetail design={selectedDesign} onClose={() => setSelectedDesign(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;`;
code = code.replace(appRegex, newApp);

fs.writeFileSync('D:/adobe/src/App.tsx', code);
