import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// ─── Lightweight Markdown Renderer ───────────────────────────────────────────
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  const renderInline = (text) => {
    // Bold+Italic: ***text***
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold: **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    return text;
  };

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={i} className="md-code-block">
          {lang && <div className="md-code-lang">{lang}</div>}
          <pre><code>{codeLines.join('\n')}</code></pre>
        </div>
      );
    }
    // Heading H3
    else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="md-h3" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(4)) }} />);
    }
    // Heading H2
    else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="md-h2" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }} />);
    }
    // Heading H1
    else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="md-h2" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />);
    }
    // Bullet list
    else if (line.match(/^[-*•] /)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^[-*•] /)) {
        listItems.push(<li key={i} dangerouslySetInnerHTML={{ __html: renderInline(lines[i].slice(2)) }} />);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="md-list">{listItems}</ul>);
      continue;
    }
    // Numbered list
    else if (line.match(/^\d+\. /)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(<li key={i} dangerouslySetInnerHTML={{ __html: renderInline(lines[i].replace(/^\d+\. /, '')) }} />);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="md-list">{listItems}</ol>);
      continue;
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="md-hr" />);
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="md-spacer" />);
    }
    // Normal paragraph
    else {
      elements.push(<p key={i} className="md-p" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />);
    }
    i++;
  }

  return <div className="markdown-body">{elements}</div>;
};


