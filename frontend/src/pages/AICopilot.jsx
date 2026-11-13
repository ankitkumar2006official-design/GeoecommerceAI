import React, { useState, useRef, useEffect } from 'react';
import SafeMarkdown from '../components/common/SafeMarkdown';
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
  ShieldCheck,
  CornerDownLeft
} from 'lucide-react';
import api from '../services/api';

const QUICK_PROMPTS = [
  'Which product sells the most in Kolkata?',
  'Which products is more famous of pricing more than 1400',
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
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-3">
      {/* Title Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>AI Business Copilot</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 font-semibold">
              Grounded Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time conversational intelligence answering multi-region commercial, inventory, and demand queries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {datasets.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-subtle">
              <Database className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span className="text-slate-400 font-medium hidden sm:inline text-[11px]">Dataset:</span>
              <select
                value={activeDataset?.datasetId || ''}
                onChange={(e) => handleSwitchDataset(e.target.value)}
                className="bg-transparent font-medium text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              debugMode
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 shadow-subtle'
                : 'border-slate-200/80 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900'
            }`}
            title="Toggle Database Aggregation Audit & Debug Mode"
          >
            <Bug className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Audit Mode</span>
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
            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-white dark:bg-slate-900 transition shadow-subtle"
            title="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none select-none">
        <span className="text-[10px] uppercase font-semibold text-slate-400 shrink-0 flex items-center gap-1 pr-1">
          <Sparkles className="w-3 h-3 text-brand-600 dark:text-brand-400" /> Prompts:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
            className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition whitespace-nowrap shrink-0 disabled:opacity-50 shadow-subtle"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-4 shadow-card">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs shadow-subtle ${
                  isUser
                    ? 'bg-slate-900 dark:bg-brand-600 text-white'
                    : 'bg-white dark:bg-slate-850 text-brand-600 dark:text-brand-400 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`p-4 rounded-xl text-xs space-y-2 leading-relaxed shadow-subtle ${
                  isUser
                    ? 'bg-slate-900 dark:bg-brand-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800/90 rounded-tl-none'
                }`}
              >
                {/* Safe Sanitized Markdown Content */}
                <SafeMarkdown content={m.content} />

                {/* Audit & Grounding Inspector Drawer */}
                {!isUser && (m.debug || m.groundedData) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setOpenDebugIdx(openDebugIdx === idx ? null : idx)}
                      className="flex items-center justify-between w-full text-[10px] font-mono px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-800 transition"
                    >
                      <span className="flex items-center gap-1.5 font-medium text-brand-600 dark:text-brand-400">
                        <Terminal className="w-3.5 h-3.5 text-brand-600" />
                        <span>Database Aggregation Audit</span>
                        {m.debug?.matchedRecordsCount !== undefined && (
                          <span className="px-1.5 py-0.2 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-mono text-[9px] font-semibold border border-brand-200/60 dark:border-brand-800/60">
                            {m.debug.matchedRecordsCount} rows matched
                          </span>
                        )}
                      </span>
                      {openDebugIdx === idx || debugMode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {(openDebugIdx === idx || debugMode) && (
                      <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
                          <div>
                            <span className="text-slate-500 block text-[9px]">Active Dataset Scope:</span>
                            <div className="text-amber-400 font-semibold truncate">
                              {m.debug?.activeDatasetId || m.debug?.datasetId || m.activeDatasetId || 'Active Seller Scope'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">Rows Evaluated:</span>
                            <div className="text-emerald-400 font-semibold">
                              {m.debug?.matchedRecordsCount ?? 'All'} of {m.debug?.totalDatasetRecords ?? 'Active'} records
                            </div>
                          </div>
                        </div>

                        {m.debug?.filtersUsed && (
                          <div>
                            <span className="text-slate-500 block text-[9px] mb-0.5">Filters Applied:</span>
                            <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-sky-300 text-[9px] overflow-x-auto">
                              {JSON.stringify(m.debug.filtersUsed, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-slate-500 text-[9px]">MongoDB Aggregation Pipeline Grounding:</span>
                            <span className="text-[8px] text-emerald-400 font-semibold">Verified Deterministic Facts</span>
                          </div>
                          <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-400 text-[9px] max-h-48 overflow-y-auto">
                            {JSON.stringify(m.debug?.rawAggregationResults || m.groundedData || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`text-[9px] font-mono pt-1 text-right ${
                    isUser ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'
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
            <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-850 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-800 shadow-subtle">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 flex items-center gap-2 text-xs text-slate-500 shadow-subtle">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-bounce [animation-delay:0.3s]" />
              <span className="font-mono text-[11px] ml-1 text-slate-600 dark:text-slate-400">Executing database aggregation tool-call...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-2 shadow-card shrink-0"
      >
        <input
          type="text"
          placeholder="Ask a commercial question (e.g. 'Which product sells most in Mumbai?', 'Stockout alerts')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />

        <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono px-2">
          <span>Enter</span>
          <CornerDownLeft className="w-3 h-3 text-slate-400" />
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition shadow-subtle flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}