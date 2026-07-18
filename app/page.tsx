"use client";

import { useState, useEffect, useRef } from "react";
import { Cloud, MessageSquare, User, Upload, Trash2, File as FileIcon, Download, RefreshCw, Send, Loader2, Sparkles, ChevronRight, HardDrive, Shield, Activity, FileText, Settings, Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Page() {
  const [activeTab, setActiveTab] = useState<"files" | "chat" | "profile">("files");
  const [backupId, setBackupId] = useState<string | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Storage State
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<{role: "user" | "ai", content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const initApp = async () => {
      try {
        const localId = localStorage.getItem("node_backup_id");
        const res = await fetch("/api/storage/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ backupId: localId })
        });
        const data = await res.json();
        if (data.backupId) {
          localStorage.setItem("node_backup_id", data.backupId);
          setBackupId(data.backupId);
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoadingInit(false);
      }
    };
    initApp();
  }, []);

  const fetchStorageData = async () => {
    if (!backupId) return;
    setLoadingFiles(true);
    try {
      const [infoRes, filesRes] = await Promise.all([
        fetch(`/api/storage/info?backupId=${backupId}`),
        fetch(`/api/storage/files?backupId=${backupId}`)
      ]);
      const infoData = await infoRes.json();
      const filesData = await filesRes.json();
      
      setStorageInfo(infoData);
      if (filesData.files) {
        setFiles(filesData.files);
      }
    } catch (e) {
      console.error("Fetch storage error:", e);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (activeTab === "files" && backupId) {
      fetchStorageData();
    }
  }, [activeTab, backupId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !backupId) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("backupId", backupId);
    formData.append("file", file);

    try {
      await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      await fetchStorageData();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteFile = async (key: string) => {
    if (!backupId) return;
    try {
      await fetch("/api/storage/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId, key })
      });
      await fetchStorageData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleEraseDevice = async () => {
    if (!backupId || !confirm("Are you sure you want to erase all data on this node?")) return;
    try {
      await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId })
      });
      localStorage.removeItem("node_backup_id");
      window.location.reload();
    } catch (err) {
      console.error("Erase error:", err);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;
    
    const userMsg = chatInput.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setSendingChat(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (data.answer) {
        setMessages(prev => [...prev, { role: "ai", content: data.answer }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setSendingChat(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendingChat]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isMounted || loadingInit) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-zinc-100">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-zinc-100 font-sans w-full max-w-md mx-auto relative overflow-hidden sm:shadow-2xl">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[20%] w-[500px] h-[500px] bg-zinc-800/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute -bottom-[20%] -right-[20%] w-[400px] h-[400px] bg-zinc-700/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 z-20 bg-gradient-to-b from-[#0A0A0A] to-transparent">
        <div className="flex flex-col">
          <motion.h1 
            key={activeTab}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-semibold tracking-tight text-white"
          >
            {activeTab === 'files' && 'Storage'}
            {activeTab === 'chat' && 'Intelligence'}
            {activeTab === 'profile' && 'Settings'}
          </motion.h1>
        </div>
        {activeTab === "files" && (
          <button 
            onClick={fetchStorageData}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-32 relative z-10 hide-scrollbar px-6 pt-2">
        <AnimatePresence mode="wait">
          
          {/* FILES TAB */}
          {activeTab === "files" && (
            <motion.div 
              key="files"
              initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {/* Widgets Bento Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Main Storage Widget */}
                <div className="col-span-2 relative overflow-hidden rounded-3xl p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/5 hover:bg-white/[0.05] transition-colors group">
                  <div className="absolute -top-16 -right-12 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none blur-2xl">
                    <Cloud className="w-64 h-64 text-white" />
                  </div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <HardDrive className="w-4 h-4 text-zinc-400" />
                        <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest">Local Node</h2>
                      </div>
                      <div className="flex items-baseline gap-1 mt-2 mb-6">
                        <span className="text-4xl font-semibold text-white tracking-tighter">{storageInfo ? formatBytes(storageInfo.spaceUsed) : "0 B"}</span>
                        <span className="text-[14px] text-zinc-500 font-medium ml-1">/ {storageInfo ? formatBytes(storageInfo.totalSpace) : "1 TB"}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mt-4">
                      <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden p-[1px] border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${storageInfo?.usedPercent || 0}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Widget */}
                <div onClick={() => setActiveTab('chat')} className="col-span-1 rounded-3xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/5 flex flex-col justify-between aspect-square cursor-pointer hover:bg-white/[0.06] active:scale-[0.98] transition-all group">
                  <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors flex items-center justify-center border border-white/5">
                    <Sparkles className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-white tracking-tight">Sann AI</p>
                    <p className="text-[13px] text-zinc-500 mt-1">Intelligence</p>
                  </div>
                </div>

                {/* Upload Widget */}
                <label className="col-span-1 rounded-3xl p-5 bg-white text-black shadow-xl flex flex-col justify-between aspect-square cursor-pointer hover:bg-zinc-200 active:scale-[0.98] transition-all">
                  <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold tracking-tight">Upload</p>
                    <p className="text-[13px] opacity-60 mt-1">New File</p>
                  </div>
                  <input type="file" className="hidden" disabled={uploading} onChange={handleUpload} />
                </label>
              </div>

              {/* Files List */}
              <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden mt-6">
                <div className="px-6 py-5 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-[15px] font-medium text-white">Recent Files</h3>
                  </div>
                  <span className="text-[13px] font-medium text-zinc-500">{files.length} items</span>
                </div>
                
                <div className="p-3 space-y-1">
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                    </div>
                  ) : files.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                        <FileIcon className="w-6 h-6 text-zinc-600" />
                      </div>
                      <p className="text-[14px] font-medium text-zinc-400">Vault is empty</p>
                    </div>
                  ) : (
                    files.map((file, i) => (
                      <motion.div 
                        key={file.key} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-transparent p-3 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-colors cursor-default"
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="w-12 h-12 rounded-[14px] bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                            <FileIcon className="w-5 h-5 text-zinc-300" />
                          </div>
                          <div className="overflow-hidden flex-1">
                            <p className="font-medium text-zinc-200 truncate text-[15px] leading-tight">{file.relativeKey}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[12px] text-zinc-500">{formatBytes(file.size)}</span>
                              <span className="text-[10px] text-zinc-600">•</span>
                              <span className="text-[12px] text-zinc-500">{new Date(file.lastModified).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                            <Download className="w-4 h-4" />
                          </a>
                          <button 
                            onClick={() => handleDeleteFile(file.key)}
                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col h-full"
            >
              <div className="flex-1 space-y-6 overflow-y-auto hide-scrollbar pb-16 px-1">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-center px-6">
                    <div className="w-20 h-20 rounded-3xl bg-white/[0.03] p-5 mb-6 border border-white/5 flex items-center justify-center shadow-2xl">
                      <Sparkles className="w-8 h-8 text-white/80" />
                    </div>
                    <h3 className="text-xl font-semibold text-white tracking-tight">Sann Intelligence</h3>
                    <p className="text-[14px] text-zinc-500 mt-3 max-w-[240px] leading-relaxed">Your personal AI assistant, ready to analyze your vault.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                      msg.role === "user" 
                        ? "bg-white text-black rounded-3xl rounded-br-md font-medium" 
                        : "bg-white/[0.04] backdrop-blur-xl border border-white/5 text-zinc-200 rounded-3xl rounded-bl-md"
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {sendingChat && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/5 rounded-3xl rounded-bl-md px-5 py-4 flex gap-1.5 items-center shadow-sm">
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse [animation-delay:300ms]" />
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="mt-auto pt-4 pb-2">
                <form onSubmit={handleSendChat} className="flex gap-2 p-1.5 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message Sann..."
                    className="flex-1 bg-transparent border-none px-5 text-[15px] text-white placeholder-zinc-500 focus:ring-0 outline-none relative z-10"
                  />
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim() || sendingChat}
                    className="w-11 h-11 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shrink-0 relative z-10 shadow-lg"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-3xl p-6 flex items-center gap-5">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                  <User className="w-7 h-7 text-zinc-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-tight">User Node</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Shield className="w-4 h-4 text-zinc-500" />
                    <p className="text-[12px] font-mono text-zinc-500 truncate max-w-[140px]">
                      {backupId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-1 rounded-3xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/5 flex flex-col justify-between aspect-[4/3]">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-[14px] font-medium text-white">System</p>
                      <p className="text-[12px] text-emerald-400/80 mt-1 font-medium">Optimal Status</p>
                    </div>
                 </div>
                 <div className="col-span-1 rounded-3xl p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/5 flex flex-col justify-between aspect-[4/3]">
                    <Bell className="w-5 h-5 text-zinc-400" />
                    <div>
                      <p className="text-[14px] font-medium text-white">Alerts</p>
                      <p className="text-[12px] text-zinc-500 mt-1">Enabled</p>
                    </div>
                 </div>
              </div>

              <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden">
                <button className="w-full bg-transparent font-medium py-4 px-5 flex items-center justify-between border-b border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Settings className="w-4 h-4 text-zinc-300" />
                    </div>
                    <span className="text-[15px] text-zinc-200">Preferences</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>
                <button 
                  onClick={handleEraseDevice}
                  className="w-full bg-transparent font-medium py-4 px-5 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-[15px] text-red-400">Erase Device</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Navigation */}
      <div className="absolute bottom-8 left-0 w-full px-6 z-30 flex justify-center">
        <nav className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-full p-2 flex gap-1 items-center shadow-2xl">
          {[
            { id: "files", icon: Cloud, label: "Vault" },
            { id: "chat", icon: MessageSquare, label: "AI" },
            { id: "profile", icon: User, label: "Node" }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className="relative flex items-center justify-center w-16 h-12 rounded-full transition-colors"
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-white rounded-full shadow-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors duration-300 ${isActive ? "text-black" : "text-zinc-500 hover:text-zinc-300"}`} />
              </button>
            )
          })}
        </nav>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

