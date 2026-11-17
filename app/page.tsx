"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, AlertCircle, ArrowRight, BarChart3, BookOpenCheck, Check,
  CheckCircle2, ChevronRight, CircleHelp, Clock3, Code2, FileSearch,
  FolderGit2, GitBranch, Github, LayoutDashboard, LockKeyhole, Plus,
  Search, Settings2, ShieldCheck, ShieldAlert, Sparkles, Trash2, WandSparkles
} from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import type { AnalysisReport, Finding, Rigor } from "@/lib/types";

type Tab = "guardian" | "analises" | "projetos" | "configuracoes";
const STORAGE = "citi-guardian-mvp-v1";
const formatTime = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const levelLabel = { alta: "Alta", media: "Média", baixa: "Baixa" };
const categoryLabel = { ausente: "Informação ausente", desatualizada: "Desatualização", contraditoria: "Inconsistência", clareza: "Clareza" };
const navItems: Array<{ key: Tab; title: string; icon: typeof ShieldCheck }> = [
  { key: "guardian", title: "Guardian", icon: LayoutDashboard },
  { key: "analises", title: "Análises", icon: BarChart3 },
  { key: "projetos", title: "Projetos", icon: FolderGit2 },
  { key: "configuracoes", title: "Configurações", icon: Settings2 }
];

