const fs = require('fs');
let code = fs.readFileSync('D:/adobe/src/App.tsx', 'utf8');

// Restore designs in ProjectsView
code = code.replace(
  /const \[generations, setGenerations\] = useState<any\[\]>\(\[\]\);\n    const \[orders, setOrders\] = useState<any\[\]>\(\[\]\);/,
  "const [generations, setGenerations] = useState<any[]>([]);\n  const [designs, setDesigns] = useState<any[]>([]);\n  const [orders, setOrders] = useState<any[]>([]);"
);

// Remove unused fetch functions and state in App
code = code.replace(
  /    const \[designs, setDesigns\] = useState<any\[\]>\(\[\]\);\n    const \[myGenerations, setMyGenerations\] = useState<any\[\]>\(\[\]\);/,
  "  const [myGenerations, setMyGenerations] = useState<any[]>([]);"
);

code = code.replace(
  /  const fetchStats = useCallback\(\(\) => \{ fetch\(`\$\{API_URL\}\/stats`\)\.then\(r => r\.json\(\)\)\.then\(setStats\)\.catch\(\(\) => \{\}\); \}, \[\]\);\n  const fetchDesigns = useCallback\(\(cat\?: string\) => \{\n    const url = cat && cat !== 'All' \? `\$\{API_URL\}\/designs\?category=\$\{cat\}` : `\$\{API_URL\}\/designs`;\n    fetch\(url\)\.then\(r => r\.json\(\)\)\.then\(d => Array\.isArray\(d\) && setDesigns\(d\)\)\.catch\(\(\) => \{\}\);\n  \}, \[\]\);\n  const fetchAssociates = useCallback\(\(\) => \{ fetch\(`\$\{API_URL\}\/associates`\)\.then\(r => r\.json\(\)\)\.then\(d => Array\.isArray\(d\) && setAssociates\(d\)\)\.catch\(\(\) => \{\}\); \}, \[\]\);/,
  ""
);

code = code.replace(
  /  useEffect\(\(\) => \{ fetchStats\(\); fetchDesigns\(\); fetchAssociates\(\); \}, \[fetchStats, fetchDesigns, fetchAssociates\]\);\n/,
  ""
);

code = code.replace(
  /    const refreshAll = \(\) => \{ fetchStats\(\); fetchDesigns\(\); fetchMyGenerations\(\); \};/,
  "  const refreshAll = () => { fetchMyGenerations(); };"
);

fs.writeFileSync('D:/adobe/src/App.tsx', code);
