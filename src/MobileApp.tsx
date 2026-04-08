import { 
  Home, Building2, LayoutGrid, Package, Map, 
  Sparkles, User, ChevronRight,
  Clock, Briefcase, X, LogOut, Sun, Moon, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MobileApp = ({ 
  user, 
  onLoginClick, 
  onLogout,
  currentView, 
  setCurrentView, 
  prompt, 
  setPrompt, 
  handleGenerate,
  designs,
  myGenerations,
  activeTab,
  setActiveTab,
  setSelectedDesign,
  isDarkMode,
  toggleTheme,
  children // This will hold the specific views like SiteView, FloorView etc.
}: any) => {

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'site', icon: Building2, label: 'Site' },
    { id: 'projects', icon: Briefcase, label: 'Projects' },
    { id: 'profile', icon: User, label: 'Account' }
  ];

  const handleNavClick = (id: string) => {
    if (id === 'profile') {
      setCurrentView('profile');
    } else if (id === 'projects') {
      setCurrentView('projects');
    } else {
      setCurrentView(id);
    }
  };

  const timeAgo = (date: string | Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 84400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="mobile-app-container">
      {/* Top Header */}
      <header className="mobile-header">
        <div className="mobile-logo-group" onClick={() => setCurrentView('home')}>
          <img src="https://builtattic.com/assets/images/logo.png" alt="Builtattic" />
        </div>
        <div className="mobile-header-actions">
          <div className="mobile-profile-avatar" onClick={() => handleNavClick('profile')}>
            {user ? user.name.charAt(0) : <User size={18} />}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mobile-main">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === 'home' ? (
              <>
                <div className="mobile-hero">
                  <h1>Create something new</h1>
                  <div className="mobile-prompt-box">
                    <input 
                      type="text" 
                      placeholder="What do you want to build?" 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                    <button onClick={handleGenerate}><Sparkles size={18} /></button>
                  </div>
                </div>

                <section className="mobile-section">
                  <div className="section-header">
                    <h3>AI Tools</h3>
                  </div>
                  <div className="mobile-tools-grid">
                    <div className="tool-card-mini" onClick={() => setCurrentView('site')}>
                      <div className="tool-icon" style={{ background: '#0066ff' }}><Building2 size={20} color="white" /></div>
                      <span>Site</span>
                    </div>
                    <div className="tool-card-mini" onClick={() => setCurrentView('floor')}>
                      <div className="tool-icon" style={{ background: '#7c3aed' }}><LayoutGrid size={20} color="white" /></div>
                      <span>Floor</span>
                    </div>
                    <div className="tool-card-mini" onClick={() => setCurrentView('market')}>
                      <div className="tool-icon" style={{ background: '#0891b2' }}><Map size={20} color="white" /></div>
                      <span>Market</span>
                    </div>
                    <div className="tool-card-mini" onClick={() => setCurrentView('materials')}>
                      <div className="tool-icon" style={{ background: '#d97706' }}><Package size={20} color="white" /></div>
                      <span>Materials</span>
                    </div>
                    <div className="tool-card-mini" onClick={() => window.location.href = 'https://www.builtattic.com/pages/chatbot'}>
                      <div className="tool-icon" style={{ background: '#10b981' }}><MessageSquare size={20} color="white" /></div>
                      <span>Chatbot</span>
                    </div>
                  </div>
                </section>

                <section className="mobile-section">
                  <div className="section-header">
                    <h3>Marketplace</h3>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '200px' }}>
                      {['All', 'Residential', 'Commercial'].map(t => (
                        <span key={t} 
                          onClick={() => setActiveTab(t)}
                          style={{ fontSize: '11px', color: activeTab === t ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mobile-horizontal-scroll">
                    {designs.slice(0, 6).map((d: any) => (
                      <motion.div key={d._id} className="mobile-feature-card" onClick={() => setSelectedDesign(d)}>
                        <img src={d.thumbnail || 'https://images.unsplash.com/photo-1503387762-592dea58ef21?w=300&h=200&fit=crop'} alt="" />
                        <div className="m-card-content">
                          <h4 style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</h4>
                          <p>₹{d.totalPrice?.toLocaleString() || 'Custom'}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                <section className="mobile-section" style={{ paddingBottom: '80px' }}>
                  <div className="section-header">
                    <h3>Recent Activity</h3>
                    {user && <button className="see-all" onClick={() => setCurrentView('projects')}>View All</button>}
                  </div>
                  <div className="mobile-activity-list">
                    {myGenerations.length > 0 ? myGenerations.slice(0, 4).map((g: any) => (
                      <div key={g._id} className="activity-item" onClick={() => setCurrentView('projects')}>
                        <div className="activity-icon"><Clock size={16} /></div>
                        <div className="activity-details">
                          <p>{g.title}</p>
                          <span>{timeAgo(g.createdAt)}</span>
                        </div>
                        <ChevronRight size={16} color="#aaa" />
                      </div>
                    )) : (
                      <div className="activity-item" style={{ justifyContent: 'center', opacity: 0.6 }}>
                        <span>No recent activity</span>
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : currentView === 'profile' ? (
              <div className="mobile-profile-view">
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div className="mobile-profile-avatar-large">
                    {user ? user.name.charAt(0) : <User size={40} />}
                  </div>
                  <h2 style={{ marginTop: '16px' }}>{user ? user.name : 'Guest User'}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{user ? user.email : 'Log in to save your work'}</p>
                  
                  {!user ? (
                    <button className="generate-btn" style={{ width: '100%', marginTop: '32px', justifyContent: 'center' }} onClick={onLoginClick}>
                      Sign In
                    </button>
                  ) : (
                    <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <button className="nav-item-wide" style={{ justifyContent: 'center' }} onClick={toggleTheme}>
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                      </button>
                      <button className="nav-item-wide" style={{ justifyContent: 'center', color: '#ef4444' }} onClick={onLogout}>
                        <LogOut size={18} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* This will render SiteView, FloorView, etc. when selected */
              <div className="mobile-view-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <button onClick={() => setCurrentView('home')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}>
                    <X size={20} />
                  </button>
                  <h3 style={{ textTransform: 'capitalize' }}>{currentView.replace('-', ' ')}</h3>
                </div>
                {children}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map(item => (
          <div 
            key={item.id} 
            className={`m-nav-item ${
              (currentView === 'home' && item.id === 'home') || 
              (currentView === 'projects' && item.id === 'projects') ||
              (currentView === 'profile' && item.id === 'profile') ||
              (['site', 'floor', 'market', 'materials'].includes(currentView) && item.id === 'site')
              ? 'active' : ''
            }`} 
            onClick={() => handleNavClick(item.id)}
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default MobileApp;
