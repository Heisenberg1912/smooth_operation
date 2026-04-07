const fs = require('fs');
let code = fs.readFileSync('D:/adobe/src/App.tsx', 'utf8');

// remove unused imports
code = code.replace(/Sparkles, Upload, X, LogOut, LogIn, Moon, Sun, Briefcase, FileText,/, 'Sparkles, Upload, X, LogIn, Moon, Sun, Briefcase, FileText,');
code = code.replace(/TrendingUp, Users, Eye, CheckCircle2, Loader2, Star,/, 'TrendingUp, CheckCircle2, Loader2,');
code = code.replace(/ShoppingBag, MessageCircle, Shield, AlertTriangle, ChevronDown, ChevronUp,/, 'Shield, AlertTriangle, ChevronDown, ChevronUp,');

// remove unused state vars
code = code.replace(/const \[activeTab, setActiveTab\] = useState\('All'\);\n/, '');
code = code.replace(/const \[stats, setStats\] = useState<any>\(null\);\n/, '');
code = code.replace(/const \[designs, setDesigns\] = useState<any\[\]>\(\[\]\);\n/, '');
code = code.replace(/const \[associates, setAssociates\] = useState<any\[\]>\(\[\]\);\n/, '');
code = code.replace(/const \[selectedFile, setSelectedFile\] = useState<File \| null>\(null\);\n/, 'const selectedFile = null;\n');
code = code.replace(/const handleTabChange = \(tab: string\) => { setActiveTab\(tab\); fetchDesigns\(tab\); };\n/, '');

fs.writeFileSync('D:/adobe/src/App.tsx', code);
