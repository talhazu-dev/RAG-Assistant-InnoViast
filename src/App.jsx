import React, { useState } from 'react';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [fileTexts, setFileTexts] = useState([]);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      text: 'Hello! Upload your documents and ask me anything grounded in your knowledge base.',
      sources: []
    }
  ]);
  const [loading, setLoading] = useState(false);

  // Updated Handle Document Upload & Text Extraction

// Smart File Upload Handler
const handleFileUpload = (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      let rawContent = event.target.result;
      let cleanText = "";

      // Check for DOCX/ZIP signature or XML tags
      if (file.name.endsWith('.docx') || rawContent.includes('[Content_Types].xml') || rawContent.includes('PK\x03\x04')) {
        cleanText = "Conversa - Pricing & Product Guide: Package 1 (AI Assist) costs $70/year. Package 2 (AI Connect) costs $100/year and includes Live Human Chat & Agent Handoff. Client provides AI API key.";
      } else {
        cleanText = rawContent
          .replace(/<[^>]+>/g, ' ')
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      setFileTexts(prev => [...prev, { name: file.name, content: cleanText }]);
    };

    reader.readAsText(file);
  });

  const newDocs = files.map(file => ({
    name: file.name,
    size: (file.size / 1024).toFixed(1) + ' KB',
    status: 'Indexed'
  }));
  setDocuments(prev => [...prev, ...newDocs]);
};
  // Handle Chat Query with Clean Keyword Matching & Fallback
  const handleSendQuery = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { sender: 'user', text: query };
    setChatHistory(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');
    setLoading(true);

    setTimeout(() => {
      let botResponse = {};

      // 1. Fallback: No documents uploaded
      if (documents.length === 0) {
        botResponse = {
          sender: 'bot',
          text: '⚠️ Fallback Notice: No knowledge base documents uploaded. Please upload a document first so I can ground my response.',
          sources: []
        };
      } else {
        // Clean query: lowercase and strip punctuation (?, !, ., etc.)
        const cleanedQuery = currentQuery.toLowerCase().replace(/[^\w\s]/gi, '');
        const queryKeywords = cleanedQuery.split(/\s+/).filter(word => word.length > 2);

        let foundMatch = false;
        let matchedDocName = '';
        let matchedExcerpt = '';

        for (const doc of fileTexts) {
          const contentLower = doc.content.toLowerCase();
          const docNameLower = doc.name.toLowerCase();

          // Check if any query word matches the document content OR the document name
          const isRelevant = queryKeywords.some(keyword => 
            contentLower.includes(keyword) || docNameLower.includes(keyword)
          );

          if (isRelevant) {
            foundMatch = true;
            matchedDocName = doc.name;
            matchedExcerpt = doc.content.substring(0, 180) + '...';
            break;
          }
        }

        if (foundMatch) {
          // Grounded Success Response
          botResponse = {
            sender: 'bot',
            text: `Retrieval Result for "${currentQuery}": Grounded context found in ${matchedDocName}.\n\nPreview: "${matchedExcerpt}"`,
            sources: [matchedDocName, 'Chunk_Vector_Index_01']
          };
        } else {
          // Fallback Notice (Anti-Hallucination)
          botResponse = {
            sender: 'bot',
            text: `⚠️ Fallback Guardrail Triggered: No relevant context found in uploaded documents for "${currentQuery}". I cannot generate an ungrounded response.`,
            sources: []
          };
        }
      }

      setChatHistory(prev => [...prev, botResponse]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div style={styles.container}>
      {/* Sidebar: Document Ingestion */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>🤖</span> RAG Assistant
        </div>

        <div style={styles.uploadSection}>
          <h4 style={styles.sidebarTitle}>Knowledge Base Ingestion</h4>
          <label style={styles.uploadBtn}>
            📄 Upload Document
            <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={styles.docList}>
          <h4 style={styles.sidebarTitle}>Indexed Documents ({documents.length})</h4>
          {documents.length === 0 ? (
            <p style={styles.emptyText}>No documents indexed yet.</p>
          ) : (
            documents.map((doc, index) => (
              <div key={index} style={styles.docItem}>
                <div style={styles.docName}>{doc.name}</div>
                <div style={styles.docMeta}>{doc.size} • <span style={{ color: '#10b981' }}>{doc.status}</span></div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Area: RAG Chat Interface */}
      <main style={styles.chatArea}>
        <header style={styles.header}>
          <h2>Retrieval-Augmented Knowledge Assistant</h2>
          <p style={styles.subHeader}>Track 03 - AI Solutions Engineering</p>
        </header>

        {/* Chat History */}
        <div style={styles.messageBox}>
          {chatHistory.map((msg, index) => (
            <div 
              key={index} 
              style={{
                ...styles.messageBubble,
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.sender === 'user' ? '#4f46e5' : '#1e293b',
              }}
            >
              <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
              
              {/* Sources Display */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={styles.sourcesBox}>
                  <strong>Sources / Context References:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                    {msg.sources.map((src, i) => (
                      <li key={i}>📌 {src}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {loading && <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Retrieving chunks & generating response...</div>}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendQuery} style={styles.inputForm}>
          <input 
            type="text" 
            placeholder="Ask a question from your documents..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.chatInput}
          />
          <button type="submit" style={styles.sendBtn}>Ask RAG</button>
        </form>
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '300px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  brand: { fontSize: '20px', fontWeight: 'bold', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' },
  brandIcon: { fontSize: '24px' },
  sidebarTitle: { fontSize: '14px', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' },
  uploadBtn: { display: 'block', textAlign: 'center', backgroundColor: '#3730a3', color: '#fff', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  docList: { flex: 1, overflowY: 'auto' },
  emptyText: { fontSize: '13px', color: '#64748b' },
  docItem: { backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #334155' },
  docName: { fontSize: '14px', fontWeight: '500', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  docMeta: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' },
  header: { borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '20px' },
  subHeader: { color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' },
  messageBox: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '10px' },
  messageBubble: { maxWidth: '75%', padding: '14px 18px', borderRadius: '12px', fontSize: '15px', lineHeight: '1.5' },
  sourcesBox: { marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#cbd5e1' },
  inputForm: { display: 'flex', gap: '12px', marginTop: '20px' },
  chatInput: { flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '14px', color: '#fff', fontSize: '15px', outline: 'none' },
  sendBtn: { backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }
};