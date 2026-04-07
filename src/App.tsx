import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home, Search, Map, Package, LayoutGrid, Building2,
  Sparkles, Upload, X, LogOut, LogIn, Moon, Sun, Briefcase, FileText,
  TrendingUp, Users, Eye, CheckCircle2, Loader2, Star,
  ShoppingBag, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_URL = '/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

function formatUSD(val: number) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({ active, setActive, user, onLogout, onLoginClick, isDarkMode, toggleTheme }: any) => {
  const items = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'site', icon: Building2, label: 'Site' },
    { id: 'floor', icon: LayoutGrid, label: 'Floor' },
    { id: 'market', icon: Map, label: 'Market' },
    { id: 'materials', icon: Package, label: 'Materials' },
    { id: 'projects', icon: Briefcase, label: 'Projects' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo-container">
          <div className="builtattic-logo" onClick={() => setActive('home')} style={{ cursor: 'pointer' }}>BA</div>
        </div>
        {items.map(item => (
          <div key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => setActive(item.id)}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sidebar-bottom">
        <div className="nav-item" onClick={toggleTheme} title="Toggle Theme">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span>{isDarkMode ? 'Light' : 'Dark'}</span>
        </div>
        {user ? (
          <div className="nav-item" onClick={onLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </div>
        ) : (
          <div className="nav-item" onClick={onLoginClick}>
            <LogIn size={20} />
            <span>Login</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Auth Modal ───────────────────────────────────────────────────────────────

const AuthModal = ({ isLogin, setIsLogin, onClose, onAuthSuccess }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin ? { email, password } : { email, password, name };
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');
      localStorage.setItem('token', data.token);
      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="auth-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>{isLogin ? 'Login' : 'Sign Up'}</h2>
          <X size={24} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose} />
        </div>
        {error && <p style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="generate-btn" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {isLogin ? "New to Builtattic? " : "Already have an account? "}
          <span style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign up' : 'Login'}
          </span>
        </p>
      </motion.div>
    </div>
  );
};

// ─── Design Detail Modal ──────────────────────────────────────────────────────

const DesignDetail = ({ design, onClose }: { design: any; onClose: () => void }) => {
  const [currentImage, setCurrentImage] = useState(0);
  if (!design) return null;

  const images = design.images || (design.thumbnail ? [design.thumbnail] : []);

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="detail-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{design.title}</h2>
          <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose} />
        </div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <img src={images[currentImage]} alt={design.title}
              style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '12px' }}
              onError={(e: any) => { e.target.style.display = 'none'; }}
            />
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                {images.map((_: any, i: number) => (
                  <div key={i} onClick={() => setCurrentImage(i)}
                    style={{ width: '8px', height: '8px', borderRadius: '50%', cursor: 'pointer',
                      background: i === currentImage ? 'var(--accent-primary)' : 'var(--border-color)' }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Creator */}
        {design.creator && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            {design.creator.avatar ? (
              <img src={design.creator.avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                {design.creator.name?.charAt(0)}
              </div>
            )}
            <div>
              <strong style={{ fontSize: '14px' }}>{design.creator.name}</strong>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{design.creator.role}</p>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="detail-sections">
          <div className="detail-row">
            <span className="detail-label">Category</span>
            <span className="detail-badge badge-blue">{design.category}</span>
          </div>
          {design.style && (
            <div className="detail-row">
              <span className="detail-label">Style</span>
              <span>{design.style}</span>
            </div>
          )}
          {design.specifications?.area && (
            <div className="detail-row">
              <span className="detail-label">Area</span>
              <span>{design.specifications.area} sq ft</span>
            </div>
          )}
          {design.specifications?.bedrooms && (
            <div className="detail-row">
              <span className="detail-label">Bedrooms</span>
              <span>{design.specifications.bedrooms}</span>
            </div>
          )}
          {design.specifications?.floors && (
            <div className="detail-row">
              <span className="detail-label">Floors</span>
              <span>{design.specifications.floors}</span>
            </div>
          )}
          {design.totalPrice != null && design.totalPrice > 0 && (
            <div className="detail-row">
              <span className="detail-label">Price</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>₹{design.totalPrice.toLocaleString()}</span>
            </div>
          )}
          {design.deliveryTime && (
            <div className="detail-row">
              <span className="detail-label">Delivery</span>
              <span>{design.deliveryTime}</span>
            </div>
          )}
        </div>

        {design.description && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '16px', maxHeight: '150px', overflow: 'auto' }}>
            {design.description}
          </p>
        )}
      </motion.div>
    </div>
  );
};

// ─── Site Analyzer View ───────────────────────────────────────────────────────

const SiteView = ({ user, onLoginClick, onGenerated }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [projectType, setProjectType] = useState('');
  const [scale, setScale] = useState('Low-rise');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('location', location);
    formData.append('projectType', projectType);
    formData.append('scale', scale);
    try {
      const res = await fetch(`${API_URL}/analyze`, { method: 'POST', headers: { ...authHeaders() }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
      onGenerated?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 48px' }}>
      <h2 style={{ marginBottom: '8px', fontSize: '24px' }}>Site Analyzer</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
        Upload a construction site photo for AI-powered stage detection, valuation, and risk analysis.
      </p>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Upload Panel */}
        <div style={{ flex: 1, minWidth: '340px', background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 16px' }}>Upload Site Image</h3>
          <div onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: preview ? '0' : '48px', textAlign: 'center', color: 'var(--text-secondary)', cursor: 'pointer', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: preview ? 'transparent' : 'var(--bg-main)' }}>
            {preview ? (
              <img src={preview} alt="Preview" style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
            ) : (
              <div><Upload size={32} style={{ marginBottom: '16px' }} /><p>Drag and drop or click to upload</p><p style={{ fontSize: '12px', marginTop: '8px' }}>JPEG, PNG up to 5MB</p></div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ display: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <input type="text" placeholder="Location (e.g. Mumbai, Pune)" value={location} onChange={e => setLocation(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="text" placeholder="Project type" value={projectType} onChange={e => setProjectType(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
              <select value={scale} onChange={e => setScale(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}>
                <option>Low-rise</option><option>Mid-rise</option><option>High-rise</option><option>Large-site</option>
              </select>
            </div>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
          {!user && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}><span style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={onLoginClick}>Log in</span> to save analyses.</p>}
          <button className="generate-btn" onClick={handleAnalyze} disabled={!file || loading} style={{ width: '100%', justifyContent: 'center', marginTop: '16px', padding: '12px' }}>
            {loading ? <><Loader2 size={16} className="spin" /> Analyzing...</> : <><Sparkles size={16} /> Analyze Site</>}
          </button>
        </div>
        {/* Results Panel */}
        <div style={{ flex: 1, minWidth: '340px' }}>
          {result?.base ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Analysis Result</h3>
                  <span className={`detail-badge ${result.base.project_status === 'completed' ? 'badge-green' : 'badge-blue'}`}>{result.base.project_status?.replace('_', ' ')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="stat-mini"><span className="stat-label">Stage</span><span className="stat-value">{result.base.stage_of_construction}</span></div>
                  <div className="stat-mini"><span className="stat-label">Progress</span><span className="stat-value">{result.base.progress_percent}%</span></div>
                  <div className="stat-mini"><span className="stat-label">Category</span><span className="stat-value">{result.base.category_matrix?.Category}</span></div>
                  <div className="stat-mini"><span className="stat-label">Typology</span><span className="stat-value">{result.base.category_matrix?.Typology}</span></div>
                </div>
                <div className="progress-bar" style={{ marginTop: '16px' }}><div className="progress-fill" style={{ width: `${result.base.progress_percent}%` }} /></div>
              </div>
              {result.valuation && (
                <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Valuation Estimate</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="val-card"><span className="val-label">Property</span><span className="val-range">{formatUSD(result.valuation.property.low)} - {formatUSD(result.valuation.property.high)}</span></div>
                    <div className="val-card"><span className="val-label">Land</span><span className="val-range">{formatUSD(result.valuation.land.low)} - {formatUSD(result.valuation.land.high)}</span></div>
                    <div className="val-card"><span className="val-label">Project</span><span className="val-range">{formatUSD(result.valuation.project.low)} - {formatUSD(result.valuation.project.high)}</span></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Confidence:</span>
                    <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${result.valuation.confidence}%`, background: result.valuation.confidence > 60 ? '#10b981' : '#f59e0b' }} /></div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{result.valuation.confidence}%</span>
                  </div>
                </div>
              )}
              {result.advanced && (
                <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Deviation Analysis</h3>
                    <span className={`detail-badge ${result.advanced.progress_vs_ideal === 'Delayed' ? 'badge-red' : 'badge-green'}`}>{result.advanced.progress_vs_ideal}</span>
                  </div>
                  {result.advanced.recommendations?.map((r: string, i: number) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0', paddingLeft: '12px', borderLeft: '2px solid var(--accent-primary)' }}>{r}</p>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div style={{ background: 'var(--bg-card)', padding: '48px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={40} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px' }}>Upload to Analyze</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '320px' }}>AI will detect construction stage, compute valuation, and flag deviations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Masterplan Explorer ──────────────────────────────────────────────────────

const MarketView = ({ onGenerated }: any) => {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!city) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/masterplan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ city, country }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onGenerated?.();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '32px 48px' }}>
      <h2 style={{ marginBottom: '8px', fontSize: '24px' }}>Masterplan Explorer</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>AI-identified high-growth real estate hotspots.</p>
      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input type="text" placeholder="Enter city (e.g. Pune, Mumbai)" value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
          <select value={country} onChange={e => setCountry(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}>
            <option>India</option><option>USA</option><option>UAE</option><option>UK</option>
          </select>
          <button className="generate-btn" onClick={handleSearch} disabled={!city || loading}>{loading ? <Loader2 size={16} className="spin" /> : <><Search size={16} /> Explore</>}</button>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
      </div>
      {result?.hotspots ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {result.hotspots.map((h: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>{h.name}</h4>
                <span className="detail-badge badge-blue">{h.typology}</span>
              </div>
              {h.ticketSizeINR && <p style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '12px' }}>₹{(h.ticketSizeINR.min / 1e7).toFixed(1)} - {(h.ticketSizeINR.max / 1e7).toFixed(1)} Cr</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {h.features && Object.entries(h.features).map(([k, v]: any) => (
                  <div key={k} style={{ fontSize: '12px' }}><span style={{ color: 'var(--text-secondary)' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </span><span style={{ fontWeight: 600 }}>{Math.round(v * 100)}%</span></div>
                ))}
              </div>
              {h.reasonNotes?.[0] && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{h.reasonNotes[0]}</p>}
            </motion.div>
          ))}
        </div>
      ) : !loading && (
        <div style={{ background: 'var(--bg-card)', padding: '64px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <Map size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <h3>Enter a city to explore hotspots</h3>
        </div>
      )}
    </div>
  );
};

// ─── Floor Plan View ──────────────────────────────────────────────────────────

const FloorView = ({ onGenerated }: any) => {
  const [bedrooms, setBedrooms] = useState('3');
  const [budget, setBudget] = useState('50-80 Lakhs');
  const [style, setStyle] = useState('Modern');
  const [area, setArea] = useState('1200 sqft');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/floorplan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ bedrooms: Number(bedrooms), budget, style, area, location }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onGenerated?.();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '32px 48px' }}>
      <h2 style={{ marginBottom: '8px', fontSize: '24px' }}>Floor Plan Insights</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>AI floor plan variants with cost estimates and room layouts.</p>
      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          <div><label className="form-label">Bedrooms</label><select value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="form-input"><option value="1">1 BHK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4">4 BHK</option></select></div>
          <div><label className="form-label">Budget</label><input type="text" value={budget} onChange={e => setBudget(e.target.value)} className="form-input" /></div>
          <div><label className="form-label">Style</label><select value={style} onChange={e => setStyle(e.target.value)} className="form-input"><option>Modern</option><option>Traditional</option><option>Contemporary</option><option>Minimalist</option></select></div>
          <div><label className="form-label">Area</label><input type="text" value={area} onChange={e => setArea(e.target.value)} className="form-input" /></div>
          <div><label className="form-label">Location</label><input type="text" placeholder="City" value={location} onChange={e => setLocation(e.target.value)} className="form-input" /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="generate-btn" onClick={handleGenerate} disabled={loading}>{loading ? <><Loader2 size={16} className="spin" /> Generating...</> : <><Sparkles size={16} /> Generate Plans</>}</button>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
      </div>
      {result?.plans ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {result.plans.map((plan: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
              style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ height: '100px', background: 'linear-gradient(135deg, var(--accent-primary), #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div style={{ textAlign: 'center' }}><LayoutGrid size={28} /><p style={{ fontSize: '14px', marginTop: '8px', fontWeight: 600 }}>{plan.config || plan.name}</p></div>
              </div>
              <div style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 4px' }}>{plan.name}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{plan.totalArea} | Est. {plan.estimatedCost}</p>
                {plan.rooms?.slice(0, 4).map((room: any, ri: number) => (
                  <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span>{room.name}</span><span style={{ color: 'var(--text-secondary)' }}>{room.area}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                  {plan.vastu_compliant && <span className="detail-badge badge-green" style={{ fontSize: '11px' }}>Vastu</span>}
                  {plan.energy_rating && <span className="detail-badge badge-blue" style={{ fontSize: '11px' }}>{plan.energy_rating}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : !loading && (
        <div style={{ background: 'var(--bg-card)', padding: '64px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <LayoutGrid size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} /><h3>Configure and Generate</h3>
        </div>
      )}
    </div>
  );
};

// ─── Material Finder ──────────────────────────────────────────────────────────

const MaterialsView = ({ onGenerated }: any) => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Mumbai');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ query, location }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onGenerated?.();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '32px 48px' }}>
      <h2 style={{ marginBottom: '8px', fontSize: '24px' }}>Material Finder</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>AI-powered material search with suppliers and pricing.</p>
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <input type="text" placeholder="Search materials..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
          <input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} style={{ width: '150px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }} />
          <button className="generate-btn" onClick={handleSearch} disabled={!query || loading}>{loading ? <Loader2 size={16} className="spin" /> : <><Search size={16} /> Search</>}</button>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
        {result?.materials ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {result.materials.map((m: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)' }}><Package size={24} color="var(--accent-primary)" /></div>
                  <div>
                    <strong style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>{m.name} {m.recommended && <CheckCircle2 size={14} color="#10b981" />}</strong>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.brand} | {m.grade}</div>
                    <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px', fontWeight: 600 }}>{m.priceRange?.min}-{m.priceRange?.max} {m.priceRange?.unit}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>{m.suppliers?.length || 0} Suppliers</div>
              </motion.div>
            ))}
          </div>
        ) : !loading && (
          <div style={{ padding: '48px', textAlign: 'center' }}><Package size={40} color="var(--accent-primary)" style={{ marginBottom: '16px' }} /><p style={{ color: 'var(--text-secondary)' }}>Search for materials to see pricing.</p></div>
        )}
      </div>
    </div>
  );
};

// ─── Projects View (My Generations) ───────────────────────────────────────────

const ProjectsView = ({ user, onLoginClick }: any) => {
  const [generations, setGenerations] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/my/generations`, { headers: { ...authHeaders() } }).then(r => r.json()).then(d => Array.isArray(d) && setGenerations(d)).catch(() => {});
    fetch(`${API_URL}/my/designs`, { headers: { ...authHeaders() } }).then(r => r.json()).then(d => Array.isArray(d) && setDesigns(d)).catch(() => {});
    fetch(`${API_URL}/my/orders`, { headers: { ...authHeaders() } }).then(r => r.json()).then(d => Array.isArray(d) && setOrders(d)).catch(() => {});
  }, [user]);

  const typeIcons: any = { 'site-analysis': Building2, masterplan: Map, 'floor-plan': LayoutGrid, 'material-search': Package };

  if (!user) {
    return (
      <div style={{ padding: '32px 48px', textAlign: 'center' }}>
        <Briefcase size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
        <h2>My Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Login to see your designs, orders, and AI analyses.</p>
        <button className="generate-btn" style={{ margin: '0 auto' }} onClick={onLoginClick}><LogIn size={16} /> Login</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 48px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px' }}>My Dashboard</h2>

      {/* My Designs */}
      {designs.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>My Designs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {designs.map((d: any) => (
              <div key={d._id} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {d.thumbnail && <img src={d.thumbnail} alt="" style={{ width: '100%', height: '140px', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none'; }} />}
                <div style={{ padding: '16px' }}>
                  <strong>{d.title}</strong>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{d.category} | {d.style}</p>
                  <span className="detail-badge badge-green" style={{ fontSize: '11px', marginTop: '8px', display: 'inline-block' }}>{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Orders */}
      {orders.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>My Orders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map((o: any) => (
              <div key={o._id} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '14px' }}>{o.orderNumber}</strong>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{o.items?.map((i: any) => i.title).join(', ')}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`detail-badge ${o.status === 'payment_completed' ? 'badge-green' : 'badge-blue'}`}>{o.status?.replace(/_/g, ' ')}</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>₹{o.grandTotal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Generations */}
      <div>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Generations</h3>
        {generations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {generations.map((g: any) => {
              const Icon = typeIcons[g.type] || FileText;
              return (
                <div key={g._id} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '10px', background: 'var(--bg-main)', borderRadius: '10px' }}><Icon size={20} color="var(--accent-primary)" /></div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '14px' }}>{g.title}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{g.type?.replace(/-/g, ' ')} | {timeAgo(g.createdAt)}</p>
                  </div>
                  <span className="detail-badge badge-green">{g.status}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No AI analyses yet. Try Site Analyzer, Floor Plans, or Masterplan Explorer.</p>
        )}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('home');
  const [activeTab, setActiveTab] = useState('All');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);

  const [isDarkMode, setIsDarkMode] = useState(() =>
    localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => { document.body.classList.toggle('dark', isDarkMode); localStorage.setItem('theme', isDarkMode ? 'dark' : 'light'); }, [isDarkMode]);

  // Platform data
  const [stats, setStats] = useState<any>(null);
  const [designs, setDesigns] = useState<any[]>([]);
  const [associates, setAssociates] = useState<any[]>([]);
  const [myGenerations, setMyGenerations] = useState<any[]>([]);

  // Banner prompt
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch user
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json()).then(data => { if (!data.error) setUser(data); }).catch(() => {});
    }
  }, []);

  const fetchStats = useCallback(() => { fetch(`${API_URL}/stats`).then(r => r.json()).then(setStats).catch(() => {}); }, []);
  const fetchDesigns = useCallback((cat?: string) => {
    const url = cat && cat !== 'All' ? `${API_URL}/designs?category=${cat}` : `${API_URL}/designs`;
    fetch(url).then(r => r.json()).then(d => Array.isArray(d) && setDesigns(d)).catch(() => {});
  }, []);
  const fetchAssociates = useCallback(() => { fetch(`${API_URL}/associates`).then(r => r.json()).then(d => Array.isArray(d) && setAssociates(d)).catch(() => {}); }, []);
  const fetchMyGenerations = useCallback(() => {
    if (!user) return;
    fetch(`${API_URL}/my/generations?limit=10`, { headers: { ...authHeaders() } })
      .then(r => r.json()).then(d => Array.isArray(d) && setMyGenerations(d)).catch(() => {});
  }, [user]);

  useEffect(() => { fetchStats(); fetchDesigns(); fetchAssociates(); }, [fetchStats, fetchDesigns, fetchAssociates]);
  useEffect(() => { fetchMyGenerations(); }, [fetchMyGenerations]);

  const handleTabChange = (tab: string) => { setActiveTab(tab); fetchDesigns(tab); };
  const refreshAll = () => { fetchStats(); fetchDesigns(); fetchMyGenerations(); };
  const openLogin = () => { setIsLoginView(true); setIsAuthModalOpen(true); };

  const handleBannerGenerate = () => {
    if (selectedFile) setCurrentView('site');
    else if (prompt) setCurrentView('market');
  };

  const typeIcons: any = { 'site-analysis': Building2, masterplan: Map, 'floor-plan': LayoutGrid, 'material-search': Package };
  const typeColors: any = { 'site-analysis': '#0066ff', masterplan: '#7c3aed', 'floor-plan': '#0891b2', 'material-search': '#d97706' };

  return (
    <div className="app-container">
      <Sidebar active={currentView} setActive={setCurrentView} user={user}
        onLogout={() => { localStorage.removeItem('token'); setUser(null); setMyGenerations([]); }}
        onLoginClick={openLogin} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />

      <div className="main-layout">
        <div className="scroll-content">
          <AnimatePresence mode="wait">
            <motion.div key={currentView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} style={{ width: '100%', height: '100%' }}>

              {currentView === 'home' && (
                <>
                  {/* Banner */}
                  <div className="banner">
                    <div className="banner-bg">
                      <div className="banner-content">
                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>Builtattic Platform</motion.h1>

                        {stats && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="stats-bar">
                            <div className="stat-chip"><Users size={14} /><span>{stats.totalUsers} Users</span></div>
                            <div className="stat-chip"><Building2 size={14} /><span>{stats.totalDesigns} Designs</span></div>
                            <div className="stat-chip"><ShoppingBag size={14} /><span>{stats.totalOrders} Orders</span></div>
                            <div className="stat-chip"><MessageCircle size={14} /><span>{stats.totalChats} Chats</span></div>
                            <div className="stat-chip"><TrendingUp size={14} /><span>{stats.associates} Architects</span></div>
                          </motion.div>
                        )}

                        <div className="prompt-container" style={{ background: 'var(--bg-card)', padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginTop: '24px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prompt</div>
                          <div className="input-with-upload" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                            <input type="text" placeholder="Describe your architectural or construction needs..." value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBannerGenerate()} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' }} />
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Upload size={20} color="var(--text-secondary)" />
                              <input type="file" accept="image/*" onChange={e => e.target.files && setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
                            </label>
                          </div>
                          {selectedFile && <div style={{ fontSize: '12px', color: 'var(--accent-primary)', marginBottom: '16px' }}>Selected: {selectedFile.name}</div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', backgroundColor: 'var(--border-color)', color: 'var(--text-primary)' }}><Sparkles size={14} color="var(--accent-primary)" /> PRO AEC LLM</div>
                            </div>
                            <button className="generate-btn" onClick={handleBannerGenerate} disabled={!selectedFile && !prompt} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)', fontWeight: 600 }}><Sparkles size={16} /> Generate</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="category-tabs">
                      {['All', 'Residential', 'Commercial', 'Institutional', 'Recreational'].map(t => (
                        <div key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => handleTabChange(t)}>{t}</div>
                      ))}
                    </div>
                  </div>

                  {/* Feature Cards */}
                  <div className="grid-container">
                    <motion.div className="feature-card" whileHover={{ y: -5 }} onClick={() => setCurrentView('site')}>
                      <div className="card-image" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1503387762-592dea58ef21?w=400&h=250&fit=crop)' }} />
                      <div className="card-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '32px', height: '32px', background: '#0066ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={16} color="white" /></div>
                          <h3 style={{ margin: 0, fontSize: '16px' }}>Site Analyzer</h3>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Upload construction images for AI-powered stage detection & valuation.</p>
                      </div>
                    </motion.div>
                    <motion.div className="feature-card" whileHover={{ y: -5 }} onClick={() => setCurrentView('market')}>
                      <div className="card-image" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=250&fit=crop)' }} />
                      <div className="card-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '32px', height: '32px', background: '#7c3aed', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Map size={16} color="white" /></div>
                          <h3 style={{ margin: 0, fontSize: '16px' }}>Masterplan Explorer</h3>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Discover AI-identified high-growth real estate hotspots.</p>
                      </div>
                    </motion.div>
                    <motion.div className="feature-card" whileHover={{ y: -5 }} onClick={() => setCurrentView('floor')}>
                      <div className="card-image" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1503387837-b159950e89ef?w=400&h=250&fit=crop)' }} />
                      <div className="card-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '32px', height: '32px', background: '#0891b2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LayoutGrid size={16} color="white" /></div>
                          <h3 style={{ margin: 0, fontSize: '16px' }}>Floor Plan Insights</h3>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Generate AI floor plan variants with cost estimates.</p>
                      </div>
                    </motion.div>
                    <motion.div className="feature-card" whileHover={{ y: -5 }} onClick={() => setCurrentView('materials')}>
                      <div className="card-image" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=250&fit=crop)' }} />
                      <div className="card-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '32px', height: '32px', background: '#d97706', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="white" /></div>
                          <h3 style={{ margin: 0, fontSize: '16px' }}>Material Finder</h3>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>AI-sourced supplier data and material pricing.</p>
                      </div>
                    </motion.div>
                    <motion.div className="feature-card" whileHover={{ y: -5 }} onClick={() => setCurrentView('projects')}>
                      <div className="card-image" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=250&fit=crop)' }} />
                      <div className="card-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '32px', height: '32px', background: '#059669', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Briefcase size={16} color="white" /></div>
                          <h3 style={{ margin: 0, fontSize: '16px' }}>My Dashboard</h3>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Your designs, orders, and AI analyses in one place.</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Real Designs from DB */}
                  {designs.length > 0 && (
                    <div style={{ padding: '0 48px 32px' }}>
                      <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Published Designs</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                        {designs.map((d: any, i: number) => (
                          <motion.div key={d._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className="gallery-card" onClick={() => setSelectedDesign(d)}>
                            {d.thumbnail ? (
                              <img src={d.thumbnail} alt={d.title} className="gallery-thumb" onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1503387762-592dea58ef21?w=400&h=200&fit=crop'; }} />
                            ) : (
                              <div className="gallery-thumb-placeholder" style={{ background: 'linear-gradient(135deg, #0066ff22, #0066ff44)' }}><Building2 size={28} color="#0066ff" /></div>
                            )}
                            <div style={{ padding: '14px' }}>
                              <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>{d.title}</h4>
                              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <span className="detail-badge badge-blue" style={{ fontSize: '11px' }}>{d.category}</span>
                                {d.style && <span className="detail-badge" style={{ fontSize: '11px', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>{d.style}</span>}
                              </div>
                              {d.specifications?.area && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>{d.specifications.area} sq ft {d.specifications.bedrooms ? `| ${d.specifications.bedrooms} BHK` : ''}</p>}
                              {d.creator && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                  {d.creator.avatar ? (
                                    <img src={d.creator.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                                  ) : (
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700 }}>{d.creator.name?.charAt(0)}</div>
                                  )}
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d.creator.name}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Associates / Architects */}
                  {associates.length > 0 && (
                    <div style={{ padding: '0 48px 100px' }}>
                      <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Featured Architects</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                        {associates.map((a: any, i: number) => (
                          <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                              {a.avatar ? (
                                <img src={a.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{a.name?.charAt(0)}</div>
                              )}
                              <div>
                                <strong style={{ fontSize: '14px' }}>{a.name}</strong>
                                {a.plan === 'pro' && <span className="detail-badge badge-blue" style={{ fontSize: '10px', marginLeft: '6px' }}>PRO</span>}
                                {a.rating?.average > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Star size={12} color="#f59e0b" fill="#f59e0b" /><span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.rating.average}</span></div>}
                              </div>
                            </div>
                            {a.specializations?.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                {a.specializations.slice(0, 3).map((s: string, si: number) => (
                                  <span key={si} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>{s}</span>
                                ))}
                              </div>
                            )}
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{a.bio?.substring(0, 80)}{a.bio?.length > 80 ? '...' : ''}</p>
                            {a.totalViews > 0 && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}><Eye size={11} /> {a.totalViews} views</p>}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
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
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="promo-card">
          <div className="promo-logo">BA</div>
          <h4 style={{ margin: '0 0 8px', fontSize: '16px' }}>
            {user ? `Welcome, ${user.name}` : 'Builtattic Hub'}
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
            {user ? `${user.role} | ${user.plan} plan` : 'Sign in to save analyses and track projects.'}
          </p>
          {user?.avatar && <img src={user.avatar} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' }} onError={(e: any) => { e.target.style.display = 'none'; }} />}
          {!user && <button className="generate-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={openLogin}><LogIn size={14} /> Get Started</button>}
        </div>

        <div style={{ marginTop: '16px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 className="right-panel-header" style={{ margin: '0 0 16px' }}>
            {user ? 'My Recent Activity' : 'Recent Files'}
          </h3>

          {user && myGenerations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'auto', flex: 1 }}>
              {myGenerations.map((gen: any) => {
                const Icon = typeIcons[gen.type] || FileText;
                const color = typeColors[gen.type] || '#0066ff';
                return (
                  <div key={gen._id} className="recent-gen-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', background: `${color}15`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gen.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{timeAgo(gen.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="recent-files-empty">
              <FileText size={32} style={{ color: '#9ca3af', marginBottom: '16px' }} />
              <p>No recent activity</p>
              <span>{user ? 'Your AI analyses will appear here.' : 'Login to see your saved work.'}</span>
              <button className="generate-btn" style={{ marginTop: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '13px', padding: '8px 16px' }}
                onClick={() => user ? setCurrentView('site') : openLogin()}>
                {user ? <><Upload size={14} /> Analyze</> : <><LogIn size={14} /> Login</>}
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

export default App;