// Sleek, Minimalist SVG Icons (ChatGPT/Gemini Style)
const ChatIcon = ({ size = 18, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const DocumentIcon = ({ size = 18, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const PlusIcon = ({ size = 16, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = ({ size = 16, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

const SettingsIcon = ({ size = 16, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// AskLocal brand icon — chat bubble + document + circuit lines
const AskLocalIcon = ({ size = 20, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <defs>
      <linearGradient id="alBubble" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6d28d9"/>
        <stop offset="100%" stopColor="#4338ca"/>
      </linearGradient>
      <linearGradient id="alDoc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#818cf8"/>
      </linearGradient>
    </defs>
    <path d="M50 12 C28 12 10 27 10 46 C10 58 17 68 28 74 L22 90 L42 79 C44.6 79.6 47.3 80 50 80 C72 80 90 65 90 46 C90 27 72 12 50 12 Z" fill="url(#alBubble)"/>
    <g stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.8">
      <line x1="50" y1="30" x2="50" y2="23"/><circle cx="50" cy="21" r="2" fill="#06b6d4"/>
      <line x1="36" y1="46" x2="28" y2="46"/><circle cx="26" cy="46" r="2" fill="#06b6d4"/>
      <line x1="64" y1="46" x2="72" y2="46"/><circle cx="74" cy="46" r="2" fill="#06b6d4"/>
    </g>
    <rect x="35" y="30" width="22" height="28" rx="3" fill="url(#alDoc)"/>
    <path d="M50 30 L50 38 L57 38" fill="#7c3aed" stroke="#c4b5fd" strokeWidth="1" strokeLinejoin="round"/>
    <line x1="39" y1="43" x2="53" y2="43" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <line x1="39" y1="48" x2="53" y2="48" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <line x1="39" y1="53" x2="49" y2="53" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

const UserIcon = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SearchIcon = ({ size = 14, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const WarningIcon = ({ size = 20, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SuccessIcon = ({ size = 20, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ErrorIcon = ({ size = 20, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const InfoIcon = ({ size = 20, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const BoltIcon = ({ size = 12, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const LightbulbIcon = ({ size = 14, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="10" y1="22" x2="14" y2="22" />
  </svg>
);

const ChevronLeftIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const SpinnerIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`spinner-icon ${className}`} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

const PinIcon = ({ size = 14, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.48A2 2 0 0 1 15 9.28V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.28a2 2 0 0 1-.78 1.24l-2.78 3.48A2 2 0 0 0 5 15.24V17z" />
  </svg>
);

const ExportIcon = ({ size = 16, className = "", style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState({});
  const [status, setStatus] = useState({ online: false, chatModel: '-', embeddingModel: '-', apiEndpoint: '-' });
  const [documents, setDocuments] = useState([]);
  const [showDocs, setShowDocs] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('chats'); // 'chats' veya 'docs'
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [showMentionsMenu, setShowMentionsMenu] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedFile, setMentionedFile] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [availableModels, setAvailableModels] = useState({ chat: [], embedding: [] });
  const [switchingModels, setSwitchingModels] = useState(false);
  const [selectedChatModel, setSelectedChatModel] = useState('');
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState('');
  const [showChatboxModelDropdown, setShowChatboxModelDropdown] = useState(false);
  const [downloadTargetModel, setDownloadTargetModel] = useState(null);
  const [downloadActive, setDownloadActive] = useState(false);
  const [isDownloadMinimized, setIsDownloadMinimized] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadModelName, setDownloadModelName] = useState('');
  const [downloadedMb, setDownloadedMb] = useState(0);
  const [totalMb, setTotalMb] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [deleteModelTarget, setDeleteModelTarget] = useState(null);
  const [reindexingFiles, setReindexingFiles] = useState({});
  const [indexingActiveFiles, setIndexingActiveFiles] = useState({});
  const [topK, setTopK] = useState(3);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.15);
  const [strictMode, setStrictMode] = useState(true);
  const [activeInspectorChunk, setActiveInspectorChunk] = useState(null);
  const [disabledDocs, setDisabledDocs] = useState(new Set()); // Devre dışı bırakılan dökümanlar
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // ── Export helpers ────────────────────────────────────────────────────────
  const getSessionTitle = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    return session ? session.title.replace(/[^a-z0-9\s_-]/gi, '').trim().replace(/\s+/g, '_') : 'chat';
  };

  const handleExportMarkdown = () => {
    if (!messages.length) return;
    const title = getSessionTitle();
    const date = new Date().toLocaleDateString('tr-TR');
    let md = `# ${title}\n\n_Dışa aktarıldı: ${date}_\n\n---\n\n`;
    messages.forEach(msg => {
      if (!msg.content) return;
      const role = msg.role === 'user' ? '**Kullanıcı**' : '**AskLocal**';
      md += `### ${role}\n\n${msg.content}\n\n`;
      if (msg.role === 'assistant' && msg.fileName) {
        md += `> 📄 Kaynak: \`${msg.fileName}\` — Benzerlik: %${msg.score || 0}\n\n`;
      }
      md += '---\n\n';
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'asklocal-sohbet'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    showNotification('Markdown olarak indirildi!', 'success');
  };

  const handleExportPDF = () => {
    if (!messages.length) return;
    setShowExportMenu(false);
    // Kısa gecikme ile UI kapansın, sonra print dialog açılsın
    setTimeout(() => window.print(), 150);
  };

  const handleToggleDocDisabled = (e, filename) => {
    e.stopPropagation();
    setDisabledDocs(prev => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  // Export menüsünü dışarı tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [systemStartupState, setSystemStartupState] = useState(() => {
    const alreadyReady = sessionStorage.getItem('backend_already_ready') === 'true';
    return {
      status: alreadyReady ? 'ready' : 'initializing',
      current_step: 'Checking system status...',
      model_alias: null,
      progress: alreadyReady ? 100 : 0,
      error: null
    };
  });



  const chatboxDropdownRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const currentSessionIdRef = useRef(currentSessionId);
  const isCreatingNewSessionRef = useRef(false);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' && window.location.port === '5173') {
        return 'http://localhost:8000';
      }
      return `${window.location.protocol}//${window.location.host}`;
    }
    return 'http://localhost:8000';
  };
  const BACKEND_URL = getBackendUrl();

  const getModelSizeString = (modelAlias) => {
    if (!modelAlias) return '';
    const allModels = [...(availableModels.chat || []), ...(availableModels.embedding || [])];
    const model = allModels.find(m => m.alias === modelAlias);
    return model && model.file_size_mb ? `(${(model.file_size_mb / 1024).toFixed(2)} GB)` : '';
  };

  const getSuggestedCards = () => {
    if (documents && documents.length > 0) {
      const latestDoc = [...documents].reduce((prev, current) => ((prev.max_id || 0) > (current.max_id || 0)) ? prev : current);
      const name = latestDoc.file_name;
      const cleanName = name.length > 22 ? name.substring(0, 19) + '...' : name;

      return [
        {
          icon: '🔍',
          accent: '#818cf8',
          title: 'Quick Summary',
          subtitle: `Condense ${cleanName} into key takeaways`,
          prompt: `Give me a concise summary of this document — what is it about and what are the most important points?`,
          file: name
        },
        {
          icon: '❓',
          accent: '#34d399',
          title: 'Ask a Question',
          subtitle: `Query specific facts in ${cleanName}`,
          prompt: `What are the most important facts, figures, or conclusions stated in this document?`,
          file: name
        },
        {
          icon: '📋',
          accent: '#fbbf24',
          title: 'Action Items',
          subtitle: `Extract to-dos or decisions from ${cleanName}`,
          prompt: `List any action items, decisions, deadlines, or next steps mentioned in this document.`,
          file: name
        },
        {
          icon: '🧩',
          accent: '#f87171',
          title: 'Compare & Contrast',
          subtitle: `Find comparisons or trade-offs`,
          prompt: `Are there any comparisons, trade-offs, pros and cons, or conflicting views discussed in this document?`,
          file: name
        }
      ];
    } else {
      return [
        {
          icon: '📂',
          accent: '#818cf8',
          title: 'Add Your First Document',
          subtitle: 'Upload a PDF, DOCX, PPTX or TXT file',
          prompt: 'How do I upload a document and start asking questions about it?',
          file: null
        },
        {
          icon: '⚡',
          accent: '#34d399',
          title: 'Offline & Private',
          subtitle: 'Your data never leaves your machine',
          prompt: 'How does AskLocal keep my documents private and offline?',
          file: null
        },
        {
          icon: '🎯',
          accent: '#fbbf24',
          title: 'Target a Document',
          subtitle: 'Use @ to focus on one file',
          prompt: 'How can I direct my question to a specific document using the @ mention feature?',
          file: null
        },
        {
          icon: '🔬',
          accent: '#f87171',
          title: 'Inspect Sources',
          subtitle: 'See exactly which chunk answered you',
          prompt: 'How does the source inspector work, and how do I see where an answer came from?',
          file: null
        }
      ];
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Polling for first-time startup/initialization status
  useEffect(() => {
    let intervalId = null;
    
    const checkStartupStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/startup-status`);
        if (res.ok) {
          const data = await res.json();
          setSystemStartupState(data);
          
          if (data.status === 'ready') {
            sessionStorage.setItem('backend_already_ready', 'true');
            fetchSystemStatus();
            fetchDocuments();
            fetchSessions();
            fetchAvailableModels();
            fetchSettings();
            if (intervalId) clearInterval(intervalId);
          }
        } else {
          setSystemStartupState(prev => ({
            ...prev,
            status: 'initializing',
            current_step: 'Connecting to backend...'
          }));
        }
      } catch (err) {
        setSystemStartupState(prev => ({
          ...prev,
          status: 'initializing',
          current_step: 'Waiting for backend server...'
        }));
      }
    };
    
    checkStartupStatus();
    intervalId = setInterval(checkStartupStatus, 800);
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Automatic background reconnection polling if backend is offline
  useEffect(() => {
    let intervalId = null;
    
    if (!status.online) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/status`);
          if (res.ok) {
            const data = await res.json();
            setStatus({
              online: true,
              chatModel: data.chat_model,
              embeddingModel: data.embedding_model,
              apiEndpoint: data.api_endpoint || 'http://localhost:8501 (Local)'
            });
            setSelectedChatModel(data.chat_model);
            setSelectedEmbeddingModel(data.embedding_model);
            
            // Connection established, fetch all data
            fetchDocuments();
            fetchSessions();
            fetchAvailableModels();
          }
        } catch (err) {
          // Still offline
        }
      }, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status.online]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingSessions, currentSessionId]);

  // Load messages when current session changes
  useEffect(() => {
    if (isCreatingNewSessionRef.current) {
      isCreatingNewSessionRef.current = false;
      return;
    }
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Click outside to close custom chatbox model dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatboxDropdownRef.current && !chatboxDropdownRef.current.contains(event.target)) {
        setShowChatboxModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Polling for model download progress
  useEffect(() => {
    let intervalId = null;
    
    if (downloadActive) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/models/download-status`);
          if (res.ok) {
            const data = await res.json();
            
            if (data.status === 'downloading') {
              setDownloadProgress(data.progress || 0);
              setDownloadedMb(data.downloaded_mb || 0);
              setTotalMb(data.total_mb || 0);
              setDownloadSpeed(data.speed || '');
            } else if (data.status === 'success') {
              setDownloadActive(false);
              setIsDownloadMinimized(false);
              showNotification(`Model ${data.model_alias} loaded successfully!`, "success");
              await fetchSystemStatus();
              await fetchDocuments();
            } else if (data.status === 'cancelled') {
              setDownloadActive(false);
              setIsDownloadMinimized(false);
              showNotification("Download cancelled.", "info");
              setSelectedChatModel(status.chatModel);
              setSelectedEmbeddingModel(status.embeddingModel);
            } else if (data.status === 'error') {
              setDownloadActive(false);
              setIsDownloadMinimized(false);
              showNotification(`Error downloading model: ${data.error}`, "error");
              setSelectedChatModel(status.chatModel);
              setSelectedEmbeddingModel(status.embeddingModel);
            }
          }
        } catch (err) {
          console.error("Error polling download status:", err);
        }
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [downloadActive, status.chatModel, status.embeddingModel]);

  // Polling for document indexing status
  useEffect(() => {
    let intervalId = null;
    
    const hasActiveIndexing = Object.values(indexingActiveFiles).some(
      file => file.status === 'processing'
    );
    
    if (hasActiveIndexing) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/documents/indexing-status`);
          if (res.ok) {
            const serverStates = await res.json();
            
            setIndexingActiveFiles(prev => {
              const updated = { ...prev };
              let changed = false;
              
              for (const filename of Object.keys(updated)) {
                const serverState = serverStates[filename];
                if (serverState) {
                  const prevState = updated[filename];
                  
                  if (
                    prevState.status !== serverState.status ||
                    prevState.progress !== serverState.progress ||
                    prevState.processed_chunks !== serverState.processed_chunks ||
                    prevState.total_chunks !== serverState.total_chunks ||
                    prevState.error !== serverState.error
                  ) {
                    updated[filename] = serverState;
                    changed = true;
                    
                    if (serverState.status === 'success') {
                      showNotification(`"${filename}" has been indexed successfully!`, 'success');
                      fetchDocuments();
                    } else if (serverState.status === 'error') {
                      showNotification(`Error indexing "${filename}": ${serverState.error}`, 'error');
                      fetchDocuments();
                    }
                  }
                }
              }
              
              return changed ? updated : prev;
            });
          }
        } catch (err) {
          console.error("Error polling document indexing status:", err);
        }
      }, 800);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [indexingActiveFiles]);

  const handleClearIndexingFile = async (filename) => {
    try {
      await fetch(`${BACKEND_URL}/api/documents/indexing-clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
    } catch (err) {
      console.error("Error clearing indexing status on server:", err);
    }
    setIndexingActiveFiles(prev => {
      const next = { ...prev };
      delete next[filename];
      return next;
    });
  };


  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/settings`);
      const data = await res.json();
      if (data) {
        if (data.top_k !== undefined) setTopK(data.top_k);
        if (data.similarity_threshold !== undefined) setSimilarityThreshold(data.similarity_threshold);
        if (data.strict_mode !== undefined) setStrictMode(data.strict_mode);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus({
          online: true,
          chatModel: data.chat_model,
          embeddingModel: data.embedding_model,
          apiEndpoint: data.api_endpoint || 'http://localhost:8501 (Local)'
        });
        setSelectedChatModel(data.chat_model);
        setSelectedEmbeddingModel(data.embedding_model);
      } else {
        setStatus(prev => ({ ...prev, online: false }));
      }
    } catch (err) {
      console.error("Error fetching system status:", err);
      setStatus(prev => ({ ...prev, online: false }));
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/models`);
      if (res.ok) {
        const data = await res.json();
        const chat = data.models.filter(m => m.type === 'chat');
        const embedding = data.models.filter(m => m.type === 'embedding');
        setAvailableModels({ chat, embedding });
      }
    } catch (err) {
      console.error("Error fetching available models:", err);
    }
  };

  const handleApplyModelSettings = async () => {
    setSwitchingModels(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/models/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_model: selectedChatModel,
          embedding_model: selectedEmbeddingModel,
        }),
      });
      
      if (res.ok) {
        // Save RAG settings
        await fetch(`${BACKEND_URL}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            top_k: topK,
            similarity_threshold: similarityThreshold,
            strict_mode: strictMode
          })
        });

        const data = await res.json();
        if (data.status === "downloading") {
          setDownloadModelName(selectedEmbeddingModel);
          setDownloadProgress(0);
          setDownloadActive(true);
        } else {
          showNotification("Configuration updated successfully!", "success");
          await fetchSystemStatus();
          await fetchDocuments();
        }
        setShowSettingsModal(false);
      } else {
        const errData = await res.json();
        showNotification(errData.detail || "Failed to switch models", "error");
      }
    } catch (err) {
      showNotification("Error connecting to server to change models", "error");
      console.error("Error updating models:", err);
    } finally {
      setSwitchingModels(false);
    }
  };

  const handleDirectModelSwitch = async (newChatModel, force = false) => {
    const modelInfo = availableModels.chat.find(m => m.alias === newChatModel);
    const isCached = modelInfo ? modelInfo.is_cached : true;
    
    if (!isCached && !force) {
      setDownloadTargetModel(newChatModel);
      return;
    }

    setSwitchingModels(true);
    setShowChatboxModelDropdown(false);
    setDownloadTargetModel(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/models/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_model: newChatModel,
          embedding_model: selectedEmbeddingModel || status.embeddingModel,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.status === "downloading") {
          setDownloadModelName(newChatModel);
          setDownloadProgress(0);
          setDownloadActive(true);
        } else {
          setSelectedChatModel(newChatModel);
          showNotification(`Switched chat model to ${newChatModel}`, "success");
          await fetchSystemStatus();
        }
      } else {
        const errData = await res.json();
        showNotification(errData.detail || "Failed to switch model", "error");
      }
    } catch (err) {
      showNotification("Error connecting to server to change model", "error");
      console.error("Error updating model:", err);
    } finally {
      setSwitchingModels(false);
    }
  };

  const handleCancelDownload = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/models/download-cancel`, {
        method: 'POST'
      });
      if (res.ok) {
        showNotification("Cancelling download...", "info");
      } else {
        showNotification("Failed to cancel download.", "error");
      }
    } catch (err) {
      console.error("Error cancelling download:", err);
      showNotification("Error connecting to server to cancel download", "error");
    }
  };

  const handleDeleteModel = async (modelAlias) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/models/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_alias: modelAlias }),
      });
      if (res.ok) {
        showNotification(`Model ${modelAlias} removed from cache.`, "success");
        await fetchAvailableModels();
        await fetchSystemStatus();
      } else {
        const errData = await res.json();
        showNotification(errData.detail || "Failed to delete model", "error");
      }
    } catch (err) {
      console.error("Error deleting model:", err);
      showNotification("Error connecting to server to delete model", "error");
    } finally {
      setDeleteModelTarget(null);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Error fetching indexed documents:", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map(m => ({
          role: m.role,
          content: m.content,
          context: m.context,
          score: m.score,
          fileName: m.file_name
        })));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleSelectSession = (sessionId) => {
    setCurrentSessionId(sessionId);
    if (window.innerWidth <= 768) {
      setShowDocs(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    if (window.innerWidth <= 768) {
      setShowDocs(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setIndexingActiveFiles(prev => ({
      ...prev,
      [file.name]: { status: 'processing', progress: 0, processed_chunks: 0, total_chunks: 0, error: null }
    }));
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'processing') {
          showNotification(`"${file.name}" is being indexed...`, "info");
        }
      } else {
        const err = await res.json();
        showNotification(`Error: ${err.detail || 'Failed to upload file.'}`, "error");
        setIndexingActiveFiles(prev => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      showNotification("Could not connect to the server.", "error");
      setIndexingActiveFiles(prev => {
        const next = { ...prev };
        delete next[file.name];
        return next;
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation(); // Prevent trigger session selection on click
    setDeleteTarget({ type: 'session', id: sessionId });
  };

  const handleDeleteDocument = (e, filename) => {
    e.stopPropagation();
    setDeleteTarget({ type: 'document', filename });
  };

  const handleReindexDocument = async (e, filename) => {
    e.stopPropagation();
    setReindexingFiles(prev => ({ ...prev, [filename]: true }));
    setIndexingActiveFiles(prev => ({
      ...prev,
      [filename]: { status: 'processing', progress: 0, processed_chunks: 0, total_chunks: 0, error: null }
    }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/reindex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        showNotification(`"${filename}" is being re-indexed...`, "info");
      } else {
        const data = await res.json();
        showNotification(`Failed to re-index document: ${data.detail || 'Unknown error'}`, "error");
        setIndexingActiveFiles(prev => {
          const next = { ...prev };
          delete next[filename];
          return next;
        });
      }
    } catch (err) {
      showNotification(`Connection error: ${err.message}`, "error");
      setIndexingActiveFiles(prev => {
        const next = { ...prev };
        delete next[filename];
        return next;
      });
    } finally {
      setReindexingFiles(prev => {
        const next = { ...prev };
        delete next[filename];
        return next;
      });
    }
  };

  const handleTogglePinSession = async (e, sessionId, isPinned) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !isPinned })
      });
      if (res.ok) {
        showNotification(isPinned ? "Chat unpinned." : "Chat pinned to the top.", "success");
        fetchSessions();
      } else {
        showNotification("Failed to toggle pin.", "error");
      }
    } catch (err) {
      console.error("Error toggling pin:", err);
      showNotification("Could not connect to the server.", "error");
    }
  };

  const handleTogglePinDocument = async (e, filename, isPinned) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${encodeURIComponent(filename)}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !isPinned })
      });
      if (res.ok) {
        showNotification(isPinned ? "Document unpinned." : "Document pinned to the top.", "success");
        fetchDocuments();
      } else {
        showNotification("Failed to toggle pin.", "error");
      }
    } catch (err) {
      console.error("Error toggling pin:", err);
      showNotification("Could not connect to the server.", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'session') {
      const sessionId = deleteTarget.id;
      try {
        const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          showNotification("Chat history deleted successfully.", "success");
          
          // Remove the session from UI state
          setSessions(prev => prev.filter(s => s.id !== sessionId));

          if (currentSessionId === sessionId) {
            setCurrentSessionId(null);
            setMessages([]);
            
            // If there are other sessions, automatically select the next latest one
            const remaining = sessions.filter(s => s.id !== sessionId);
            if (remaining.length > 0) {
              setCurrentSessionId(remaining[0].id);
            }
          }
        } else {
          showNotification("An error occurred while deleting chat history.", "error");
        }
      } catch (err) {
        console.error("Error deleting session:", err);
        showNotification("Could not connect to the server.", "error");
      }
    } else if (deleteTarget.type === 'document') {
      const filename = deleteTarget.filename;
      try {
        const res = await fetch(`${BACKEND_URL}/api/documents/${encodeURIComponent(filename)}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          showNotification("Document and database indices deleted successfully.", "success");
          fetchDocuments();
        } else {
          const err = await res.json();
          showNotification(`Error: ${err.detail || 'Failed to delete document.'}`, "error");
        }
      } catch (err) {
        console.error("Error deleting document:", err);
        showNotification("Could not connect to the server.", "error");
      }
    }

    setDeleteTarget(null);
  };

  const sendMessageText = async (text, fileMention = null) => {
    if (!text.trim() || (currentSessionId && loadingSessions[currentSessionId])) return;

    // 1. Eğer aktif sohbet yoksa yeni bir session (oturum) ID'si oluşturuyoruz
    let sessionId = currentSessionId;
    let isNewSession = false;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      isNewSession = true;
      
      const tempTitle = text.length > 30 ? text.substring(0, 30) + "..." : text;
      // Backend'de session'ı oluştur
      await fetch(`${BACKEND_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, title: tempTitle })
      });
      isCreatingNewSessionRef.current = true;
      setCurrentSessionId(sessionId);
      await fetchSessions();
    }

    const activeMention = fileMention || mentionedFile;

    const userMessage = { 
      role: 'user', 
      content: text,
      fileName: activeMention ? activeMention : undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setMentionedFile(null);
    setLoadingSessions(prev => ({ ...prev, [sessionId]: true }));

    // Kullanıcı mesajını veritabanına kaydet
    await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'user',
        content: userMessage.content,
        file_name: userMessage.fileName
      })
    });

    try {
      // Devre dışı dökümanları excluded_files olarak gönder
      const excludedFiles = disabledDocs.size > 0 ? Array.from(disabledDocs) : [];

      const res = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userMessage.content,
          target_file: userMessage.fileName,
          excluded_files: excludedFiles
        })
      });

      if (res.ok) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let finished = false;
        let streamedContent = "";
        let finalMetadata = null;

        // Add initial empty assistant message
        let initialBotMessage = {
          role: 'assistant',
          content: '',
          context: '',
          score: 0.0,
          fileName: ''
        };
        
        if (currentSessionIdRef.current === sessionId) {
          setMessages(prev => [...prev, initialBotMessage]);
        }

        let buffer = "";

        while (!finished) {
          const { value, done } = await reader.read();
          finished = done;
          if (value) {
            buffer += decoder.decode(value, { stream: !finished });
            const lines = buffer.split("\n");
            buffer = lines.pop(); // Keep last partial chunk

            for (const line of lines) {
              const cleaned = line.trim();
              if (cleaned.startsWith("data:")) {
                try {
                  const dataStr = cleaned.slice(5).trim();
                  const dataObj = JSON.parse(dataStr);

                  if (dataObj.error) {
                    streamedContent += `\nError: ${dataObj.error}`;
                  } else if (dataObj.token !== undefined) {
                    streamedContent += dataObj.token;
                  } else if (dataObj.context !== undefined) {
                    finalMetadata = {
                      context: dataObj.context,
                      score: dataObj.score,
                      file_name: dataObj.file_name
                    };
                  }

                  if (currentSessionIdRef.current === sessionId) {
                    setMessages(prev => {
                      const next = [...prev];
                      const lastMsg = next[next.length - 1];
                      if (lastMsg && lastMsg.role === 'assistant') {
                        lastMsg.content = streamedContent;
                        if (finalMetadata) {
                          lastMsg.context = finalMetadata.context;
                          lastMsg.score = finalMetadata.score;
                          lastMsg.fileName = finalMetadata.file_name;
                        }
                      }
                      return next;
                    });
                  }
                } catch (e) {
                  // Buffer incomplete chunk
                }
              }
            }
          }
        }

        // Ensure loading state is fully cleared
        setLoadingSessions(prev => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });

        // Save assistant message to DB
        await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'assistant',
            content: streamedContent,
            context: finalMetadata ? finalMetadata.context : null,
            score: finalMetadata ? finalMetadata.score : null,
            file_name: finalMetadata ? finalMetadata.file_name : null
          })
        });

      } else {
        const errorData = await res.json();
        setLoadingSessions(prev => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
        if (currentSessionIdRef.current === sessionId) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${errorData.detail || 'Something went wrong.'}`
          }]);
        }
      }
    } catch (err) {
      console.error("Chat request failed:", err);
      if (currentSessionIdRef.current === sessionId) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Could not communicate with the server. Please make sure the FastAPI backend server is running.'
        }]);
      }
    } finally {
      setLoadingSessions(prev => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      if (currentSessionIdRef.current === sessionId) {
        fetchMessages(sessionId);
      }
      // Başlıkları ve seans listesini güncelle
      fetchSessions();
      fetchDocuments();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    await sendMessageText(input, mentionedFile);
  };
  return (
    <div className="app-container">
      <div className={`startup-overlay-wrapper ${systemStartupState.status === 'ready' ? 'ready' : ''}`}>
        <div className="startup-overlay-content glass-panel">
          <div className="startup-logo-container">
            <AskLocalIcon size={28} style={{ position: 'absolute' }} />
            <div className="startup-logo-spinner"></div>
          </div>
          
          <h2 className="startup-title">AskLocal — Başlatılıyor</h2>
          <p className="startup-subtitle">
            {systemStartupState.speed 
              ? "On first launch, AI and embedding models are being downloaded. Please keep the application open and wait."
              : "Loading local AI models into memory. This will only take a moment..."}
          </p>
          
          {systemStartupState.status === 'error' ? (
            <div className="startup-error-container">
              <ErrorIcon size={24} style={{ color: '#ef4444', display: 'block', margin: '0 auto 8px auto' }} />
              <p className="startup-error-text">Error: {systemStartupState.current_step}</p>
              <button className="startup-retry-btn" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          ) : (
            <div className="startup-progress-container">
              <div className="startup-progress-bar-track">
                <div 
                  className="startup-progress-bar-fill"
                  style={{ width: `${systemStartupState.progress}%` }}
                ></div>
              </div>
              <div className="startup-progress-details">
                <span className="startup-step-text">{systemStartupState.current_step}</span>
                <span className="startup-percent-text">{Math.round(systemStartupState.progress)}%</span>
              </div>
              {systemStartupState.speed && (
                <div className="startup-download-stats" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#8e8e8f', marginTop: '2px' }}>
                  <span>Download Speed: {systemStartupState.speed}</span>
                  <span>
                    {systemStartupState.downloaded_mb > 0 
                      ? `${(systemStartupState.downloaded_mb / 1024).toFixed(2)} GB / ${(systemStartupState.total_mb / 1024).toFixed(2)} GB`
                      : 'Calculating...'}
                  </span>
                </div>
              )}
            </div>
          )}
          
          <div className="startup-warning-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <WarningIcon size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span>Since the models are large, this process may take 5-10 minutes depending on your internet connection speed.</span>
          </div>
        </div>
      </div>

      {/* Sidebar Backdrop for Mobile/Tablet */}
      {showDocs && (
        <div className="sidebar-backdrop" onClick={() => setShowDocs(false)} />
      )}

      {/* Sidebar Panel */}
      <div className={`sidebar glass-panel ${showDocs ? 'open' : 'closed'}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px 8px 16px',
        }}>
          <button 
            onClick={handleNewChat} 
            title="Go to Home / New Chat"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '8px',
              color: '#ececec',
              transition: 'background 0.15s'
            }}
            className="brand-logo-btn"
          >
            <AskLocalIcon size={22} />
            <span style={{ marginLeft: '8px', fontWeight: '700', fontSize: '0.95rem', background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.01em' }}>AskLocal</span>
          </button>
          <button 
            className="sidebar-toggle" 
            onClick={() => setShowDocs(!showDocs)}
            style={{ padding: '6px' }}
          >
            {showDocs ? <ChevronLeftIcon size={14} /> : <ChevronRightIcon size={14} />}
          </button>
        </div>

        {/* Tab Seçiciler */}
        <div className="sidebar-tabs" style={{ borderTop: 'none', paddingTop: '4px' }}>
          <button 
            className={`tab-btn ${sidebarTab === 'chats' ? 'active' : ''}`} 
            onClick={() => setSidebarTab('chats')}
          >
            <ChatIcon size={15} style={{ marginRight: '6px' }} /> Chats
          </button>
          <button 
            className={`tab-btn ${sidebarTab === 'docs' ? 'active' : ''}`} 
            onClick={() => setSidebarTab('docs')}
          >
            <DocumentIcon size={15} style={{ marginRight: '6px' }} /> Documents
          </button>
        </div>

        {/* Search Bar */}
        {showDocs && (
          <div className="sidebar-search-container">
            <div className="sidebar-search-wrapper">
              <SearchIcon size={14} className="search-input-icon" />
              <input
                type="text"
                placeholder={sidebarTab === 'chats' ? "Search chats..." : "Search documents..."}
                value={sidebarTab === 'chats' ? chatSearchQuery : docSearchQuery}
                onChange={(e) => {
                  if (sidebarTab === 'chats') {
                    setChatSearchQuery(e.target.value);
                  } else {
                    setDocSearchQuery(e.target.value);
                  }
                }}
                className="sidebar-search-input"
              />
            </div>
          </div>
        )}

        {/* Yeni Sohbet Butonu */}
        {sidebarTab === 'chats' && (
          <button className="new-chat-btn" onClick={handleNewChat}>
            <PlusIcon size={14} style={{ marginRight: '6px' }} /> Start New Chat
          </button>
        )}

        {/* Belge Ekleme Butonu */}
        {sidebarTab === 'docs' && (
          <div className="upload-section">
            <label className={`upload-btn ${uploading ? 'disabled' : ''}`}>
              {uploading ? (
                <>
                  <SpinnerIcon size={14} style={{ marginRight: '6px' }} /> Indexing...
                </>
              ) : (
                <>
                  <PlusIcon size={14} style={{ marginRight: '6px' }} /> Add Document (PDF, Word, ...)
                </>
              )}
              <input 
                type="file" 
                style={{ display: 'none' }} 
                onChange={handleUploadFile} 
                disabled={uploading}
                accept=".txt,.md,.pdf,.docx,.pptx,.xlsx,.csv,.json,.html,.htm"
              />
            </label>
          </div>
        )}

        <div className="docs-list">
          {sidebarTab === 'chats' ? (
            /* Chat Geçmişi Listesi */
            sessions.filter(s => s.title.toLowerCase().includes(chatSearchQuery.toLowerCase())).length === 0 ? (
              <p className="no-docs">No matching chats found.</p>
            ) : (
              <>
                {/* Pinned Chats Section */}
                {sessions.filter(s => s.is_pinned && s.title.toLowerCase().includes(chatSearchQuery.toLowerCase())).length > 0 && (
                  <div className="list-section-wrapper">
                    <div className="list-section-header">
                      <PinIcon size={12} style={{ marginRight: '5px', fill: '#f59e0b', color: '#f59e0b' }} />
                      Pinned Chats
                    </div>
                    {sessions
                      .filter(s => s.is_pinned && s.title.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                      .map(session => (
                        <div 
                          key={session.id} 
                          className={`session-item ${currentSessionId === session.id ? 'active' : ''} ${loadingSessions[session.id] ? 'loading' : ''} pinned`}
                          onClick={() => handleSelectSession(session.id)}
                        >
                          {loadingSessions[session.id] ? (
                            <div className="sidebar-skeleton">
                              <div className="sidebar-skeleton-icon"></div>
                              <div className="sidebar-skeleton-line"></div>
                            </div>
                          ) : (
                            <>
                              <span className="session-icon"><ChatIcon size={16} /></span>
                              <div className="session-info">
                                <p className="session-title">{session.title}</p>
                              </div>
                              <div className="session-actions-wrapper">
                                <button 
                                  className="pin-session-btn active" 
                                  onClick={(e) => handleTogglePinSession(e, session.id, session.is_pinned)}
                                  title="Unpin chat"
                                >
                                  <PinIcon size={13} style={{ fill: 'currentColor' }} />
                                </button>
                                <button className="delete-session-btn" onClick={(e) => handleDeleteSession(e, session.id)} title="Delete chat">
                                  <TrashIcon size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* Recent Chats Section */}
                <div className="list-section-wrapper">
                  {sessions.filter(s => s.is_pinned && s.title.toLowerCase().includes(chatSearchQuery.toLowerCase())).length > 0 && (
                    <div className="list-section-header">Recent Chats</div>
                  )}
                  {sessions
                    .filter(s => !s.is_pinned && s.title.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                    .map(session => (
                      <div 
                        key={session.id} 
                        className={`session-item ${currentSessionId === session.id ? 'active' : ''} ${loadingSessions[session.id] ? 'loading' : ''}`}
                        onClick={() => handleSelectSession(session.id)}
                      >
                          {loadingSessions[session.id] ? (
                            <div className="sidebar-skeleton">
                              <div className="sidebar-skeleton-icon"></div>
                              <div className="sidebar-skeleton-line"></div>
                            </div>
                          ) : (
                            <>
                              <span className="session-icon"><ChatIcon size={16} /></span>
                              <div className="session-info">
                                <p className="session-title">{session.title}</p>
                              </div>
                              <div className="session-actions-wrapper">
                                <button 
                                  className="pin-session-btn" 
                                  onClick={(e) => handleTogglePinSession(e, session.id, session.is_pinned)}
                                  title="Pin chat"
                                >
                                  <PinIcon size={13} />
                                </button>
                                <button className="delete-session-btn" onClick={(e) => handleDeleteSession(e, session.id)} title="Delete chat">
                                  <TrashIcon size={14} />
                                </button>
                              </div>
                            </>
                          )}
                      </div>
                    ))}
                  {sessions.filter(s => !s.is_pinned && s.title.toLowerCase().includes(chatSearchQuery.toLowerCase())).length === 0 && 
                   sessions.filter(s => s.is_pinned && s.title.toLowerCase().includes(chatSearchQuery.toLowerCase())).length > 0 && (
                    <p className="no-docs" style={{ margin: '10px 0', fontSize: '0.8rem' }}>No other chats.</p>
                  )}
                </div>
              </>
            )
          ) : (
            /* Döküman Listesi */
            documents.filter(d => d.file_name.toLowerCase().includes(docSearchQuery.toLowerCase())).length === 0 ? (
              <p className="no-docs">No matching documents found.</p>
            ) : (
              <>
                {/* Pinned Documents Section */}
                {documents.filter(d => d.is_pinned && d.file_name.toLowerCase().includes(docSearchQuery.toLowerCase())).length > 0 && (
                  <div className="list-section-wrapper">
                    <div className="list-section-header">
                      <PinIcon size={12} style={{ marginRight: '5px', fill: '#f59e0b', color: '#f59e0b' }} />
                      Pinned Documents
                    </div>
                    {documents
                      .filter(d => d.is_pinned && d.file_name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                      .map((doc, idx) => (
                        <div key={idx} className={`doc-item flex-row pinned ${disabledDocs.has(doc.file_name) ? 'doc-disabled' : ''}`}>
                          <label className="doc-toggle" title={disabledDocs.has(doc.file_name) ? 'Etkinleştir' : 'Devre dışı bırak'} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="doc-toggle-checkbox"
                              checked={!disabledDocs.has(doc.file_name)}
                              onChange={(e) => handleToggleDocDisabled(e, doc.file_name)}
                            />
                            <span className="doc-toggle-slider"></span>
                          </label>
                          <span className="doc-icon"><DocumentIcon size={18} /></span>
                          <div className="doc-info">
                            <p className={`doc-name ${!doc.is_compatible ? 'incompatible' : ''}`}>{doc.file_name}</p>
                            {indexingActiveFiles[doc.file_name] && indexingActiveFiles[doc.file_name].status === 'processing' ? (
                              <div style={{ marginTop: '4px', width: '100%', maxWidth: '160px' }}>
                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div 
                                    style={{ 
                                      width: `${indexingActiveFiles[doc.file_name].progress}%`, 
                                      height: '100%', 
                                      background: 'linear-gradient(90deg, #10b981, #34d399)', 
                                      borderRadius: '2px',
                                      transition: 'width 0.2s ease-out'
                                    }}
                                  ></div>
                                </div>
                                <span style={{ fontSize: '0.6rem', color: '#10b981', display: 'block', marginTop: '2px' }}>
                                  Indexing: {Math.round(indexingActiveFiles[doc.file_name].progress)}% ({indexingActiveFiles[doc.file_name].processed_chunks}/{indexingActiveFiles[doc.file_name].total_chunks || '?'})
                                </span>
                              </div>
                            ) : (
                              <>
                                <span className="doc-chunks">{doc.chunks_count} chunks • {doc.embedding_model || 'None'}</span>
                                {!doc.is_compatible && (
                                  reindexingFiles[doc.file_name] ? (
                                    <span className="doc-reindexing-label" style={{ fontSize: '0.7rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                      <SpinnerIcon size={12} style={{ color: '#3b82f6' }} /> Indexing...
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="doc-compat-badge"
                                      onClick={(e) => handleReindexDocument(e, doc.file_name)}
                                      title={`Not indexed with active model (${status.embeddingModel}). Click to index it now!`}
                                    >
                                      <BoltIcon size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} /> Index with Active
                                    </button>
                                  )
                                )}
                              </>
                            )}
                          </div>
                          <div className="doc-actions-wrapper">
                            <button 
                              className="pin-doc-btn active" 
                              onClick={(e) => handleTogglePinDocument(e, doc.file_name, doc.is_pinned)}
                              title="Unpin document"
                            >
                              <PinIcon size={13} style={{ fill: 'currentColor' }} />
                            </button>
                            <button className="delete-doc-btn" onClick={(e) => handleDeleteDocument(e, doc.file_name)} title="Delete document">
                              <TrashIcon size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* All Documents Section */}
                <div className="list-section-wrapper">
                  {documents.filter(d => d.is_pinned && d.file_name.toLowerCase().includes(docSearchQuery.toLowerCase())).length > 0 && (
                    <div className="list-section-header">Other Documents</div>
                  )}
                  {documents
                    .filter(d => !d.is_pinned && d.file_name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                    .map((doc, idx) => (
                      <div key={idx} className={`doc-item flex-row ${disabledDocs.has(doc.file_name) ? 'doc-disabled' : ''}`}>
                        <label className="doc-toggle" title={disabledDocs.has(doc.file_name) ? 'Etkinleştir' : 'Devre dışı bırak'} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="doc-toggle-checkbox"
                            checked={!disabledDocs.has(doc.file_name)}
                            onChange={(e) => handleToggleDocDisabled(e, doc.file_name)}
                          />
                          <span className="doc-toggle-slider"></span>
                        </label>
                        <span className="doc-icon"><DocumentIcon size={18} /></span>
                        <div className="doc-info">
                          <p className={`doc-name ${!doc.is_compatible ? 'incompatible' : ''}`}>{doc.file_name}</p>
                          {indexingActiveFiles[doc.file_name] && indexingActiveFiles[doc.file_name].status === 'processing' ? (
                            <div style={{ marginTop: '4px', width: '100%', maxWidth: '160px' }}>
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    width: `${indexingActiveFiles[doc.file_name].progress}%`, 
                                    height: '100%', 
                                    background: 'linear-gradient(90deg, #10b981, #34d399)', 
                                    borderRadius: '2px',
                                    transition: 'width 0.2s ease-out' 
                                  }}
                                ></div>
                              </div>
                              <span style={{ fontSize: '0.6rem', color: '#10b981', display: 'block', marginTop: '2px' }}>
                                Indexing: {Math.round(indexingActiveFiles[doc.file_name].progress)}% ({indexingActiveFiles[doc.file_name].processed_chunks}/{indexingActiveFiles[doc.file_name].total_chunks || '?'})
                              </span>
                            </div>
                          ) : (
                            <>
                              <span className="doc-chunks">{doc.chunks_count} chunks • {doc.embedding_model || 'None'}</span>
                              {!doc.is_compatible && (
                                reindexingFiles[doc.file_name] ? (
                                  <span className="doc-reindexing-label" style={{ fontSize: '0.7rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                    <SpinnerIcon size={12} style={{ color: '#3b82f6' }} /> Indexing...
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="doc-compat-badge"
                                    onClick={(e) => handleReindexDocument(e, doc.file_name)}
                                    title={`Not indexed with active model (${status.embeddingModel}). Click to index it now!`}
                                  >
                                    <BoltIcon size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} /> Index with Active
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                        <div className="doc-actions-wrapper">
                          <button 
                            className="pin-doc-btn" 
                            onClick={(e) => handleTogglePinDocument(e, doc.file_name, doc.is_pinned)}
                            title="Pin document"
                          >
                            <PinIcon size={13} />
                          </button>
                          <button className="delete-doc-btn" onClick={(e) => handleDeleteDocument(e, doc.file_name)} title="Delete document">
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  {documents.filter(d => !d.is_pinned && d.file_name.toLowerCase().includes(docSearchQuery.toLowerCase())).length === 0 && 
                   documents.filter(d => d.is_pinned && d.file_name.toLowerCase().includes(docSearchQuery.toLowerCase())).length > 0 && (
                    <p className="no-docs" style={{ margin: '10px 0', fontSize: '0.8rem' }}>No other documents.</p>
                  )}
                </div>
              </>
            )
          )}
        </div>
        
        <div className="system-status">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}><SettingsIcon size={13} style={{ marginRight: '5px' }} /> Status</h3>
            <button 
              className="configure-models-btn"
              onClick={() => setShowSettingsModal(true)}
              style={{
                background: 'var(--accent-subtle)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                color: '#a78bfa',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Configure
            </button>
          </div>
          <div className="status-indicator">
            <span className={`status-dot ${status.online ? 'online' : 'offline'}`}></span>
            <span>{status.online ? 'Active — Offline Mode' : 'Disconnected'}</span>
          </div>
          <div className="status-detail">
            <p><strong>Model:</strong> {status.chatModel || '—'}</p>
          </div>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="chat-panel">
        <header className="chat-header">
          {!showDocs && (
            <button className="sidebar-toggle-btn" onClick={() => setShowDocs(true)}>
              <DocumentIcon size={14} style={{ marginRight: '6px' }} /> Menu
            </button>
          )}
          <h1 style={{ display: 'flex', alignItems: 'center' }}>
            <AskLocalIcon size={28} style={{ marginRight: '10px' }} />
            AskLocal
          </h1>
          <div className="online-badge">
            <span className="pulse-green"></span>
            <span>100% Local & Private</span>
          </div>

          {/* Export Butonu */}
          {messages.length > 0 && (
            <div className="export-menu-wrapper" ref={exportMenuRef}>
              <button
                className="export-trigger-btn"
                onClick={() => setShowExportMenu(prev => !prev)}
                title="Sohbeti dışa aktar"
              >
                <ExportIcon size={15} style={{ marginRight: '5px' }} />
                Dışa Aktar
              </button>
              {showExportMenu && (
                <div className="export-dropdown">
                  <button className="export-option" onClick={handleExportMarkdown}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Markdown olarak indir (.md)
                  </button>
                  <button className="export-option" onClick={handleExportPDF}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}>
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    PDF olarak kaydet
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-card">
                <div className="welcome-logo" style={{ fontSize: '3rem', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <AskLocalIcon size={64} />
                </div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: '700', background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AskLocal</h2>
                <p style={{ color: '#6b6b80', fontSize: '0.82rem', margin: '0 0 28px 0', letterSpacing: '0.01em' }}>
                  Ask anything about your documents — everything stays on your device.
                </p>
                <div className="suggested-prompts-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '10px',
                  width: '100%',
                  maxWidth: '640px',
                  margin: '0 auto',
                  textAlign: 'left'
                }}>
                  {getSuggestedCards().map((card, idx) => (
                    <div
                      key={idx}
                      className="suggested-prompt-card"
                      onClick={() => sendMessageText(card.prompt, card.file)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderLeft: `3px solid ${card.accent || '#7c3aed'}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease, border-color 0.15s ease',
                        fontSize: '0.85rem',
                        color: '#ececec',
                        background: 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{card.icon}</span>
                        <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#e4e4e7', letterSpacing: '0.01em' }}>{card.title}</span>
                      </div>
                      <div style={{ color: '#5a5a70', fontSize: '0.73rem', lineHeight: '1.4', paddingLeft: '1px' }}>{card.subtitle}</div>
                    </div>
                  ))}
                </div>
                
                <div className="mention-tip-banner" style={{
                  marginTop: '24px',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.12)',
                  fontSize: '0.8rem',
                  color: '#8e8e8f',
                  width: '100%',
                  maxWidth: '600px',
                  margin: '24px auto 0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}>
                  <LightbulbIcon size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span><strong>Tip:</strong> Type <strong>@</strong> in the chatbox to filter RAG query context by a specific document!</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              if (msg.role === 'assistant' && !msg.content) return null;
              return (
                <div key={index} className={`message-wrapper ${msg.role}`}>
                  <div className="avatar">
                    {msg.role === 'user' ? <UserIcon size={18} /> : <AskLocalIcon size={22} />}
                  </div>
                  <div className="message-content">
                    <div className="bubble">{msg.content}</div>
                    {msg.context && (
                      <div 
                        className="context-badge-trigger" 
                        onClick={() => setActiveInspectorChunk({
                          text: msg.context,
                          score: msg.score,
                          fileName: msg.fileName,
                          query: messages[index - 1] ? messages[index - 1].content : ''
                        })}
                      >
                        <SearchIcon size={12} style={{ color: '#3b82f6', flexShrink: 0 }} />
                        <span>Source: <strong>{msg.fileName}</strong> (Similarity: {msg.score}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          
          {currentSessionId && loadingSessions[currentSessionId] && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant' || !messages[messages.length - 1].content) && (
            <div className="message-wrapper assistant loading-message">
              <div className="avatar">
                <AskLocalIcon size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div className="message-content">
                <div className="bubble typing-bubble" style={{ padding: '0 4px' }}>
                  <div className="skeleton-container">
                    <div className="skeleton-line skeleton-short"></div>
                    <div className="skeleton-line skeleton-medium"></div>
                    <div className="skeleton-line skeleton-long"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-form-wrapper" onSubmit={handleSendMessage} style={{ position: 'relative' }}>
          {/* Autocomplete Mentions Floating Menu */}
          {showMentionsMenu && (
            <div className="mentions-dropdown-menu">
              <div className="mentions-header">Filter RAG query by document:</div>
              {documents.filter(d => d.file_name.toLowerCase().includes(mentionSearchQuery.toLowerCase())).length === 0 ? (
                <div className="mention-item-option empty">No documents match "{mentionSearchQuery}"</div>
              ) : (
                documents
                  .filter(d => d.file_name.toLowerCase().includes(mentionSearchQuery.toLowerCase()))
                  .map((doc, idx) => (
                    <div
                      key={idx}
                      className={`mention-item-option ${selectedMentionIndex === idx ? 'active' : ''}`}
                      onClick={() => {
                        setMentionedFile(doc.file_name);
                        setShowMentionsMenu(false);
                        // Clear the typed "@" pattern from query input
                        const words = input.split(' ');
                        words.pop();
                        setInput(words.join(' ') + ' ');
                        inputRef.current?.focus();
                      }}
                    >
                      <DocumentIcon size={14} style={{ marginRight: '6px' }} />
                      {doc.file_name}
                    </div>
                  ))
              )}
            </div>
          )}

          {mentionedFile && (
            <div className="active-mention-badge">
              <DocumentIcon size={12} style={{ marginRight: '4px' }} />
              {mentionedFile}
              <button 
                type="button" 
                className="clear-mention-btn" 
                onClick={() => setMentionedFile(null)}
              >
                &times;
              </button>
            </div>
          )}
          <div className="input-form">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);

                // Autocomplete checks
                const words = val.split(' ');
                const lastWord = words[words.length - 1];
                if (lastWord.startsWith('@')) {
                  setShowMentionsMenu(true);
                  setMentionSearchQuery(lastWord.slice(1));
                  setSelectedMentionIndex(0);
                } else {
                  setShowMentionsMenu(false);
                }
              }}
              onKeyDown={(e) => {
                if (showMentionsMenu) {
                  const filteredDocs = documents.filter(d => d.file_name.toLowerCase().includes(mentionSearchQuery.toLowerCase()));
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedMentionIndex(prev => (prev + 1) % filteredDocs.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedMentionIndex(prev => (prev - 1 + filteredDocs.length) % filteredDocs.length);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredDocs[selectedMentionIndex]) {
                      setMentionedFile(filteredDocs[selectedMentionIndex].file_name);
                      setShowMentionsMenu(false);
                      const words = input.split(' ');
                      words.pop();
                      setInput(words.join(' ') + ' ');
                    }
                  } else if (e.key === 'Escape') {
                    setShowMentionsMenu(false);
                  }
                }
              }}
              placeholder={mentionedFile ? `Ask RAG only about "${mentionedFile}"...` : "Ask the local RAG assistant a question..."}
              disabled={currentSessionId && loadingSessions[currentSessionId]}
            />
            
            {/* Custom Gemini-style Chatbox Model Selector */}
            <div className="chatbox-model-selector-container" ref={chatboxDropdownRef}>
              <button
                type="button"
                className="chatbox-model-selector-btn"
                onClick={() => setShowChatboxModelDropdown(!showChatboxModelDropdown)}
                disabled={currentSessionId && loadingSessions[currentSessionId]}
                title="Select chat model"
              >
                <span>{selectedChatModel || 'Select Model'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="chevron-icon">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showChatboxModelDropdown && (
                <div className="chatbox-model-dropdown glass-panel">
                  <div className="chatbox-dropdown-header">Select Model</div>
                  <div className="chatbox-dropdown-scrollable">
                    <div className="chatbox-dropdown-group-title">Cached (Fast)</div>
                    {availableModels.chat.filter(m => m.is_cached).map((model, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`chatbox-dropdown-item ${selectedChatModel === model.alias ? 'active' : ''}`}
                        onClick={async () => {
                          setShowChatboxModelDropdown(false);
                          await handleDirectModelSwitch(model.alias);
                        }}
                      >
                        <span className="dot-cached"></span>
                        <span className="model-name">
                          {model.alias}
                          <span style={{ opacity: 0.5, fontSize: '0.75rem', marginLeft: '6px' }}>
                            {model.file_size_mb ? `(${(model.file_size_mb / 1024).toFixed(2)} GB)` : ''}
                          </span>
                        </span>
                      </button>
                    ))}
                    
                    <div className="chatbox-dropdown-group-title">Available (Requires Download)</div>
                    {availableModels.chat.filter(m => !m.is_cached).map((model, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`chatbox-dropdown-item ${selectedChatModel === model.alias ? 'active' : ''}`}
                        onClick={async () => {
                          setShowChatboxModelDropdown(false);
                          await handleDirectModelSwitch(model.alias);
                        }}
                      >
                        <span className="dot-available"></span>
                        <span className="model-name">
                          {model.alias}
                          <span style={{ opacity: 0.5, fontSize: '0.75rem', marginLeft: '6px' }}>
                            {model.file_size_mb ? `(${(model.file_size_mb / 1024).toFixed(2)} GB)` : ''}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="chatbox-submit-btn" type="submit" disabled={(currentSessionId && loadingSessions[currentSessionId]) || !input.trim()} title="Send message">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" />
                <polyline points="5 12 12 5 19 12" stroke="currentColor" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {showSettingsModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="al-settings-modal" onClick={(e) => e.stopPropagation()}>

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="al-settings-header">
              <div className="al-settings-header-left">
                <div className="al-settings-header-icon">
                  <SettingsIcon size={16} />
                </div>
                <div>
                  <h3 className="al-settings-title">Settings</h3>
                  <p className="al-settings-subtitle">AskLocal configuration</p>
                </div>
              </div>
              <button type="button" className="al-settings-close" onClick={() => setShowSettingsModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* ── Body ─────────────────────────────────────────────── */}
            <div className="al-settings-body">

              {/* ── Embedding Model Card ── */}
              <div className="al-settings-card">
                <div className="al-settings-card-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                </div>
                <div className="al-settings-card-content">
                  <div className="al-settings-card-label">Embedding Model</div>
                  <p className="al-settings-card-desc">Vector representation model used to index and search your documents.</p>
                  <div className="al-settings-select-wrapper">
                    <select
                      className="al-settings-select"
                      value={selectedEmbeddingModel}
                      onChange={(e) => setSelectedEmbeddingModel(e.target.value)}
                    >
                      {availableModels.embedding.map((model, idx) => (
                        <option key={idx} value={model.alias}>
                          {model.alias} {model.file_size_mb ? `(${(model.file_size_mb / 1024).toFixed(2)} GB)` : ''} {model.is_cached ? '✓ Cached' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedEmbeddingModel && selectedEmbeddingModel !== status.embeddingModel && (
                    <div className="settings-warning" style={{ marginTop: '10px' }}>
                      <span className="settings-warning-icon">⚠️</span>
                      <span>Changing embedding model requires re-indexing documents.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Top-K Card ── */}
              <div className="al-settings-card">
                <div className="al-settings-card-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </div>
                <div className="al-settings-card-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="al-settings-card-label">Context Count (Top-K)</div>
                    <span className="al-settings-badge" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}>{topK} chunks</span>
                  </div>
                  <p className="al-settings-card-desc">Number of document paragraphs retrieved per query. More chunks = more context, more memory.</p>
                  <div className="al-range-track">
                    <input
                      type="range" min="1" max="10" value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value))}
                      className="al-range-input"
                      style={{ '--pct': `${((topK - 1) / 9) * 100}%`, '--accent': '#34d399' }}
                    />
                    <div className="al-range-labels"><span>1</span><span>10</span></div>
                  </div>
                </div>
              </div>

              {/* ── Similarity Threshold Card ── */}
              <div className="al-settings-card">
                <div className="al-settings-card-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div className="al-settings-card-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="al-settings-card-label">Similarity Threshold</div>
                    <span className="al-settings-badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }}>{Math.round(similarityThreshold * 100)}%</span>
                  </div>
                  <p className="al-settings-card-desc">Minimum relevance score for a chunk to be included. Higher = stricter, fewer but more relevant results.</p>
                  <div className="al-range-track">
                    <input
                      type="range" min="0" max="100" value={Math.round(similarityThreshold * 100)}
                      onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value) / 100)}
                      className="al-range-input"
                      style={{ '--pct': `${Math.round(similarityThreshold * 100)}%`, '--accent': '#fbbf24' }}
                    />
                    <div className="al-range-labels"><span>0%</span><span>100%</span></div>
                  </div>
                </div>
              </div>

              {/* ── Strict Mode Card ── */}
              <div className="al-settings-card">
                <div className="al-settings-card-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="al-settings-card-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="al-settings-card-label">Strict Knowledge Filter</div>
                    <p className="al-settings-card-desc" style={{ marginBottom: 0 }}>When on, the AI refuses to answer if no relevant document chunks are found. When off, it falls back to general knowledge.</p>
                  </div>
                  <div
                    className={`al-toggle ${strictMode ? 'on' : ''}`}
                    onClick={() => setStrictMode(!strictMode)}
                  >
                    <div className="al-toggle-knob" />
                  </div>
                </div>
              </div>

              {/* ── Cache Card ── */}
              <div className="al-settings-card">
                <div className="al-settings-card-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                    <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
                  </svg>
                </div>
                <div className="al-settings-card-content">
                  <div className="al-settings-card-label">Cached Models</div>
                  <div className="al-cache-list">
                    {[...(availableModels.chat || []), ...(availableModels.embedding || [])].filter(m => m.is_cached).map((model, idx) => {
                      const isActive = status.chatModel === model.alias || status.embeddingModel === model.alias;
                      return (
                        <div key={idx} className="al-cache-item">
                          <div className="al-cache-dot" style={{ background: isActive ? '#34d399' : '#4b5563' }} />
                          <div className="al-cache-info">
                            <span className="al-cache-name">{model.alias}</span>
                            <span className="al-cache-meta">{model.type === 'chat' ? 'Chat LLM' : 'Embedding'} &bull; {model.file_size_mb ? (model.file_size_mb / 1024).toFixed(2) : '0.00'} GB</span>
                          </div>
                          {isActive && <span className="al-cache-active-badge">Active</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>{/* /body */}

            {/* ── Footer ───────────────────────────────────────────── */}
            <div className="al-settings-footer">
              <button
                type="button"
                className="al-btn al-btn-ghost-red"
                onClick={() => {
                  setTopK(3);
                  setSimilarityThreshold(0.15);
                  setStrictMode(true);
                  showNotification('Settings reset to defaults!', 'info');
                }}
              >
                Reset to Defaults
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="al-btn al-btn-ghost" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="al-btn al-btn-primary"
                  onClick={handleApplyModelSettings}
                  disabled={!selectedEmbeddingModel}
                >
                  Apply Changes
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeInspectorChunk && (
        <div className="confirm-modal-overlay" onClick={() => setActiveInspectorChunk(null)}>
          <div className="chunk-inspector-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="chunk-inspector-header">
              <h3>
                <SearchIcon size={16} style={{ color: '#3b82f6' }} />
                RAG Chunk Details & Source Analysis
              </h3>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setActiveInspectorChunk(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="inspector-meta-row">
              <div className="inspector-meta-item">
                <span className="inspector-meta-label">Source Document</span>
                <span className="inspector-meta-value">{activeInspectorChunk.fileName}</span>
              </div>
              <div className="inspector-meta-item">
                <span className="inspector-meta-label">Semantic Similarity</span>
                <span className="inspector-meta-value similarity-badge" style={{
                  color: activeInspectorChunk.score >= 40 ? '#22c55e' : (activeInspectorChunk.score >= 20 ? '#f59e0b' : '#ef4444')
                }}>
                  {activeInspectorChunk.score}%
                </span>
              </div>
            </div>

            <div className="inspector-body">
              <div className="inspector-body-label">
                <span>Indexed Source Text Segment (Chunk)</span>
                <button 
                  type="button" 
                  className="copy-chunk-btn" 
                  onClick={() => {
                    navigator.clipboard.writeText(activeInspectorChunk.text);
                    showNotification("Copied chunk text to clipboard!", "success");
                  }}
                >
                  Copy Text
                </button>
              </div>
              <div className="inspector-text-block">
                {(() => {
                  const queryWords = activeInspectorChunk.query
                    ? activeInspectorChunk.query.toLowerCase().replace(/[^\w\sğüşıöç]/g, '').split(/\s+/).filter(w => w.length > 2)
                    : [];
                  
                  if (queryWords.length === 0) return activeInspectorChunk.text;

                  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regexPattern = new RegExp(`(${queryWords.map(escapeRegExp).join('|')})`, 'gi');
                  
                  const parts = activeInspectorChunk.text.split(regexPattern);
                  return parts.map((part, i) => 
                    regexPattern.test(part) ? <mark key={i} className="highlighted-term">{part}</mark> : part
                  );
                })()}
              </div>
            </div>

            <div className="inspector-actions">
              <button 
                className="confirm-btn-cancel" 
                onClick={() => setActiveInspectorChunk(null)}
                style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {downloadTargetModel && (
        <div className="confirm-modal-overlay" onClick={() => setDownloadTargetModel(null)}>
          <div className="confirm-modal-content glass-panel" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <span className="confirm-modal-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <WarningIcon size={20} style={{ color: '#f59e0b' }} />
              </span>
              <h3>Download Model Confirmation</h3>
            </div>
            <p className="confirm-modal-message">
              The model <strong>{downloadTargetModel}</strong> {getModelSizeString(downloadTargetModel)} is not cached on your system. 
              Selecting it will trigger a one-time download of approximately <strong>{getModelSizeString(downloadTargetModel).replace(/[()]/g, '')}</strong>, which might take several minutes depending on your internet connection.
              <br /><br />
              Do you want to proceed with the download?
            </p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn-cancel" onClick={() => setDownloadTargetModel(null)}>Cancel</button>
              <button className="confirm-btn-danger" style={{ background: '#3b82f6' }} onClick={() => handleDirectModelSwitch(downloadTargetModel, true)}>
                Download & Load
              </button>
            </div>
          </div>
        </div>
      )}

      {switchingModels && (
        <div className="confirm-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="model-settings-modal-content glass-panel" style={{ textAlign: 'center', maxWidth: '360px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
              <SpinnerIcon size={36} style={{ color: '#3b82f6' }} />
              <h3 style={{ margin: 0, color: '#ececec' }}>Loading Model...</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#8e8e8f' }}>
                Configuring and initializing the local engine.
              </p>
              <span style={{ fontSize: '0.75rem', color: '#676767' }}>
                If this is a new model, it may take several minutes to download.
              </span>
            </div>
          </div>
        </div>
      )}

      {downloadActive && !isDownloadMinimized && (
        <div className="confirm-modal-overlay" style={{ zIndex: 3100 }}>
          <div className="model-settings-modal-content glass-panel" style={{ maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <SpinnerIcon size={24} style={{ color: '#3b82f6' }} />
                  <h3 style={{ margin: 0, color: '#ececec', fontSize: '1.1rem' }}>Downloading Model</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDownloadMinimized(true)}
                  style={{ background: 'transparent', border: 'none', color: '#8e8e8f', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                  title="Minimize to background"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="12" x2="20" y2="12" />
                  </svg>
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: '#8e8e8f', wordBreak: 'break-all' }}>
                  Model: <strong>{downloadModelName}</strong>
                </span>
                <span style={{ fontSize: '0.75rem', color: '#676767' }}>
                  Downloading model files from the catalog. Please keep the app open.
                </span>
              </div>
              
              <div className="download-progress-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="download-progress-bar-track" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div className="download-progress-bar-fill" style={{ width: `${downloadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '4px', transition: 'width 0.3s ease-out' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', color: '#b4b4b4' }}>
                  <span>{downloadedMb ? (downloadedMb / 1024).toFixed(2) : '0.00'} GB / {totalMb ? (totalMb / 1024).toFixed(2) : '0.00'} GB ({Number(downloadProgress).toFixed(1)}%)</span>
                  <span>{downloadSpeed || 'Downloading...'}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button 
                  className="confirm-btn-cancel" 
                  style={{ width: 'auto', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  onClick={handleCancelDownload}
                >
                  Cancel Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="confirm-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <span className="confirm-modal-icon">
                <WarningIcon size={20} style={{ color: '#ef4444' }} />
              </span>
              <h3>{deleteTarget.type === 'session' ? 'Delete Chat' : 'Delete Document'}</h3>
            </div>
            <p className="confirm-modal-message">
              {deleteTarget.type === 'session'
                ? 'Are you sure you want to delete this chat history?'
                : `Are you sure you want to delete the document "${deleteTarget.filename}" and all its database indices?`}
            </p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="confirm-btn-danger" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteModelTarget && (
        <div className="confirm-modal-overlay" style={{ zIndex: 3200 }} onClick={() => setDeleteModelTarget(null)}>
          <div className="confirm-modal-content glass-panel" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <span className="confirm-modal-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <WarningIcon size={20} style={{ color: '#ef4444' }} />
              </span>
              <h3>Delete Model from Cache</h3>
            </div>
            <p className="confirm-modal-message">
              Are you sure you want to remove the model <strong>{deleteModelTarget}</strong> {getModelSizeString(deleteModelTarget)} from your local cache?
              <br /><br />
              This will free up disk space, but you will need to re-download the model if you choose to select it again.
            </p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn-cancel" onClick={() => setDeleteModelTarget(null)}>Cancel</button>
              <button className="confirm-btn-danger" onClick={() => handleDeleteModel(deleteModelTarget)}>Delete Model</button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`toast-notification glass-panel ${notification.type}`}>
          <div className="toast-icon">
            {notification.type === 'success' && <SuccessIcon size={20} style={{ color: '#10b981' }} />}
            {notification.type === 'error' && <ErrorIcon size={20} style={{ color: '#ef4444' }} />}
            {notification.type === 'info' && <InfoIcon size={20} style={{ color: '#3b82f6' }} />}
          </div>
          <div className="toast-message">{notification.message}</div>
        </div>
      )}

      {downloadActive && isDownloadMinimized && (
        <div 
          className="glass-panel" 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '340px',
            padding: '16px',
            borderRadius: '12px',
            zIndex: 3500,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(21, 21, 22, 0.92)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SpinnerIcon size={16} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ececec', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                {downloadModelName}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsDownloadMinimized(false)}
                style={{ background: 'transparent', border: 'none', color: '#8e8e8f', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'background-color 0.2s' }}
                title="Expand window"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleCancelDownload}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'background-color 0.2s' }}
                title="Cancel download"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="download-progress-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="download-progress-bar-track" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div className="download-progress-bar-fill" style={{ width: `${downloadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '3px', transition: 'width 0.3s ease-out' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '500', color: '#b4b4b4' }}>
              <span>{downloadedMb ? (downloadedMb / 1024).toFixed(2) : '0.00'} GB / {totalMb ? (totalMb / 1024).toFixed(2) : '0.00'} GB ({Number(downloadProgress).toFixed(1)}%)</span>
              <span>{downloadSpeed || 'Downloading...'}</span>
            </div>
          </div>
        </div>
      )}

      {Object.keys(indexingActiveFiles).length > 0 && (
        <div 
          className="glass-panel document-indexing-panel" 
          style={{
            position: 'fixed',
            bottom: (downloadActive && isDownloadMinimized) ? '156px' : '24px',
            right: '24px',
            width: '340px',
            padding: '16px',
            borderRadius: '12px',
            zIndex: 3400,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(21, 21, 22, 0.92)',
            transition: 'bottom 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {Object.values(indexingActiveFiles).some(f => f.status === 'processing') ? (
                <SpinnerIcon size={16} className="spinning" style={{ color: '#10b981' }} />
              ) : (
                <SuccessIcon size={16} style={{ color: '#10b981' }} />
              )}
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ececec' }}>
                {Object.values(indexingActiveFiles).some(f => f.status === 'processing') ? 'Indexing Documents' : 'Indexing Complete'}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {Object.entries(indexingActiveFiles).map(([filename, fileState]) => (
              <div key={filename} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span 
                    style={{ fontSize: '0.75rem', fontWeight: '500', color: '#ececec', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}
                    title={filename}
                  >
                    {filename}
                  </span>
                  
                  {fileState.status !== 'processing' && (
                    <button 
                      onClick={() => handleClearIndexingFile(filename)}
                      style={{ background: 'transparent', border: 'none', color: '#8e8e8f', cursor: 'pointer', padding: '2px', display: 'flex', borderRadius: '4px' }}
                      title="Clear status"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {fileState.status === 'processing' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${fileState.progress}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #10b981, #34d399)', 
                          borderRadius: '3px', 
                          transition: 'width 0.2s ease-out' 
                        }}
                      ></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#b4b4b4' }}>
                      <span>Generating embeddings...</span>
                      <span>
                        {fileState.processed_chunks}/{fileState.total_chunks || '?'} ({Math.round(fileState.progress)}%)
                      </span>
                    </div>
                  </div>
                ) : fileState.status === 'success' ? (
                  <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <SuccessIcon size={12} style={{ color: '#10b981' }} />
                    Indexed ({fileState.total_chunks} chunks)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }} title={fileState.error}>
                    <ErrorIcon size={12} style={{ color: '#ef4444' }} />
                    Error: {fileState.error ? (fileState.error.length > 30 ? fileState.error.substring(0, 30) + '...' : fileState.error) : 'Unknown error'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