function Meter({ value, size = "large" }: { value: number; size?: "large" | "small" }) {
  return (
    <div className={`meter meter-${size}`} style={{ background: `conic-gradient(#51ff9e ${Math.max(0, Math.min(100, value))}%, #273331 0)` }}>
      <div className="meter-inner"><strong>{value}%</strong><span>cobertura</span></div>
    </div>
  );
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  return (
    <article className="finding-card">
      <div className="finding-head">
        <span className="finding-number">{String(index + 1).padStart(2, "0")}</span>
        <div className="finding-title-area"><h4>{finding.title}</h4><span>{categoryLabel[finding.category]}</span></div>
        <span className={`severity severity-${finding.severity}`}>{levelLabel[finding.severity]}</span>
      </div>
      <p>{finding.explanation}</p>
      <div className="evidence"><Code2 size={14}/><span>{finding.evidence.path}</span><code>{finding.evidence.excerpt}</code></div>
      <div className="recommendation"><Sparkles size={15}/><span><strong>Sugestão:</strong> {finding.suggestion}</span></div>
    </article>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("guardian");
  const [url, setUrl] = useState("");
  const [projectInput, setProjectInput] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [rigor, setRigor] = useState<Rigor>("moderado");
  const [selectedProject, setSelectedProject] = useState("todos");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      if (Array.isArray(stored.history)) setHistory(stored.history);
      if (Array.isArray(stored.projects)) setProjects(stored.projects);
      if (stored.rigor === "moderado" || stored.rigor === "rigoroso") setRigor(stored.rigor);
    } catch { /* Dados locais corrompidos: iniciar com estado vazio. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE, JSON.stringify({ history: history.slice(0, 40), projects, rigor })); }
    catch { setFeedback("O navegador não conseguiu salvar o histórico local."); }
  }, [history, projects, rigor, hydrated]);

  const recent = history[0];
  const totalFindings = history.reduce((sum, item) => sum + item.findings.length, 0);
  const filteredHistory = useMemo(() => selectedProject === "todos" ? history : history.filter(x => x.repository === selectedProject), [history, selectedProject]);
  const chartData = useMemo(() => [...filteredHistory].reverse().map((x, i) => ({
    label: `${i + 1}ª`, coverage: x.coverage, date: formatTime(x.analyzedAt), repository: x.repository
  })), [filteredHistory]);
  const lastByRepo = useMemo(() => new Map(history.slice().reverse().map(r => [r.repository, r])), [history]);

  function rememberProject(value: string) {
    const match = value.trim().match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
    if (!match) { setFeedback("Insira uma URL como https://github.com/usuario/repositorio"); return false; }
    const normalized = `https://github.com/${match[1]}/${match[2]}`;
    setProjects(p => p.includes(normalized) ? p : [normalized, ...p]);
    setFeedback("Repositório adicionado à lista local.");
    return true;
  }

  async function analyze(event?: FormEvent) {
    event?.preventDefault();
    if (!url.trim()) { setError("Informe a URL de um repositório GitHub público."); return; }
    setBusy(true); setError(""); setFeedback(""); setReport(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl: url, rigor })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na análise.");
      const result = data as AnalysisReport;
      setReport(result);
      setHistory(prev => [result, ...prev].slice(0, 40));
      setProjects(prev => prev.includes(result.url) ? prev : [result.url, ...prev]);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado."); }
    finally { setBusy(false); }
  }

  function startProject(projectUrl: string) { setUrl(projectUrl); setReport(null); setError(""); setActiveTab("guardian"); }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-symbol"><ShieldCheck size={27}/></div><div><div className="brand-citi">CITi <span>guardian</span></div><small>INTELLIGENCE PLATFORM</small></div></div>
        <div className="sidebar-label">PLATAFORMA</div>
        <nav aria-label="Menu principal">
          {navItems.map(item => <button key={item.key} className={`nav-item ${activeTab === item.key ? "active" : ""}`} onClick={() => { setActiveTab(item.key); setError(""); setFeedback(""); }}><item.icon size={19}/><span>{item.title}</span>{activeTab === item.key && <span className="nav-dot"/>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-info"><div className="pulse-dot"/><span>GUARDIAN MVP</span><strong>v0.1</strong></div><p>Conhecimento protegido.<br/>Projetos preparados para evoluir.</p></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">CITi Guardian <ChevronRight size={14}/> <strong>{navItems.find(x => x.key === activeTab)?.title}</strong></div><div className="topbar-right"><div className="online-tag"><span className="pulse-dot"/> AMBIENTE MVP</div><div className="user-icon"><ShieldCheck size={19}/></div></div></header>
        <div className="content">
          {activeTab === "guardian" && <>
            <section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> INTELIGÊNCIA DOCUMENTAL</div><h1>Seu código evolui.<br/><em>A documentação acompanha.</em></h1><p>Uma IA que encontra lacunas entre o código e o conhecimento registrado — antes que elas se tornem problemas.</p><div className="hero-meta"><span><CheckCircle2 size={15}/> Análise fundamentada</span><span><LockKeyhole size={15}/> Repositórios públicos</span></div></div><div className="hero-visual"><div className="hero-grid"/><div className="hero-orbit orbit-outer"/><div className="hero-orbit orbit-inner"/><div className="hero-core"><ShieldCheck size={60} strokeWidth={1.35}/></div><div className="hero-glow"/></div></section>

            <section className="panel analyze-panel"><div className="section-intro"><div><div className="tiny-label">CENTRAL DE MONITORAMENTO</div><h2>Nova análise <span className="green-text">inteligente</span></h2><p>Insira um repositório para avaliar seu nível de documentação.</p></div><div className="active-pill"><Activity size={15}/> SISTEMA PRONTO</div></div>
              <form className="analyze-form" onSubmit={analyze}><div className="repo-input"><Github size={20}/><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/usuario/repositorio" aria-label="URL do repositório" required /></div><button className="primary-btn" disabled={busy} type="submit">{busy ? "Analisando..." : "Analisar projeto"}{!busy && <ArrowRight size={17}/>}</button></form>
              <p className="disclaimer"><ShieldAlert size={14}/> Os arquivos serão analisados pelo modelo configurado (Ollama local ou API externa). Não utilize repositórios com segredos ou informações sensíveis.</p>
              {error && <div className="alert alert-error"><AlertCircle size={18}/>{error}</div>}
            </section>

            {busy && <section className="panel loading-panel"><div className="spinner"/><div><h3>Investigando o repositório...</h3><p>Lendo documentação, selecionando código e consultando a inteligência artificial.</p></div></section>}
            {report ? <>
              <section className="results-title"><div><span className="tiny-label">RELATÓRIO ATUAL</span><h2>{report.repository}</h2><p>Branch {report.branch} • {formatTime(report.analyzedAt)} • {report.analyzedFiles.length} arquivos examinados • {report.model}</p></div><a className="outline-btn" href={report.url} target="_blank" rel="noopener noreferrer"><Github size={16}/> Ver repositório</a></section>
              <div className="results-grid"><div className="panel score-panel"><div className="tiny-label">CRITÉRIOS DOCUMENTAIS</div><Meter value={report.coverage}/><p>Indicador de critérios mínimos documentados, não uma nota absoluta da qualidade do código.</p></div><div className="panel insight-panel"><div className="tiny-label">DIAGNÓSTICO DA IA</div><div className="finding-metric"><ShieldAlert size={27}/><strong>{report.findings.length}</strong><span>possíveis lacunas identificadas</span></div><p>{report.summary}</p></div><div className="panel criteria-panel"><div className="tiny-label">CHECKLIST DE DOCUMENTAÇÃO</div>{report.criteria.map(x => <div className="criterion" key={x.name}>{x.met ? <CheckCircle2 size={16} className="ok"/> : <AlertCircle size={16} className="warn"/>}<span title={x.reason}>{x.name}</span></div>)}</div></div>
              <section className="findings-section"><div className="section-row"><h2>Lacunas detectadas</h2><span className="counter">{report.findings.length} ocorrências</span></div>{report.findings.length ? <div className="findings-grid">{report.findings.map((f, i) => <FindingCard key={`${f.title}-${i}`} finding={f} index={i}/>)}</div> : <div className="empty-panel"><CheckCircle2 size={30}/><h3>Nenhuma lacuna comprovada nesta amostra</h3><p>Isso não garante que a documentação do projeto esteja completa. Consulte os critérios e arquivos analisados.</p></div>}</section>
              <section className="panel files-panel"><div className="tiny-label">ARQUIVOS CONSIDERADOS PELA IA</div><div className="file-tags">{report.analyzedFiles.map(f => <span key={f}><Code2 size={13}/>{f}</span>)}</div></section>
            </> : !busy && <div className="welcome-grid"><div className="feature"><FileSearch size={22}/><h3>Encontre o que falta</h3><p>Localize informações insuficientes ou conflitantes entre arquivos e README.</p></div><div className="feature"><WandSparkles size={22}/><h3>Entenda cada alerta</h3><p>Receba sugestões de melhoria acompanhadas de referências verificáveis.</p></div><div className="feature"><BookOpenCheck size={22}/><h3>Preserve o conhecimento</h3><p>Acompanhe a evolução documental entre diferentes análises.</p></div></div>}
          </>}

          {activeTab === "analises" && <><section className="page-heading"><span className="tiny-label">INTELIGÊNCIA DE DADOS</span><h1>Painel de <em>Análises</em></h1><p>Acompanhe a evolução da documentação com base em análises reais.</p></section>
            <div className="stats-grid"><div className="stat-card"><Activity size={19}/><span>ANÁLISES REALIZADAS</span><strong>{history.length}</strong><small>Registradas neste navegador</small></div><div className="stat-card"><ShieldAlert size={19}/><span>LACUNAS DETECTADAS</span><strong>{totalFindings}</strong><small>Total de achados nas execuções</small></div><div className="stat-card"><BookOpenCheck size={19}/><span>COBERTURA RECENTE</span><strong>{recent ? `${recent.coverage}%` : "—"}</strong><small>{recent?.repository || "Aguardando primeira análise"}</small></div></div>
            <section className="panel chart-panel"><div className="section-intro"><div><div className="tiny-label">EVOLUÇÃO DOCUMENTAL</div><h2>Cobertura ao longo das análises</h2></div><select aria-label="Filtrar projeto" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}><option value="todos">Todos os projetos</option>{[...new Set(history.map(x => x.repository))].map(x => <option key={x} value={x}>{x}</option>)}</select></div>
              {chartData.length ? <><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{top:15,right:20,left:-20,bottom:10}}><CartesianGrid stroke="#254039" vertical={false} strokeDasharray="5 6"/><XAxis dataKey="label" stroke="#748f85" axisLine={false} tickLine={false}/><YAxis domain={[0,100]} stroke="#748f85" axisLine={false} tickLine={false} tickFormatter={v => `${v}%`}/><Tooltip contentStyle={{background:"#14221d",border:"1px solid #2f7651",borderRadius:12,color:"#e6ffef"}} formatter={v => [`${v}%`,"Cobertura"]} labelFormatter={(_,payload) => payload[0]?.payload?.date || ""}/><Line type="monotone" dataKey="coverage" stroke="#5aff9a" strokeWidth={3} dot={{r:5,fill:"#51ff9e",stroke:"#112a1b",strokeWidth:2}} activeDot={{r:7}}/></LineChart></ResponsiveContainer></div><p className="chart-footnote">Percentual dos critérios de documentação verificados; cada ponto representa uma execução.</p></> : <div className="chart-empty"><BarChart3 size={36}/><h3>O gráfico começa com a primeira análise</h3><p>Execute a análise de um repositório na aba Guardian.</p><button className="text-link" onClick={()=>setActiveTab("guardian")}>Ir para Guardian <ArrowRight size={15}/></button></div>}
            </section>
            <section className="panel table-panel"><div className="section-intro"><div><div className="tiny-label">REGISTROS SALVOS</div><h2>Histórico de análises</h2></div><span className="counter">{filteredHistory.length} registros</span></div>{filteredHistory.length ? <div className="table-scroll"><table><thead><tr><th>Projeto</th><th>Data</th><th>Cobertura</th><th>Lacunas</th><th></th></tr></thead><tbody>{filteredHistory.map(h => <tr key={h.id}><td><strong>{h.repository}</strong></td><td>{formatTime(h.analyzedAt)}</td><td><span className="table-green">{h.coverage}%</span></td><td>{h.findings.length}</td><td><button className="table-action" onClick={()=>{setReport(h);setUrl(h.url);setActiveTab("guardian");}}>Ver relatório <ChevronRight size={15}/></button></td></tr>)}</tbody></table></div> : <p className="muted">Nenhuma análise registrada para o filtro escolhido.</p>}</section>
          </>}

          {activeTab === "projetos" && <><section className="page-heading"><span className="tiny-label">REPOSITÓRIOS MONITORADOS</span><h1>Meus <em>Projetos</em></h1><p>Organize repositórios e inicie análises quando precisar.</p></section>
            <section className="panel project-add"><div className="section-intro"><div><div className="tiny-label">NOVO REPOSITÓRIO</div><h2>Adicionar projeto</h2></div><FolderGit2 size={26} className="green-text"/></div><form className="analyze-form" onSubmit={e=>{e.preventDefault();if(rememberProject(projectInput))setProjectInput("");}}><div className="repo-input"><Github size={19}/><input value={projectInput} onChange={e=>setProjectInput(e.target.value)} placeholder="https://github.com/usuario/repositorio" required aria-label="Novo repositório"/></div><button className="primary-btn" type="submit"><Plus size={17}/> Adicionar</button></form>{feedback && <div className="notice">{feedback}</div>}</section>
            <div className="section-row projects-title"><h2>Repositórios cadastrados</h2><span className="counter">{projects.length} projetos</span></div>
            {projects.length ? <div className="projects-grid">{projects.map(p => {const name = p.replace("https://github.com/","");const latest=lastByRepo.get(name);return <article className="panel project-card" key={p}><div className="project-icon"><Github size={26}/></div><div className="project-details"><h3>{name}</h3><p>{latest ? `Última análise: ${formatTime(latest.analyzedAt)}` : "Ainda não analisado"}</p></div><div className="project-footer"><div>{latest ? <Meter value={latest.coverage} size="small"/> : <span className="muted">Sem indicador</span>}</div><div className="project-buttons"><button className="icon-button" title="Remover projeto da lista" aria-label={`Remover ${name}`} onClick={()=>setProjects(prev=>prev.filter(x=>x!==p))}><Trash2 size={16}/></button><button className="secondary-btn" onClick={()=>startProject(p)}>Analisar <ArrowRight size={15}/></button></div></div></article>})}</div> : <div className="empty-panel"><FolderGit2 size={32}/><h3>Seus projetos aparecerão aqui</h3><p>Adicione um repositório público ou execute uma análise para cadastrá-lo automaticamente.</p></div>}
          </>}

          {activeTab === "configuracoes" && <><section className="page-heading"><span className="tiny-label">PREFERÊNCIAS DA PLATAFORMA</span><h1>Configurações do <em>Guardian</em></h1><p>Defina como a IA analisa os arquivos e conheça os limites da versão atual.</p></section>
            <section className="panel setting-panel"><div className="setting-title"><div className="setting-icon"><Sparkles size={25}/></div><div><h2>Rigor da análise</h2><p>Determine a profundidade da investigação feita pela IA.</p></div></div><div className="setting-options"><button onClick={()=>setRigor("moderado")} className={`setting-option ${rigor==="moderado"?"selected":""}`}><span className="radio-check">{rigor==="moderado" && <Check size={13}/>}</span><span><strong>Moderado</strong><small>Prioriza evidências sólidas e inconsistências verificáveis. Recomendado para o MVP.</small></span></button><button onClick={()=>setRigor("rigoroso")} className={`setting-option ${rigor==="rigoroso"?"selected":""}`}><span className="radio-check">{rigor==="rigoroso" && <Check size={13}/>}</span><span><strong>Rigoroso</strong><small>Investiga também possíveis lacunas de contexto e clareza, com mais hipóteses para revisão humana.</small></span></button></div></section>
            <section className="settings-row"><div className="panel setting-note"><LockKeyhole size={24}/><h3>Privacidade e segurança</h3><p>Somente repositórios públicos são aceitos. Com Ollama, a análise roda no computador. Se escolher OpenAI, os trechos usam uma API externa. Evite dados pessoais e segredos.</p></div><div className="panel setting-note"><Clock3 size={24}/><h3>Frequência</h3><p>Nesta primeira versão, as análises são iniciadas manualmente. Monitoramento semanal e por pull request fazem parte das próximas etapas.</p></div><div className="panel setting-note"><CircleHelp size={24}/><h3>Dados de histórico</h3><p>Os relatórios são salvos apenas no armazenamento local deste navegador (máximo de 40). Não há sincronização entre dispositivos.</p></div></section>
          </>}
          <footer>© CITi Guardian — Protótipo independente para o desafio de inovação. Não é uma ferramenta oficial do CITi.</footer>
        </div>
      </main>
    </div>
  );
}
