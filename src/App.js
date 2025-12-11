import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
} from "framer-motion";
import { Wifi, Send, CheckCircle2 } from "lucide-react";

// ==========================================
// ⚠️ 请在这里填入您的 Supabase 配置 ⚠️
// ==========================================
const SUPABASE_URL = "https://sorynlhllowseapsqgtw.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvcnlubGhsbG93c2VhcHNxZ3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDUyOTcsImV4cCI6MjA4MTAyMTI5N30.lEKuYBpG8E3N2ZHCR-S-DwW0L1RAJgMbTgw0L1RQC3s";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 组件 1: 手机投票端 (极简设计) ---
const MobileVoting = ({ options }) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [votedId, setVotedId] = useState(null);

  const handleVote = async (id) => {
    if (hasVoted) return;

    // 调用我们在 SQL 里写的原子函数，防止并发冲突
    const { error } = await supabase.rpc("increment_vote", { row_id: id });

    if (!error) {
      setHasVoted(true);
      setVotedId(id);
      localStorage.setItem("has_voted_ai", "true"); // 简单的本地防刷
    } else {
      alert("投票失败，请重试");
    }
  };

  useEffect(() => {
    // 检查是否投过票
    if (localStorage.getItem("has_voted_ai")) {
      setHasVoted(true);
    }
  }, []);

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.5)]"
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">投票成功</h2>
        <p className="text-slate-400">大屏幕上应该已经看到您的一票了！</p>
        <p className="mt-8 text-xs text-slate-600">青干班 AI 课程组</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans">
      <h1 className="text-xl font-bold text-white mb-2">请投票</h1>
      <p className="text-slate-400 text-sm mb-8">
        关于 AI 对设计行业的影响，您的观点是？
      </p>

      <div className="flex flex-col gap-4">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleVote(opt.id)}
            className="relative overflow-hidden group p-4 rounded-xl border border-slate-700 bg-slate-900 active:scale-95 transition-all text-left"
          >
            <div
              className={`absolute inset-0 opacity-10 bg-gradient-to-r ${opt.color}`}
            />
            <span className="text-slate-200 font-medium relative z-10">
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- 组件 2: 大屏端 (含之前的动画逻辑) ---
const BigScreen = ({ initialOptions }) => {
  const [options, setOptions] = useState(initialOptions);
  const totalVotes = options.reduce((acc, curr) => acc + curr.votes, 0);

  // 监听 Supabase 实时数据
  useEffect(() => {
    // 1. 初始获取数据
    const fetchInitial = async () => {
      const { data } = await supabase.from("vote_options").select("*");
      if (data) setOptions(data.sort((a, b) => b.votes - a.votes));
    };
    fetchInitial();

    // 2. 开启实时订阅
    const channel = supabase
      .channel("realtime_votes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "vote_options" },
        (payload) => {
          // 当有人投票，只更新变动的那一行
          setOptions((prev) => {
            const newOpts = prev.map((opt) =>
              opt.id === payload.new.id ? payload.new : opt
            );
            return newOpts.sort((a, b) => b.votes - a.votes);
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center font-sans selection:bg-cyan-500/30 overflow-hidden text-white">
      {/* 这是一个简化的背景，之前的 CyberBackground 代码您可以贴回来 */}
      <div className="absolute inset-0 bg-slate-950 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/30 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <header className="mb-12 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur-md mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-mono text-cyan-300 tracking-widest uppercase">
            Live Connection
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          AI 对设计行业的影响
        </h1>
      </header>

      <main className="w-full max-w-4xl px-8 relative z-10">
        <div className="bg-slate-900/40 border border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {options.map((option, index) => (
                <VoteBar
                  key={option.id}
                  option={option}
                  totalVotes={totalVotes}
                  rank={index + 1}
                />
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center text-slate-500 text-sm font-mono">
            <div className="flex items-center gap-2">
              <Wifi size={16} className="text-green-500 animate-pulse" />
              <span>Supabase Realtime Connected</span>
            </div>
            <div className="text-white text-lg">TOTAL: {totalVotes}</div>
          </div>
        </div>
      </main>

      {/* 二维码占位：这里应该放手机端的 URL */}
      <div className="fixed bottom-8 right-8 bg-white p-2 rounded-xl z-20">
        {/* 这里的二维码请生成指向 ?mode=mobile 的链接 */}
        <div className="w-32 h-32 bg-slate-200 flex items-center justify-center text-slate-900 font-bold text-xs text-center">
          请用草料二维码
          <br />
          生成手机链接
        </div>
      </div>
    </div>
  );
};

// --- 辅助组件: VoteBar (之前的逻辑) ---
const VoteBar = ({ option, totalVotes, rank }) => {
  const percent = totalVotes === 0 ? 0 : (option.votes / totalVotes) * 100;
  const springValue = useSpring(0, { stiffness: 60, damping: 12 });
  const widthStr = useTransform(springValue, (value) => `${value}%`);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    springValue.set(percent);
    return springValue.on("change", (latest) =>
      setDisplayPercent(latest.toFixed(1))
    );
  }, [percent, springValue]);

  return (
    <motion.div
      layout
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="relative mb-6"
    >
      <div className="flex justify-between items-end mb-2 px-1">
        <span className="text-slate-300 font-medium text-lg flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">0{rank}</span>
          {option.label}
        </span>
        <span className="text-2xl font-bold text-white font-mono">
          {option.votes}
        </span>
      </div>
      <div className="h-4 w-full bg-slate-900/50 rounded-full overflow-hidden border border-slate-800 relative">
        <motion.div
          style={{ width: widthStr }}
          className={`h-full absolute left-0 top-0 rounded-full bg-gradient-to-r ${option.color}`}
        />
      </div>
      <motion.div
        className="absolute top-8 text-xs font-mono text-cyan-400/80"
        style={{ left: useTransform(springValue, (v) => `calc(${v}% - 20px)`) }}
      >
        {displayPercent}%
      </motion.div>
    </motion.div>
  );
};

// --- 主入口：根据 URL 判断显示哪个页面 ---
export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  // 简单的初始数据占位，之后会被 Supabase 数据覆盖
  const [options, setOptions] = useState([]);

  useEffect(() => {
    // 检查 URL 是否包含 ?mode=mobile
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("mode") === "mobile") {
      setIsMobile(true);
    }

    // 预加载一次数据
    supabase
      .from("vote_options")
      .select("*")
      .then(({ data }) => {
        if (data) setOptions(data.sort((a, b) => b.votes - a.votes));
      });
  }, []);

  return isMobile ? (
    <MobileVoting options={options} />
  ) : (
    <BigScreen initialOptions={options} />
  );
}
