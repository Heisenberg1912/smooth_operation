const fs = require('fs');

let code = fs.readFileSync('D:/adobe/src/App.tsx', 'utf8');

// 1. Add 'fetchDesigns' and 'designs' state
const appRegex = /const \[myGenerations, setMyGenerations\] = useState<any\[\]>\(\[\]\);/;
const appReplacement = `const [myGenerations, setMyGenerations] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');`;
code = code.replace(appRegex, appReplacement);

const fetchGenerationsRegex = /const fetchMyGenerations = useCallback\(\(\) => \{\s*if \(\!user\) return;\s*fetch\(`\$\{API_URL\}\/my\/generations\?limit=10`, \{ headers: \{ \.\.\.authHeaders\(\) \} \}\)\s*\.then\(r => r\.json\(\)\)\.then\(d => Array\.isArray\(d\) && setMyGenerations\(d\)\)\.catch\(\(\) => \{\}\);\s*\}, \[user\]\);/;

const fetchGenerationsReplacement = `const fetchDesigns = useCallback((cat?: string) => {
    const url = cat && cat !== 'All' ? \`\${API_URL}/designs?category=\${cat}\` : \`\${API_URL}/designs\`;
    fetch(url).then(r => r.json()).then(d => Array.isArray(d) && setDesigns(d)).catch(() => {});
  }, []);

  const fetchMyGenerations = useCallback(() => {
    if (!user) return;
    fetch(\`\${API_URL}/my/generations?limit=10\`, { headers: { ...authHeaders() } })
      .then(r => r.json()).then(d => Array.isArray(d) && setMyGenerations(d)).catch(() => {});
  }, [user]);`;

if(code.match(fetchGenerationsRegex)) {
    code = code.replace(fetchGenerationsRegex, fetchGenerationsReplacement);
}

const useEffectRegex = /useEffect\(\(\) => \{ fetchMyGenerations\(\); \}, \[fetchMyGenerations\]\);/;
const useEffectReplacement = `useEffect(() => { fetchMyGenerations(); }, [fetchMyGenerations]);
  useEffect(() => { fetchDesigns(activeTab); }, [fetchDesigns, activeTab]);`;
code = code.replace(useEffectRegex, useEffectReplacement);

// 2. Replace static scraped data with dynamic designs mapping and better transition
const staticDataRegex = /<div style=\{\{ margin: '0 24px 48px' \}\}>[\s\S]*?<\/div>\s*<\/>\s*\)\}/;

const dynamicDesignsReplacement = `<div style={{ margin: '0 24px 48px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Live from Builtattic Marketplace</h3>
                      <div className="firefly-categories" style={{ margin: 0, gap: '8px' }}>
                        {['All', 'Residential', 'Commercial', 'Institutional', 'Recreational'].map(t => (
                          <div key={t} className={\`firefly-chip \${activeTab === t ? 'active' : ''}\`} onClick={() => setActiveTab(t)} style={{ padding: '6px 12px', fontSize: '11px' }}>
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
                                {d.specifications?.area ? \`\${d.specifications.area} sq ft\` : 'Custom Design'}
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
              )}`;

if(code.match(staticDataRegex)) {
    code = code.replace(staticDataRegex, dynamicDesignsReplacement);
}

fs.writeFileSync('D:/adobe/src/App.tsx', code);
