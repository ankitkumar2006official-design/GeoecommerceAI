import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  RefreshCw,
  HelpCircle,
  Database,
  ArrowRight,
  TrendingUp,
  MapPin,
  Package,
  Terminal,
  Bug,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';

const QUICK_PROMPTS = [
  'Which product sells the most in Kolkata?',
  'which products is more famous of pricing more than 1400',
  'What are the most purchased products in Bihar?',
  'Which products have growing demand?',
  'Which products should I restock?',
  'Which products may become dead stock?',
  'Which locations offer the best opportunities?',
  'Which products are frequently purchased together?'
];

export default function AICopilot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I am your **GeoCommerce AI Business Copilot**.\n\nI analyse your live sales transactions, inventory records, and regional demand trends. I do not invent or hallucinate metrics — every answer is strictly grounded in verified database analytics.\n\nHow can I assist your business strategy today?",
      groundedData: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [openDebugIdx, setOpenDebugIdx] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchDatasets = async () => {
    try {
      const res = await api.get('/sales/datasets');
      if (res.data?.datasets) {
        setDatasets(res.data.datasets);
        const active = res.data.datasets.find((d) => d.isActive);
        setActiveDataset(active || res.data.datasets[0] || null);
      }
    } catch (err) {
      console.warn('Failed to fetch datasets:', err.message);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleSwitchDataset = async (datasetId) => {
    try {
      setLoading(true);
      await api.post('/sales/active-dataset', { datasetId });
      await fetchDatasets();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `🔄 **Active dataset switched.** Copilot queries are now strictly isolated to: \`${datasetId}\`.`,
          groundedData: null,
          debug: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/copilot/ask', { message: text });
      const assistantMsg = {
        role: 'assistant',
        content: res.data.reply,
        groundedData: res.data.groundedData,
        debug: res.data.debug,
        activeDatasetId: res.data.activeDatasetId,
        datasetName: res.data.datasetName,
        engine: res.data.engine,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error processing query: ${err.response?.data?.error || err.message}`,
          groundedData: null,
          debug: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-brand-500" />
            <span>AI Business Copilot</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Grounded Tool-Calling
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Conversational executive intelligence answering complex demand and inventory inquiries with real data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {datasets.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <Database className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">Active Dataset:</span>
              <select
                value={activeDataset?.datasetId || ''}
                onChange={(e) => handleSwitchDataset(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                {datasets.map((d) => (
                  <option key={d.datasetId} value={d.datasetId} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                    {d.filename || d.datasetName || d.datasetId} ({d.recordCount} rows)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition ${
              debugMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Toggle Grounding & Database Aggregation Debug Mode"
          >
            <Bug className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Debug Mode</span>
            {debugMode && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
          </button>

          <button
            onClick={() =>
              setMessages([
                {
                  role: 'assistant',
                  content: 'Chat session reset. Ask me anything about your regional sales, restocks, or demand forecasts.',
                  groundedData: null,
                  debug: null,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ])
            }
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
            title="Reset chat session"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-brand-500" /> Suggest:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
            className="text-[11px] font-medium px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-500 hover:text-brand-500 transition whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs space-y-2 leading-relaxed ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                }`}
              >
                {/* Message text with basic markdown rendering */}
                <div className="whitespace-pre-wrap font-sans">
                  {m.content.split('\n').map((line, lIdx) => {
                    // Render bold formatting
                    const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return <p key={lIdx} dangerouslySetInnerHTML={{ __html: formatted }} className="min-h-[1rem]" />;
                  })}
                </div>

                {/* Debug Inspector Accordion */}
                {!isUser && (m.debug || m.groundedData) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60">
                    <button
                      onClick={() => setOpenDebugIdx(openDebugIdx === idx ? null : idx)}
                      className="flex items-center justify-between w-full text-[10px] font-mono px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    >
                      <span className="flex items-center gap-1.5 font-semibold text-brand-600 dark:text-brand-400">
                        <Terminal className="w-3.5 h-3.5 text-brand-500" />
                        <span>Database Aggregation Audit &amp; Debug</span>
                        {m.debug?.matchedRecordsCount !== undefined && (
                          <span className="px-1.5 py-0.2 rounded-full bg-brand-500/10 text-brand-500 font-mono text-[9px] font-bold">
                            {m.debug.matchedRecordsCount} matches
                          </span>
                        )}
                      </span>
                      {openDebugIdx === idx || debugMode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {(openDebugIdx === idx || debugMode) && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
                          <div>
                            <span className="text-slate-500 block text-[9px]">Active Dataset ID:</span>
                            <div className="text-amber-400 font-bold truncate">
                              {m.debug?.activeDatasetId || m.debug?.datasetId || m.activeDatasetId || 'Active Seller Scope'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">Matched Records Scanned:</span>
                            <div className="text-emerald-400 font-bold">
                              {m.debug?.matchedRecordsCount ?? 'All'} of {m.debug?.totalDatasetRecords ?? 'Active'} rows
                            </div>
                          </div>
                        </div>

                        {m.debug?.filtersUsed && (
                          <div>
                            <span className="text-slate-500 block text-[9px] mb-0.5">Filters Applied:</span>
                            <pre className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-sky-300 text-[9px] overflow-x-auto">
                              {JSON.stringify(m.debug.filtersUsed, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-slate-500 text-[9px]">Raw MongoDB Aggregation Results:</span>
                            <span className="text-[8px] text-slate-500">Zero Hallucination Grounding</span>
                          </div>
                          <pre className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 text-[9px] max-h-48 overflow-y-auto">
                            {JSON.stringify(m.debug?.rawAggregationResults || m.groundedData || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`text-[9px] font-mono pt-1 text-right ${
                    isUser ? 'text-white/70' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-500 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
              <span className="font-mono text-[11px] ml-1">Executing analytics tool-call &amp; synthesizing facts...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm shrink-0"
      >
        <input
          type="text"
          placeholder="Ask a commercial question (e.g. 'Which product sells most in Mumbai?', 'Stockout alerts')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

