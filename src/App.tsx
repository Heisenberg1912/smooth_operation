import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home, Search, Map, Package, LayoutGrid, Building2,
  Sparkles, Upload, X, LogIn, Moon, Sun, Briefcase, FileText,
  TrendingUp, CheckCircle2, Loader2,
  Shield, AlertTriangle, ChevronDown, ChevronUp,
  Ruler, Compass, Download, Rocket, MessageSquare, PanelRightClose, PanelRightOpen,
  Trash2, Eye, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import MobileApp from './MobileApp';

const API_URL = '/api';

// Module-level cache: generationId → image data-URL.
// Lives for the entire browser session (until page refresh). No size limit.
const blueprintImageCache: Record<string, string> = {};

const MARKETPLACE_VISIT_URLS: Record<string, string> = {
  'Net-zero Agricultural Campus': 'https://www.builtattic.com/products/net-zero-agricultural-campus?variant=47358164926699',
  'Ovular Semiconductor Manufacturing Campus': 'https://www.builtattic.com/products/ovular-semiconductor-manufacturing-campus?variant=47357540139243',
  'Dark Tourism Memorial: Bhopal': 'https://www.builtattic.com/products/bhopal-gas-tragedy-memorial?variant=47358797349099',
  'Courtyard Tech Campus': 'https://www.builtattic.com/products/it-office?variant=47358781849835',
  'Circular Restro-Bar': 'https://www.builtattic.com/products/restaurant?variant=47342708621547',
  'Terraced Mixed-Use Commercial Complex': 'https://www.builtattic.com/products/mixed-use-building?variant=47358731845867',
  'Riverside Office': 'https://www.builtattic.com/products/riverside-office?variant=47356819374315',
  'Tropical Row House': 'https://www.builtattic.com/products/tropical-row-house?variant=47358808850667',
};

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
  const topItems = [
    { id: 'home', icon: Home, label: 'Home', link: null },
    { id: 'site', icon: Building2, label: 'Site Analyzer', link: 'https://www.builtattic.com/pages/vision' },
    { id: 'floor', icon: LayoutGrid, label: 'Floor Plans', link: 'https://www.builtattic.com/pages/vitruviai' },
    { id: 'materials', icon: Package, label: 'Materials', link: 'https://www.builtattic.com/pages/vision' },
    { id: 'market', icon: Map, label: 'Masterplan', link: 'https://www.builtattic.com/collections/design-studio?page=2' },
    { id: 'chatbot', icon: MessageSquare, label: 'Chatbot', link: 'https://www.builtattic.com/pages/chatbot' },
  ];
  const bottomItems = [
    { id: 'projects', icon: Briefcase, label: 'My Dashboard' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        

        <div className="sidebar-search">
          <Search size={14} color="var(--text-secondary)" />
          <input type="text" placeholder="Search..." />
        </div>

        <div className="sidebar-nav-group">
          {topItems.map(item => (
            <div key={item.id} className={`nav-item-wide ${active === item.id ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onClick={() => { if (item.id !== 'chatbot') setActive(item.id); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </div>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  title={`Open ${item.label} on builtattic.com`}
                  style={{ display: 'flex', alignItems: 'center', padding: '2px', color: 'var(--text-secondary)', opacity: 0.6, transition: 'opacity 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="sidebar-bottom">
        <div className="sidebar-nav-group">
          {bottomItems.map(item => (
            <div key={item.id} className={`nav-item-wide ${active === item.id ? 'active' : ''}`} onClick={() => setActive(item.id)}>
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
  const visitUrl = MARKETPLACE_VISIT_URLS[design.title];

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

        {visitUrl && (
          <button
            className="generate-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
            onClick={() => window.open(visitUrl, '_blank', 'noopener,noreferrer')}
          >
            Visit
          </button>
        )}
      </motion.div>
    </div>
  );
};

// ─── Image Preview Modal ──────────────────────────────────────────────────────

const ImagePreviewModal = ({ imageUrl, title, onClose, downloadUrl }: { imageUrl: string; title: string; onClose: () => void; downloadUrl?: string }) => {
  if (!imageUrl) return null;
  return (
    <div className="auth-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', maxWidth: '90vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {downloadUrl && (
              <a href={downloadUrl} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', fontSize: '12px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                <Download size={14} /> Download
              </a>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
          <img src={imageUrl} alt={title} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
        </div>
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

// ─── Floor Plan SVG Renderer ─────────────────────────────────────────────────

const ROOM_COLORS: Record<string, string> = {
  'master bedroom': '#6366f1', 'bedroom': '#818cf8', 'bedroom 1': '#818cf8', 'bedroom 2': '#a5b4fc', 'bedroom 3': '#c7d2fe',
  'living room': '#22c55e', 'living': '#22c55e', 'drawing room': '#22c55e',
  'kitchen': '#f59e0b', 'dining': '#fb923c', 'dining room': '#fb923c',
  'bathroom': '#06b6d4', 'bathroom 1': '#06b6d4', 'bathroom 2': '#67e8f9', 'toilet': '#06b6d4', 'common bathroom': '#67e8f9',
  'balcony': '#84cc16', 'balcony 1': '#84cc16', 'balcony 2': '#a3e635',
  'parking': '#94a3b8', 'car parking': '#94a3b8',
  'staircase': '#d946ef', 'passage': '#a1a1aa', 'corridor': '#a1a1aa',
  'pooja room': '#e879f9', 'store': '#78716c', 'utility': '#78716c', 'wash area': '#78716c',
};

const getRoomColor = (name: string) => {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(ROOM_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#64748b';
};

const FloorPlanSVG = ({ plan, svgRef }: { plan: any; svgRef?: React.RefObject<SVGSVGElement | null> }) => {
  const plotW = plan.plotWidth || 40;
  const plotL = plan.plotLength || 60;
  const padding = 2;
  const scale = 10;
  const svgW = (plotW + padding * 2) * scale;
  const svgH = (plotL + padding * 2) * scale;

  const rooms = (plan.rooms || []).filter((r: any) => r.floor === 0 || !r.floor);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxHeight: '500px', background: '#0f172a', borderRadius: '12px' }}>
      {/* Plot boundary */}
      <rect x={padding * scale} y={padding * scale} width={plotW * scale} height={plotL * scale}
        fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="8,4" />
      {/* Setback zone */}
      <rect x={(padding + 5) * scale} y={(padding + 5) * scale}
        width={(plotW - 10) * scale} height={(plotL - 12) * scale}
        fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" opacity={0.5} />
      {/* Plot dimensions label */}
      <text x={svgW / 2} y={padding * scale - 4} textAnchor="middle" fontSize="11" fill="#94a3b8">{plotW} ft</text>
      <text x={padding * scale - 4} y={svgH / 2} textAnchor="middle" fontSize="11" fill="#94a3b8" transform={`rotate(-90, ${padding * scale - 4}, ${svgH / 2})`}>{plotL} ft</text>
      {/* North arrow */}
      <g transform={`translate(${svgW - 35}, 18)`}>
        <polygon points="0,14 6,0 12,14" fill="none" stroke="#94a3b8" strokeWidth="1" />
        <text x="6" y="24" textAnchor="middle" fontSize="9" fill="#94a3b8">N</text>
      </g>
      {/* Rooms */}
      {rooms.map((room: any, i: number) => {
        const rx = (padding + (Number(room.x) || 0)) * scale;
        const ry = (padding + (Number(room.y) || 0)) * scale;
        const rw = (Number(room.width) || 8) * scale;
        const rh = (Number(room.length) || 8) * scale;
        const color = getRoomColor(room.name);
        const fontSize = Math.min(rw, rh) > 60 ? 10 : 8;
        return (
          <g key={i}>
            <rect x={rx} y={ry} width={rw} height={rh}
              fill={color} fillOpacity={0.2} stroke={color} strokeWidth="1.5" rx="2" />
            {/* Room name */}
            <text x={rx + rw / 2} y={ry + rh / 2 - 4} textAnchor="middle" fontSize={fontSize} fill={color} fontWeight="600">
              {room.name}
            </text>
            {/* Dimensions */}
            <text x={rx + rw / 2} y={ry + rh / 2 + 10} textAnchor="middle" fontSize={Math.max(fontSize - 2, 7)} fill="#94a3b8">
              {room.width}×{room.length} ft
            </text>
            {/* Door indicator (small gap on the bottom or right edge) */}
            {!room.name.toLowerCase().includes('parking') && !room.name.toLowerCase().includes('balcony') && (
              <rect x={rx + rw / 2 - 4} y={ry + rh - 1} width={8} height={2} fill={color} rx="1" />
            )}
          </g>
        );
      })}
      {/* Legend */}
      <g transform={`translate(${padding * scale}, ${svgH - 14})`}>
        <text fontSize="8" fill="#64748b">--- Plot boundary &nbsp; ··· Setback zone &nbsp; ▪ Door</text>
      </g>
    </svg>
  );
};

// ─── AEC Compliance Panel ────────────────────────────────────────────────────

const CompliancePanel = ({ compliance }: { compliance: any }) => {
  const [expanded, setExpanded] = useState(false);
  if (!compliance) return null;

  const checks = Object.entries(compliance) as [string, { status: boolean; detail: string }][];
  const passCount = checks.filter(([, v]) => v.status).length;
  const totalCount = checks.length;
  const allPass = passCount === totalCount;

  const normLabels: Record<string, string> = {
    setbacks: 'Setbacks (NBC 2016)',
    roomSizes: 'Min Room Sizes (NBC)',
    ventilation: 'Ventilation (1/10th)',
    fsi: 'FSI / FAR Limit',
    vastu: 'Vastu Compliance',
    parking: 'Parking (1 ECS/unit)',
    fireNorms: 'Fire Safety (NBC)',
    staircase: 'Staircase (IS 1893)',
    ceilingHeight: 'Ceiling Height (2.75m)',
  };

  return (
    <div style={{ background: allPass ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)', borderRadius: '12px', border: `1px solid ${allPass ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} color={allPass ? '#22c55e' : '#f59e0b'} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>AEC Compliance: {passCount}/{totalCount} passed</span>
        </div>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 12px' }}>
          {checks.map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              {val.status
                ? <CheckCircle2 size={14} color="#22c55e" style={{ marginTop: '2px', flexShrink: 0 }} />
                : <AlertTriangle size={14} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
              }
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{normLabels[key] || key}</span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{val.detail}</p>
              </div>
            </div>
          ))}
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
  const [plotWidth, setPlotWidth] = useState('40');
  const [plotLength, setPlotLength] = useState('60');
  const [floors, setFloors] = useState('1');
  const [facing, setFacing] = useState('North');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activePlan, setActivePlan] = useState(0);
  const [showRoomList, setShowRoomList] = useState(true);
  const [viewMode, setViewMode] = useState<'blueprint' | 'schematic'>('blueprint');
  const [blueprintCache, setBlueprintCache] = useState<Record<number, { image: string; description: string }>>({});
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const fetchBlueprintForPlan = async (plan: any, planIndex: number, genId?: string) => {
    if (blueprintCache[planIndex]) return; // already cached
    setBlueprintLoading(true);
    try {
      const roomSummary = (plan.rooms || []).map((r: any) => `${r.name}: ${r.width}x${r.length}ft`).join(', ');
      const res = await fetch(`${API_URL}/floorplan-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          bedrooms: Number(bedrooms), style, area, plotWidth: Number(plotWidth), plotLength: Number(plotLength),
          floors: Number(floors), facing, location,
          variantName: plan.name || plan.config,
          variantFeatures: (plan.features || []).join(', '),
          roomLayout: roomSummary,
          generationId: genId || generationId
        })
      });
      const data = await res.json();
      if (data.image) {
        setBlueprintCache(prev => ({ ...prev, [planIndex]: { image: data.image, description: data.description || '' } }));
        if (planIndex === 0) {
          const sid = genId || generationId;
          if (sid) {
            blueprintImageCache[String(sid)] = data.image;
          }
          // Re-fetch generations so the sidebar picks up the saved thumbnailUrl from MongoDB
          onGenerated?.();
        }
      }
    } catch (e) { /* silent — user can switch to schematic */ }
    finally { setBlueprintLoading(false); }
  };

  const handleGenerate = async () => {
    setLoading(true); setError(''); setResult(null); setActivePlan(0);
    setBlueprintCache({}); setBlueprintLoading(false); setViewMode('blueprint');
    setGenerationId(null);
    const payload = { bedrooms: Number(bedrooms), budget, style, area, location, plotWidth: Number(plotWidth), plotLength: Number(plotLength), floors: Number(floors), facing };

    try {
      const res = await fetch(`${API_URL}/floorplan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      if (data.generationId) setGenerationId(data.generationId);
      onGenerated?.();
      // Auto-fetch image for first plan variant
      if (data.plans?.[0]) {
        setTimeout(() => fetchBlueprintForPlan(data.plans[0], 0, data.generationId), 0);
      }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  // Fetch blueprint when user switches variant tab
  useEffect(() => {
    if (result?.plans?.[activePlan] && viewMode === 'blueprint' && !blueprintCache[activePlan]) {
      fetchBlueprintForPlan(result.plans[activePlan], activePlan);
    }
  }, [activePlan, viewMode]);

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floorplan-${result?.plans?.[activePlan]?.config || 'plan'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentPlan = result?.plans?.[activePlan];

  return (
    <div style={{ padding: '32px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '24px', margin: 0 }}>Floor Plan Generator</h2>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: '11px', fontWeight: 600 }}>
          <Shield size={12} /> AEC Norm Compliant
        </span>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
        AI-generated floor plans following NBC India 2016, IS 1893, Vastu & local building bylaws.
      </p>

      {/* Input Form */}
      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Ruler size={14} /> Project Configuration
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          <div><label className="form-label">Bedrooms</label><select value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="form-input"><option value="1">1 BHK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4">4 BHK</option><option value="5">5 BHK</option></select></div>
          <div><label className="form-label">Budget</label><input type="text" value={budget} onChange={e => setBudget(e.target.value)} className="form-input" /></div>
          <div><label className="form-label">Style</label><select value={style} onChange={e => setStyle(e.target.value)} className="form-input"><option>Modern</option><option>Traditional</option><option>Contemporary</option><option>Minimalist</option><option>Vernacular</option><option>Neo-Classical</option></select></div>
          <div><label className="form-label">Built-up Area</label><input type="text" value={area} onChange={e => setArea(e.target.value)} className="form-input" /></div>
          <div><label className="form-label">Plot Width (ft)</label><input type="number" value={plotWidth} onChange={e => setPlotWidth(e.target.value)} className="form-input" min="20" /></div>
          <div><label className="form-label">Plot Length (ft)</label><input type="number" value={plotLength} onChange={e => setPlotLength(e.target.value)} className="form-input" min="20" /></div>
          <div><label className="form-label">Floors</label><select value={floors} onChange={e => setFloors(e.target.value)} className="form-input"><option value="1">Ground (G)</option><option value="2">G + 1</option><option value="3">G + 2</option><option value="4">G + 3</option></select></div>
          <div><label className="form-label">Facing</label><select value={facing} onChange={e => setFacing(e.target.value)} className="form-input"><option>North</option><option>South</option><option>East</option><option>West</option><option>North-East</option><option>North-West</option><option>South-East</option><option>South-West</option></select></div>
          <div><label className="form-label">Location</label><input type="text" placeholder="City / Region" value={location} onChange={e => setLocation(e.target.value)} className="form-input" /></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[
              'NBC India 2016', 'IS 1893 Seismic', 'IS 456 RCC', 'Vastu Shastra', 'Fire Safety (NBC Part 4)'
            ].map(norm => (
              <span key={norm} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'var(--border-color)', color: 'var(--text-secondary)' }}>{norm}</span>
            ))}
          </div>
          <button className="generate-btn" onClick={handleGenerate} disabled={loading}>
            {loading ? <><Loader2 size={16} className="spin" /> Generating with AEC norms...</> : <><Sparkles size={16} /> Generate Plans</>}
          </button>
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
      </div>

      {/* Results */}
      {result?.plans ? (
        <div>
          {/* Plan variant tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {result.plans.map((plan: any, i: number) => (
              <button key={i} onClick={() => setActivePlan(i)}
                style={{ padding: '10px 20px', borderRadius: '10px', border: `1.5px solid ${i === activePlan ? 'var(--accent-primary)' : 'var(--border-color)'}`, background: i === activePlan ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)', color: i === activePlan ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                {plan.config || plan.name}
              </button>
            ))}
          </div>

          {currentPlan && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={activePlan}>
              {/* Header stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Total Area', value: currentPlan.totalArea, icon: <LayoutGrid size={16} /> },
                  { label: 'Est. Cost', value: currentPlan.estimatedCost, icon: <TrendingUp size={16} /> },
                  { label: 'FSI', value: currentPlan.fsi || 'N/A', icon: <Building2 size={16} /> },
                  { label: 'Energy', value: currentPlan.energy_rating || 'N/A', icon: <Sparkles size={16} /> },
                  { label: 'Floors', value: `${currentPlan.floors || 1}`, icon: <Building2 size={16} /> },
                  { label: 'Plot', value: `${currentPlan.plotWidth || plotWidth} × ${currentPlan.plotLength || plotLength} ft`, icon: <Ruler size={16} /> },
                ].map((stat, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>{stat.icon}{stat.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px' }}>
                {/* Floor Plan Visualization */}
                <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  {/* View mode toggle + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--border-color)', borderRadius: '8px', padding: '2px' }}>
                      <button onClick={() => setViewMode('blueprint')}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: viewMode === 'blueprint' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'blueprint' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                        <Sparkles size={12} style={{ marginRight: 4, verticalAlign: -1 }} />AI Blueprint
                      </button>
                      <button onClick={() => setViewMode('schematic')}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: viewMode === 'schematic' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'schematic' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                        <LayoutGrid size={12} style={{ marginRight: 4, verticalAlign: -1 }} />Schematic
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {viewMode === 'blueprint' && blueprintCache[activePlan] && (
                        <a href={blueprintCache[activePlan].image} download={`floorplan-${currentPlan.config || 'plan'}.png`}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', textDecoration: 'none' }}>
                          <Download size={12} /> PNG
                        </a>
                      )}
                      {viewMode === 'schematic' && (
                        <button onClick={handleDownloadSVG} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px' }}>
                          <Download size={12} /> SVG
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Blueprint (Gemini image) view */}
                  {viewMode === 'blueprint' && (
                    <div style={{ padding: '16px', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {blueprintLoading && !blueprintCache[activePlan] ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <Loader2 size={32} className="spin" style={{ marginBottom: '12px' }} />
                          <p style={{ fontSize: '13px' }}>Generating blueprint for {currentPlan?.config || currentPlan?.name}...</p>
                          <p style={{ fontSize: '11px', opacity: 0.6 }}>This may take 15-30 seconds</p>
                        </div>
                      ) : blueprintCache[activePlan] ? (
                        <div style={{ width: '100%' }}>
                          <img src={blueprintCache[activePlan].image} alt={`Floor Plan — ${currentPlan?.config || currentPlan?.name}`}
                            style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                          {blueprintCache[activePlan].description && (
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>{blueprintCache[activePlan].description}</p>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <AlertTriangle size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                          <p style={{ fontSize: '13px' }}>Blueprint generation unavailable — switch to Schematic view</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Schematic (SVG) view */}
                  {viewMode === 'schematic' && (
                    <>
                      <div style={{ padding: '16px' }}>
                        <FloorPlanSVG plan={currentPlan} svgRef={svgRef} />
                      </div>
                      <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(currentPlan.rooms || []).filter((r: any) => r.floor === 0 || !r.floor).reduce((acc: any[], r: any) => {
                          const color = getRoomColor(r.name);
                          if (!acc.find((a: any) => a.color === color)) acc.push({ name: r.name, color });
                          return acc;
                        }, []).map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                            {item.name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Right sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Compliance Panel */}
                  <CompliancePanel compliance={currentPlan.compliance} />

                  {/* Room Schedule */}
                  <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <button onClick={() => setShowRoomList(!showRoomList)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: showRoomList ? '1px solid var(--border-color)' : 'none' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Room Schedule ({currentPlan.rooms?.length || 0} rooms)</span>
                      {showRoomList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showRoomList && (
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'var(--border-color)' }}>
                              <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600 }}>Room</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>W × L</th>
                              <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>Area</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(currentPlan.rooms || []).filter((r: any) => r.floor === 0 || !r.floor).map((room: any, ri: number) => (
                              <tr key={ri} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '6px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: 2, background: getRoomColor(room.name) }} />
                                    {room.name}
                                  </div>
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>{room.width}×{room.length}</td>
                                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>{room.area}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Features & Badges */}
                  <div style={{ background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Features</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {currentPlan.vastu_compliant && <span className="detail-badge badge-green" style={{ fontSize: '11px' }}><Compass size={10} /> Vastu Compliant</span>}
                      {currentPlan.energy_rating && <span className="detail-badge badge-blue" style={{ fontSize: '11px' }}>Energy: {currentPlan.energy_rating}</span>}
                      {(currentPlan.features || []).map((f: string, fi: number) => (
                        <span key={fi} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'var(--border-color)', color: 'var(--text-secondary)' }}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : !loading && (
        <div style={{ background: 'var(--bg-card)', padding: '64px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <Building2 size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <h3>Configure Your Project & Generate</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', margin: '8px auto 0' }}>
            Plans are generated following NBC India 2016 norms with setback calculations, minimum room sizes, FSI checks, ventilation ratios, and Vastu guidelines.
          </p>
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

const ProjectsView = ({ user, onLoginClick, onGenerationsCleared }: any) => {
  const [generations, setGenerations] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; downloadUrl: string } | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/my/generations`, { headers: { ...authHeaders() } }).then(r => r.json()).then(d => Array.isArray(d) && setGenerations(d)).catch(() => {});
    fetch(`${API_URL}/my/designs`, { headers: { ...authHeaders() } }).then(r => r.json()).then(d => Array.isArray(d) && setDesigns(d)).catch(() => {});
    fetch(`${API_URL}/my/orders`, { headers: { ...authHeaders() } }).then(r => r.json()).then(d => Array.isArray(d) && setOrders(d)).catch(() => {});
  }, [user]);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all generation history? This cannot be undone.')) return;
    setClearing(true);
    try {
      const res = await fetch(`${API_URL}/my/generations`, { method: 'DELETE', headers: { ...authHeaders() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Failed to clear history: ${data.error || res.statusText || 'Unknown error'}`);
        return;
      }
      setGenerations([]);
      onGenerationsCleared?.();
    } catch (e: any) {
      alert(`Network error clearing history: ${e?.message || e}`);
    } finally {
      setClearing(false);
    }
  };

  const token = localStorage.getItem('token');
  const cloudinaryThumb = (url: string) =>
    url.includes('/upload/') && !url.includes('/upload/w_')
      ? url.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto,f_auto/')
      : url;
  const getFullImageUrl = (g: any) =>
    g.thumbnailUrl || `${API_URL}/my/generations/${g._id}/image?token=${token}`;
  const getDownloadUrl = (g: any) =>
    g.thumbnailUrl
      ? g.thumbnailUrl.replace('/upload/', `/upload/fl_attachment:${(g.title || 'generation').replace(/[^a-zA-Z0-9-_]/g, '-')}/`)
      : `${API_URL}/my/generations/${g._id}/download?token=${token}`;

  const typeIcons: any = { 'site-analysis': Building2, masterplan: Map, 'floor-plan': LayoutGrid, 'material-search': Package };
  const typeColors: any = { 'site-analysis': '#0066ff', masterplan: '#7c3aed', 'floor-plan': '#0891b2', 'material-search': '#d97706' };

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Generations</h3>
          {generations.length > 0 && (
            <button onClick={handleClearHistory} disabled={clearing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              {clearing ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
              {clearing ? 'Clearing...' : 'Clear All'}
            </button>
          )}
        </div>
        {generations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {generations.map((g: any) => {
              const Icon = typeIcons[g.type] || FileText;
              const color = typeColors[g.type] || '#0066ff';
              return (
                <div key={g._id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
                  {/* Thumbnail */}
                  {(() => {
                    const token = localStorage.getItem('token');
                    const sessionImg = g._id ? blueprintImageCache[String(g._id)] || null : null;
                    const imgUrl = sessionImg
                      || (g.thumbnailUrl ? cloudinaryThumb(g.thumbnailUrl) : null)
                      || (g.hasImage ? `${API_URL}/my/generations/${g._id}/image?token=${token}` : null);
                    return (
                      <div style={{ width: '120px', minHeight: '80px', flexShrink: 0, position: 'relative', overflow: 'hidden', cursor: imgUrl ? 'pointer' : 'default' }}
                        onClick={() => imgUrl && setPreviewImage({ url: getFullImageUrl(g), title: g.title, downloadUrl: getDownloadUrl(g) })}>
                        {imgUrl ? (
                          <>
                            <img src={imgUrl} alt={g.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e: any) => { e.target.style.display = 'none'; }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                              onMouseEnter={(e: any) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e: any) => e.currentTarget.style.opacity = '0'}>
                              <Eye size={20} color="white" />
                            </div>
                          </>
                        ) : (
                          <div style={{ width: '100%', height: '100%', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}08` }}>
                            <Icon size={24} color={color} />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* Content */}
                  <div style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '14px' }}>{g.title}</strong>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{g.type?.replace(/-/g, ' ')} | {timeAgo(g.createdAt)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(() => {
                        const sessionImg = g._id ? blueprintImageCache[String(g._id)] || null : null;
                        const hasAnyImage = g.hasImage || g.thumbnailUrl || sessionImg;
                        const previewUrl = sessionImg || getFullImageUrl(g);
                        const downloadUrl = sessionImg ? sessionImg : getDownloadUrl(g);
                        return hasAnyImage ? (
                          <>
                            <button onClick={() => setPreviewImage({ url: previewUrl, title: g.title, downloadUrl })}
                              style={{ background: 'rgba(99,102,241,0.1)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex' }}
                              title="Preview">
                              <Eye size={14} />
                            </button>
                            <a href={downloadUrl}
                              download={sessionImg ? `${(g.title || 'floorplan').replace(/[^a-zA-Z0-9-_]/g, '-')}.png` : undefined}
                              style={{ background: 'rgba(16,185,129,0.1)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#10b981', display: 'flex', textDecoration: 'none' }}
                              title="Download">
                              <Download size={14} />
                            </a>
                          </>
                        ) : null;
                      })()}
                      <span className="detail-badge badge-green">{g.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No AI analyses yet. Try Site Analyzer, Floor Plans, or Masterplan Explorer.</p>
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <ImagePreviewModal
            imageUrl={previewImage.url}
            title={previewImage.title}
            downloadUrl={previewImage.downloadUrl}
            onClose={() => setPreviewImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('home');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true;
  });

  useEffect(() => { document.body.classList.toggle('dark', isDarkMode); localStorage.setItem('theme', isDarkMode ? 'dark' : 'light'); }, [isDarkMode]);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [myGenerations, setMyGenerations] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');

  const [prompt, setPrompt] = useState('');
  const selectedFile = null;

  const [quickGen, setQuickGen] = useState<{ loading: boolean; result: any; tool: string; error: string } | null>(null);

  const TOOL_LABELS: Record<string, string> = {
    site:      'Site Analyzer',
    floor:     'Floor Plans',
    market:    'Masterplan Explorer',
    materials: 'Material Finder',
  };

  const handleQuickGenerate = async (tool: string) => {
    if (!prompt.trim()) { setCurrentView(tool); return; }
    setQuickGen({ loading: true, result: null, tool, error: '' });
    try {
      let result: any;
      if (tool === 'market') {
        const res = await fetch(`${API_URL}/masterplan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ city: prompt, country: 'India' }) });
        result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Generation failed');
      } else if (tool === 'materials') {
        const res = await fetch(`${API_URL}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ query: prompt, location: 'India' }) });
        result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Generation failed');
      } else if (tool === 'floor') {
        const res = await fetch(`${API_URL}/floorplan`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ bedrooms: 3, budget: '50-80 Lakhs', style: 'Modern', area: '1200 sqft', location: prompt, plotWidth: 30, plotLength: 40, floors: 1, facing: 'North' }) });
        result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Generation failed');
      } else {
        result = { _siteMsg: true };
      }
      setQuickGen({ loading: false, result, tool, error: '' });
    } catch (err: any) {
      setQuickGen({ loading: false, result: null, tool, error: err.message });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json()).then(data => { if (!data.error) setUser(data); }).catch(() => {});
    }
  }, []);


  const fetchDesigns = useCallback((cat?: string) => {
    const url = cat && cat !== 'All' ? `${API_URL}/designs?category=${cat}` : `${API_URL}/designs`;
    fetch(url).then(r => r.json()).then(d => Array.isArray(d) && setDesigns(d)).catch(() => {});
  }, []);

  const fetchMyGenerations = useCallback(() => {
    if (!user) return;
    fetch(`${API_URL}/my/generations?limit=10`, { headers: { ...authHeaders() } })
      .then(r => r.json()).then(d => Array.isArray(d) && setMyGenerations(d)).catch(() => {});
  }, [user]);

  useEffect(() => { fetchMyGenerations(); }, [fetchMyGenerations]);
  useEffect(() => { fetchDesigns(activeTab); }, [fetchDesigns, activeTab]);

  const refreshAll = () => { fetchMyGenerations(); };
  const openLogin = () => { setIsLoginView(true); setIsAuthModalOpen(true); };

  const [clearingRecent, setClearingRecent] = useState(false);
  const handleClearRecent = async () => {
    if (!user) { alert('Please log in first.'); return; }
    if (!window.confirm('Clear all recent generation history? This cannot be undone.')) return;
    setClearingRecent(true);
    try {
      const res = await fetch(`${API_URL}/my/generations`, { method: 'DELETE', headers: { ...authHeaders() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Failed to clear history: ${data.error || res.statusText || 'Unknown error'}`);
        return;
      }
      setMyGenerations([]);
    } catch (e: any) {
      alert(`Network error clearing history: ${e?.message || e}`);
    } finally {
      setClearingRecent(false);
    }
  };

  const handleBannerGenerate = () => {
    if (selectedFile) { setCurrentView('site'); return; }
    if (!prompt) return;
    const lower = prompt.toLowerCase();
    const floorKeywords = ['bhk', 'floor plan', 'floorplan', 'bedroom', 'house plan', 'cabin', 'villa', 'apartment', 'duplex', 'bungalow', 'penthouse', 'studio', 'flat', 'residence', 'layout', 'room', 'plan', 'design', 'home', 'house', 'property', 'plot', 'sqft', 'sq ft', 'square feet', 'square foot', 'floor', 'storey', 'story', 'floors', 'balcony', 'kitchen', 'bathroom', 'living', 'dining', 'garage', 'office', 'space', 'interior', 'architecture', 'blueprint', 'vastu', 'modern', 'contemporary', 'townhouse', 'row house', 'farmhouse', 'cottage', 'mansion'];
    const materialKeywords = ['material', 'cement', 'steel', 'brick', 'tile', 'paint', 'wood', 'marble', 'granite', 'plywood', 'sand', 'aggregate', 'rebar', 'concrete', 'glass', 'iron', 'aluminium', 'aluminum', 'copper', 'pvc', 'pipe', 'flooring', 'roofing', 'insulation', 'waterproof', 'adhesive', 'grout', 'plaster', 'gypsum', 'stone', 'limestone', 'slate', 'ceramic', 'vinyl', 'laminate', 'hardwood', 'softwood', 'mdf', 'ply', 'block', 'cost', 'price', 'rate', 'buy', 'supplier', 'vendor', 'supply', 'estimate', 'budget', 'cheap', 'affordable', 'best'];
    const siteKeywords = ['site', 'construction', 'analyze', 'analysis', 'building', 'progress', 'stage', 'photo', 'image', 'upload', 'detect', 'inspect', 'inspection', 'survey', 'foundation', 'structure', 'structural', 'under construction', 'demolish', 'demolition', 'contractor', 'worker', 'crane', 'excavation', 'excavate', 'scaffold', 'scaffolding', 'slab', 'column', 'beam', 'footing', 'retaining', 'wall', 'roof', 'civil', 'project site', 'land', 'plot analysis', 'valuation', 'risk'];
    if (floorKeywords.some(k => lower.includes(k))) setCurrentView('floor');
    else if (materialKeywords.some(k => lower.includes(k))) setCurrentView('materials');
    else if (siteKeywords.some(k => lower.includes(k))) setCurrentView('site');
    else setCurrentView('market');
  };

  const typeIcons: any = { 'site-analysis': Building2, masterplan: Map, 'floor-plan': LayoutGrid, 'material-search': Package };
  const typeColors: any = { 'site-analysis': '#0066ff', masterplan: '#7c3aed', 'floor-plan': '#0891b2', 'material-search': '#d97706' };
  const typeThumbnails: any = {
    'site-analysis': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=120&h=80&fit=crop',
    'masterplan': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=120&h=80&fit=crop',
    'floor-plan': 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=120&h=80&fit=crop',
    'material-search': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=120&h=80&fit=crop'
  };
  const typeNavTargets: any = { 'site-analysis': 'site', 'masterplan': 'market', 'floor-plan': 'floor', 'material-search': 'materials' };

  if (isMobile) {
    return (
      <MobileApp 
        user={user} 
        onLoginClick={openLogin} 
        onLogout={() => { localStorage.removeItem('token'); setUser(null); setMyGenerations([]); }}
        currentView={currentView}
        setCurrentView={setCurrentView}
        prompt={prompt}
        setPrompt={setPrompt}
        handleGenerate={handleBannerGenerate}
        designs={designs}
        myGenerations={myGenerations}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedDesign={setSelectedDesign}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      >
        {currentView === 'site' && <SiteView user={user} onLoginClick={openLogin} onGenerated={refreshAll} />}
        {currentView === 'market' && <MarketView user={user} onLoginClick={openLogin} onGenerated={refreshAll} />}
        {currentView === 'floor' && <FloorView onGenerated={refreshAll} />}
        {currentView === 'materials' && <MaterialsView onGenerated={refreshAll} />}
        {currentView === 'projects' && <ProjectsView user={user} onLoginClick={openLogin} />}
      </MobileApp>
    );
  }

  return (
    <div className="app-container">
      <div className="body-layout">
        <Sidebar active={currentView} setActive={setCurrentView} user={user} onLogout={() => { localStorage.removeItem('token'); setUser(null); setMyGenerations([]); }} onLoginClick={openLogin} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />

        <div className="main-content">
          <AnimatePresence mode="wait">
            <motion.div key={currentView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} style={{ width: '100%', height: '100%', paddingBottom: '40px' }}>

              {currentView === 'home' && (
                <>
                  <div className="hero-section">
                    <div className="hero-bg" style={{ backgroundImage: 'url(/banner.jpg)' }}></div>
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
                        <div className="prompt-quick-links">
                          {[
                            { icon: Building2, label: 'Site Analyzer', view: 'site' },
                            { icon: LayoutGrid, label: 'Floor Plans', view: 'floor' },
                            { icon: Map, label: 'Masterplan', view: 'market' },
                            { icon: Package, label: 'Materials', view: 'materials' },
                          ].map(item => (
                            <button key={item.view} className="prompt-quick-link" onClick={() => handleQuickGenerate(item.view)}>
                              <item.icon size={12} /> {item.label}
                            </button>
                          ))}
                        </div>

                        {/* Quick generation result */}
                        {quickGen && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                            {quickGen.loading ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                <Loader2 size={14} className="spin" /> Generating preview…
                              </div>
                            ) : quickGen.error ? (
                              <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>{quickGen.error}</p>
                            ) : quickGen.result?._siteMsg ? (
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                                Site Analyzer requires a construction site photo. Upload one in the dedicated tool for AI-powered stage detection and valuation.
                              </p>
                            ) : quickGen.result?.hotspots?.[0] ? (
                              <div style={{ marginBottom: '12px' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>Top hotspot</p>
                                <strong style={{ fontSize: '14px' }}>{quickGen.result.hotspots[0].name}</strong>
                                <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>{quickGen.result.hotspots[0].typology}</span>
                                {quickGen.result.hotspots[0].ticketSizeINR && (
                                  <p style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, margin: '4px 0' }}>
                                    ₹{(quickGen.result.hotspots[0].ticketSizeINR.min / 1e7).toFixed(1)}–{(quickGen.result.hotspots[0].ticketSizeINR.max / 1e7).toFixed(1)} Cr
                                  </p>
                                )}
                                {quickGen.result.hotspots[0].reasonNotes?.[0] && (
                                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{quickGen.result.hotspots[0].reasonNotes[0]}</p>
                                )}
                              </div>
                            ) : quickGen.result?.materials?.[0] ? (
                              <div style={{ marginBottom: '12px' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>Top result</p>
                                <strong style={{ fontSize: '14px' }}>{quickGen.result.materials[0].name}</strong>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{quickGen.result.materials[0].brand} · {quickGen.result.materials[0].grade}</p>
                              </div>
                            ) : quickGen.result?.plans?.[0] ? (
                              <div style={{ marginBottom: '12px' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>Generated plan</p>
                                <strong style={{ fontSize: '14px' }}>{quickGen.result.plans[0].config || quickGen.result.plans[0].name}</strong>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                                  {quickGen.result.plans[0].totalArea} · Est. {quickGen.result.plans[0].estimatedCost}
                                </p>
                              </div>
                            ) : null}

                            {!quickGen.loading && (
                              <button
                                onClick={() => setCurrentView(quickGen.tool)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', borderRadius: '8px', fontSize: '12px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                              >
                                <Sparkles size={12} /> Open {TOOL_LABELS[quickGen.tool]}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                  </div>

                  <div className="firefly-categories">
                    {['⭐ Featured', '✨ Generative AI', '🏢 Commercial', '🏠 Residential', '📐 Floor Plans', '📦 Materials'].map((cat, i) => (
                      <div key={i} className={`firefly-chip ${i === 0 ? 'active' : ''}`}>{cat}</div>
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

                    <motion.div className="firefly-card" whileHover={{ y: -4 }} onClick={() => window.open('https://www.builtattic.com/pages/chatbot', '_blank')}>
                      <img src="https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=400&h=250&fit=crop" alt="Chatbot" />
                      <div className="card-body">
                        <h4>Chatbot</h4>
                        <p>Interact with our intelligent assistant for quick answers.</p>
                        <span className="card-badge"><MessageSquare size={12}/> Builtattic AI</span>
                      </div>
                    </motion.div>

                    <motion.div className="firefly-card" whileHover={{ y: -4 }}>
                      <div style={{ height: '150px', background: 'linear-gradient(135deg, #1e1e24, #0f0f13)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Rocket size={48} color="#8b5cf6" opacity={0.5} />
                      </div>
                      <div className="card-body">
                        <h4>More features coming soon</h4>
                        <p>We're constantly building new AI tools for your workflow.</p>
                        <span className="card-badge"><Rocket size={12}/> Coming Soon</span>
                      </div>
                    </motion.div>
                  </div>

                  <div style={{ margin: '0 24px 48px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Live from Builtattic Marketplace</h3>
                      <div className="firefly-categories" style={{ margin: 0, gap: '8px' }}>
                        {['All', 'Residential', 'Commercial', 'Institutional', 'Recreational'].map(t => (
                          <div key={t} className={`firefly-chip ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)} style={{ padding: '6px 12px', fontSize: '11px' }}>
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <motion.div 
                      className="firefly-grid" style={{ padding: 0 }}
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: { staggerChildren: 0.1 }
                        }
                      }}
                      initial="hidden"
                      animate="show"
                      key={activeTab} // re-trigger animation on tab change
                    >
                      {designs.slice(0, 8).map((d: any) => (
                        <motion.div 
                          key={d._id} 
                          className="firefly-card" 
                          whileHover={{ y: -6, scale: 1.02 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          variants={{
                            hidden: { opacity: 0, y: 20 },
                            show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                          }}
                          onClick={() => setSelectedDesign(d)}
                        >
                          {d.thumbnail ? (
                            <img src={d.thumbnail} alt={d.title} onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1503387762-592dea58ef21?w=400&h=200&fit=crop'; }} />
                          ) : (
                            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
                              <Building2 size={28} color="var(--accent-primary)" />
                            </div>
                          )}
                          <div className="card-body">
                            <h4 style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 0 4px' }}>{d.title}</h4>
                            
                            {d.totalPrice != null && d.totalPrice > 0 ? (
                              <p style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '15px', margin: '4px 0 8px' }}>
                                ₹{d.totalPrice.toLocaleString()}
                              </p>
                            ) : (
                              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 8px' }}>
                                {d.specifications?.area ? `${d.specifications.area} sq ft` : 'Custom Design'}
                              </p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="card-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '3px 6px', fontSize: '10px' }}>{d.category}</span>
                              
                              {d.creator && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {d.creator.avatar ? (
                                    <img src={d.creator.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                                  ) : (
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700 }}>
                                      {d.creator.name?.charAt(0)}
                                    </div>
                                  )}
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{d.creator.name?.split(' ')[0]}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </>
              )}

              {currentView === 'site' && <SiteView user={user} onLoginClick={openLogin} onGenerated={refreshAll} />}
              {currentView === 'market' && <MarketView user={user} onLoginClick={openLogin} onGenerated={refreshAll} />}
              {currentView === 'floor' && <FloorView onGenerated={refreshAll} />}
              {currentView === 'materials' && <MaterialsView onGenerated={refreshAll} />}
              {currentView === 'projects' && <ProjectsView user={user} onLoginClick={openLogin} onGenerationsCleared={refreshAll} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={`right-panel ${!isRightSidebarOpen ? 'collapsed' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
            {isRightSidebarOpen && <h3 style={{ margin: 0 }}>Recent files</h3>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isRightSidebarOpen && user && myGenerations.length > 0 && (
                <button onClick={handleClearRecent} disabled={clearingRecent}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: clearingRecent ? 'default' : 'pointer', transition: 'all 0.2s' }}
                  title="Clear all generation history">
                  {clearingRecent ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                  {clearingRecent ? 'Clearing...' : 'Clear All'}
                </button>
              )}
              <button className="toggle-right-sidebar" onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}>
                {isRightSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            </div>
          </div>
          
          {isRightSidebarOpen && (
            user && myGenerations.length > 0 ? (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {myGenerations.map((gen: any) => {
                  const Icon = typeIcons[gen.type] || FileText;
                  const color = typeColors[gen.type] || '#0066ff';
                  const navTarget = typeNavTargets[gen.type] || 'projects';
                  const token = localStorage.getItem('token');
                  const sessionImg = gen._id ? (blueprintImageCache[String(gen._id)] || null) : null;
                  const storedImageUrl = sessionImg || gen.thumbnailUrl || (gen.hasImage ? `${API_URL}/my/generations/${gen._id}/image?token=${token}` : null);
                  const fallbackThumb = typeThumbnails[gen.type];
                  return (
                    <div key={gen._id} className="recent-gen-item-v2" onClick={() => setCurrentView(navTarget)}>
                      <div className="recent-gen-thumb">
                        {storedImageUrl ? (
                          <img src={storedImageUrl} alt={gen.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} onError={(e: any) => { e.target.src = fallbackThumb || ''; }} />
                        ) : fallbackThumb ? (
                          <img src={fallbackThumb} alt={gen.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: `${color}15`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={20} color={color} />
                          </div>
                        )}
                        <div className="recent-gen-type-badge" style={{ background: `${color}20`, color }}>
                          <Icon size={10} /> {gen.type?.replace(/-/g, ' ')}
                        </div>
                      </div>
                      <div style={{ padding: '6px 10px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{gen.title}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{timeAgo(gen.createdAt)}</div>
                        </div>
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
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAuthModalOpen && <AuthModal isLogin={isLoginView} setIsLogin={setIsLoginView} onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(userData: any) => { setUser(userData); setIsAuthModalOpen(false); fetchMyGenerations(); }} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDesign && <DesignDetail design={selectedDesign} onClose={() => setSelectedDesign(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
