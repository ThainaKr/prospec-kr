/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AnyRecord = Record<string, any>;
type Notice = (text: string, tone?: "success" | "error") => void;

const ADMIN_CATEGORIES = [
  ["first_message", "Primeira Mensagem", 300, "✈", "petrol"],
  ["audio", "Áudios", 100, "◉", "green"],
  ["post_audio", "Pós-áudio", 100, "▥", "green"],
  ["scheduling", "Agendamento", 100, "▣", "orange"],
  ["meeting_reminder", "Lembrete de reunião", 100, "♢", "yellow"],
  ["post_meeting", "Pós-reunião", 100, "♙", "petrol"],
  ["contract_sending", "Envio de contrato", 100, "▤", "orange"],
  ["follow_up", "Follow-up", 300, "↻", "orange"],
  ["return", "Retorno", 100, "↩", "rust"],
  ["closing", "Encerramento", 100, "⚑", "red"],
] as const;

const LAWYER_CATEGORIES = [
  ["audio", "Áudios", 100, "◉", "green"],
  ["post_audio", "Pós-áudio", 100, "▥", "green"],
  ["scheduling", "Agendamento", 100, "▣", "orange"],
  ["meeting_reminder", "Lembrete de reunião", 100, "♢", "yellow"],
  ["post_meeting", "Pós-reunião", 100, "♙", "petrol"],
  ["contract_sending", "Envio de contrato", 100, "▤", "orange"],
  ["post_meeting_follow_up", "Follow-up pós reunião", 100, "↻", "orange"],
  ["closing", "Encerramento", 100, "⚑", "red"],
] as const;

const NAV_ADMIN = [["home","Início","⌂"],["agenda","Agenda","▦"],["notifications","Notificações","♧"],["lists","Listas e Contatos","♙"],["templates","Modelos de Mensagens","▧"],["reports","Relatórios","▥"],["chips-users","Chips e Usuários","▦"],["settings","Configurações","⚙"]];
const NAV_LAWYER = [["home","Início","⌂"],["agenda","Agenda","▦"],["notifications","Notificações","♧"],["lists","Listas e Contatos","♙"],["templates","Modelos de Mensagens","▧"],["reports","Relatórios","▥"],["profile","Mais","•••"]];

function formatDate(value?: string) {
  if (!value) return "Nunca utilizado";
  try { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
  catch { return "Nunca utilizado"; }
}

function firstName(value?: string) {
  const clean = String(value || "Maria").trim().toLocaleLowerCase("pt-BR");
  const part = clean.split(/\s+/)[0] || "maria";
  return part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1);
}

function normalizeCompany(value?: string) {
  const raw = String(value || "Santander");
  const known = [[/santander/i,"Santander"],[/bradesco/i,"Bradesco"],[/ita[uú]/i,"Itaú"],[/banco do brasil/i,"Banco do Brasil"],[/caixa/i,"Caixa"]] as const;
  return known.find(([pattern]) => pattern.test(raw))?.[1] || raw.replace(/\s*(s\/?a|ltda\.?|banco)\s*/gi," ").trim().split(/[(-]/)[0].trim() || "Empresa";
}

function previewText(body: string, signature: string) {
  return body
    .replaceAll("{NOME}", firstName("Maria Eduarda dos Santos"))
    .replaceAll("{nome}", firstName("Maria Eduarda dos Santos"))
    .replaceAll("{EMPRESA}", normalizeCompany("BANCO SANTANDER (BRASIL) S/A"))
    .replaceAll("{empresa}", normalizeCompany("BANCO SANTANDER (BRASIL) S/A"))
    .replaceAll("{ASSINATURA}", signature || "Dr. Matheus Moreira");
}

export default function TemplatesOfficial({ role, bootstrap, notify, apiAction, onNavigate }: { role: string; bootstrap: AnyRecord; notify: Notice; apiAction: (action: string, payload?: AnyRecord) => Promise<any>; onNavigate: (page: any) => void; }) {
  const isAdmin = role === "admin";
  const categories = useMemo(() => isAdmin ? ADMIN_CATEGORIES : LAWYER_CATEGORIES, [isAdmin]);
  const [category, setCategory] = useState<string>(categories[0][0]);
  const [templates, setTemplates] = useState<AnyRecord[]>([]);
  const [library, setLibrary] = useState(isAdmin ? "admin" : "mine");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("number_asc");
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRecord | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [active, setActive] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const signature = bootstrap.profile?.signature || bootstrap.profile?.full_name || "Dr. Matheus Moreira";
  const selectedMeta = categories.find(([key]) => key === category) || categories[0];

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await apiAction("templates", { category, library, owner_id: library === "mine" ? bootstrap.profile?.id : undefined });
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os modelos.");
      setTemplates([]);
    } finally { setLoading(false); }
  }, [apiAction, bootstrap.profile?.id, category, library]);

  useEffect(() => { load(); setPage(1); }, [load]);
  useEffect(() => { setCategory(categories[0][0]); setLibrary(isAdmin ? "admin" : "mine"); }, [categories, isAdmin]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    const rows = templates.filter((item) => {
      const haystack = [item.name, item.title, item.body, item.position, item.author_name, ...(item.tags || [])].join(" ").toLocaleLowerCase("pt-BR");
      const statusOk = statusFilter === "all" || (statusFilter === "active" ? item.active !== false : item.active === false);
      return statusOk && (!needle || haystack.includes(needle));
    });
    return [...rows].sort((a,b) => {
      if (sort === "number_desc") return Number(b.position || 0) - Number(a.position || 0);
      if (sort === "most_used") return Number(b.usage_count || 0) - Number(a.usage_count || 0);
      if (sort === "least_used") return Number(a.usage_count || 0) - Number(b.usage_count || 0);
      if (sort === "recent") return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      if (sort === "recently_used") return String(b.last_used_at || "").localeCompare(String(a.last_used_at || ""));
      return Number(a.position || 0) - Number(b.position || 0);
    });
  }, [templates, query, statusFilter, sort]);

  const counts = useMemo(() => Object.fromEntries(categories.map(([key]) => [key, key === category ? templates.length : Number(bootstrap.template_counts?.[key] || 0)])), [categories, category, templates.length, bootstrap.template_counts]);
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const resetEditor = (model?: AnyRecord) => {
    setEditing(model || null); setTitle(model?.name || model?.title || ""); setBody(model?.body || "");
    setTags(Array.isArray(model?.tags) ? model.tags : []); setActive(model?.active !== false); setNote(model?.note || ""); setEditorOpen(true);
  };

  const insertVariable = (variable: string) => {
    const field = textareaRef.current;
    const start = field?.selectionStart ?? body.length;
    const end = field?.selectionEnd ?? body.length;
    setBody(body.slice(0,start) + variable + body.slice(end));
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + variable.length, start + variable.length); });
  };

  const save = async () => {
    if (!title.trim() || !body.trim()) { notify("Preencha o título e a mensagem.", "error"); return; }
    if (!editing && templates.length >= selectedMeta[2]) { notify("O limite desta categoria foi atingido.", "error"); return; }
    setSaving(true);
    try {
      await apiAction("save_template", { id: editing?.id || undefined, category, name: title.trim(), body, tags, active, note, library, owner_id: bootstrap.profile?.id });
      notify(editing ? "Modelo atualizado." : "Modelo criado."); setEditorOpen(false); await load();
    } catch (err) { notify(err instanceof Error ? err.message : "Falha ao salvar modelo.", "error"); }
    finally { setSaving(false); }
  };

  const duplicate = async (item: AnyRecord) => {
    if (templates.length >= selectedMeta[2]) { notify("O limite desta categoria foi atingido.", "error"); return; }
    try { await apiAction("save_template", { category, name: `${item.name || item.title} — cópia`, body: item.body, tags: item.tags || [], library, owner_id: bootstrap.profile?.id }); notify("Modelo duplicado."); await load(); }
    catch (err) { notify(err instanceof Error ? err.message : "Falha ao duplicar.", "error"); }
  };

  const remove = async (item: AnyRecord) => {
    if (!window.confirm("Tem certeza de que deseja excluir este modelo?\n\nO histórico de utilização continuará preservado.")) return;
    try { await apiAction("delete_template", { id: item.id, archive: true }); notify("Modelo arquivado. O histórico foi preservado."); await load(); }
    catch (err) { notify(err instanceof Error ? err.message : "Falha ao excluir modelo.", "error"); }
  };

  const toggleActive = async (item: AnyRecord) => {
    try { await apiAction("save_template", { id: item.id, category, name: item.name || item.title, body: item.body, active: item.active === false, tags: item.tags || [] }); notify(item.active === false ? "Modelo ativado." : "Modelo desativado."); await load(); }
    catch (err) { notify(err instanceof Error ? err.message : "Falha ao alterar status.", "error"); }
  };

  const copy = async (item: AnyRecord) => { await navigator.clipboard.writeText(item.body || ""); notify("Texto copiado. O uso não foi contabilizado."); };
  const addTag = () => { const clean = tagDraft.trim(); if (clean && !tags.includes(clean)) setTags([...tags, clean]); setTagDraft(""); };

  const nav = isAdmin ? NAV_ADMIN : NAV_LAWYER;
  return <div className="templates-official-shell">
    <aside className="templates-sidebar">
      <div className="templates-brand"><span>✧</span> PROSPEC <b>KR</b></div>
      <nav>{nav.map(([key,label,icon]) => <button key={key} className={key === "templates" ? "active" : ""} onClick={() => onNavigate(key)}><span>{icon}</span>{label}</button>)}</nav>
      <div className="templates-side-card"><strong>{isAdmin ? "Bibliotecas protegidas" : "Meu desempenho"}</strong><small>{isAdmin ? "Cada advogado possui registros separados." : "Acompanhe o uso dos seus modelos."}</small><i><em style={{width:`${Math.min(100, templates.length)}%`}} /></i></div>
      <button className="templates-help">◉ Ajuda e Suporte</button>
    </aside>

    <main className="templates-main">
      <header className="templates-topbar">
        <button className="templates-menu" aria-label="Abrir menu">☰</button>
        <label className="templates-global-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar modelos, categorias, tags..."/><kbd>Ctrl + K</kbd></label>
        <button className="templates-quick" onClick={()=>resetEditor()}>＋</button>
        <button className="templates-top-icon">♧<b>{bootstrap.counters?.notifications || 0}</b></button><button className="templates-top-icon">▤</button><button className="templates-top-icon">▥</button>
        <div className="templates-profile"><span>{firstName(bootstrap.profile?.full_name || (isAdmin ? "Thainá" : "Matheus"))[0]}</span><div><strong>{bootstrap.profile?.full_name || (isAdmin ? "Thainá Krause" : "Dr. Matheus Moreira")}</strong><small>{isAdmin ? "Administradora" : "Advogado"}</small></div>⌄</div>
      </header>

      <section className={`templates-content ${editorOpen ? "with-editor" : ""}`}>
        <div className="templates-heading"><div><h1>Modelos de Mensagens</h1><p>Crie, organize e utilize modelos para agilizar suas prospecções e atendimentos.</p></div><button onClick={()=>resetEditor()}>＋ Novo modelo</button></div>
        <div className="library-tabs">
          {isAdmin ? <><button className={library==="admin"?"active":""} onClick={()=>setLibrary("admin")}>Biblioteca da Administradora</button><button className={library==="lawyers"?"active":""} onClick={()=>setLibrary("lawyers")}>Biblioteca dos Advogados</button></> : <button className="active">Minha Biblioteca</button>}
        </div>

        <div className="category-title"><h2>{isAdmin ? "Categorias de modelos" : "Categorias disponíveis"}</h2><button onClick={()=>notify("As categorias oficiais já estão configuradas conforme seu perfil.")}>＋ Nova categoria</button></div>
        <div className="template-category-grid">{categories.map(([key,label,limit,icon,tone]) => { const total=counts[key]||0; return <button key={key} className={`${category===key?"active":""} ${tone}`} onClick={()=>setCategory(key)}><span>{icon}</span><div><strong>{label}</strong><small>{total} de {limit} modelos</small><i><em style={{width:`${Math.min(100,total/limit*100)}%`}}/></i></div></button>})}</div>

        <section className="models-panel">
          <header><div><h2>{selectedMeta[1]}</h2><span>{templates.length} de {selectedMeta[2]} modelos</span></div><label>⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nesta categoria..."/></label><button onClick={()=>setFilterOpen(!filterOpen)}>☷ Filtros</button></header>
          {filterOpen && <div className="models-filters"><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Todos os status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="number_asc">Número crescente</option><option value="number_desc">Número decrescente</option><option value="most_used">Mais utilizados</option><option value="least_used">Menos utilizados</option><option value="recent">Mais recentes</option><option value="recently_used">Usados recentemente</option></select><button onClick={()=>{setQuery("");setStatusFilter("all");setSort("number_asc")}}>Limpar filtros</button></div>}
          {loading ? <div className="models-loading">{[1,2,3,4].map(i=><i key={i}/>)}</div> : error ? <div className="models-state"><b>Não foi possível carregar</b><p>{error}</p><button onClick={load}>Tentar novamente</button></div> : visible.length===0 ? <div className="models-state"><span>✎</span><b>{query ? "Nenhum modelo encontrado" : "Categoria vazia"}</b><p>{query ? "Tente outra busca ou limpe os filtros." : "Os modelos começam vazios. Crie o primeiro quando desejar."}</p><button onClick={()=>resetEditor()}>Criar primeiro modelo</button></div> : <>
            <div className="models-table"><div className="models-row table-head"><span>Nº</span><span>Modelo</span><span>Tags</span><span>Usos</span><span>Última utilização</span><span>Autor</span><span>Ações</span></div>{visible.map(item=><article className={`models-row ${item.active===false?"inactive":""}`} key={item.id}><b>{String(item.position || templates.indexOf(item)+1).padStart(3,"0")}</b><div><strong>{item.name || item.title || "Modelo sem título"}</strong><p>{item.body}</p></div><div className="model-tags">{(item.tags||[]).slice(0,2).map((tag:string)=><em key={tag}>{tag}</em>)}{!(item.tags||[]).length&&<small>Sem tags</small>}</div><span>{item.usage_count||0}</span><time>{formatDate(item.last_used_at)}</time><span>{item.author_name || bootstrap.profile?.full_name || "Você"}</span><div className="row-actions"><button title="Visualizar" onClick={()=>{setEditing(item);setPreviewOpen(true)}}>◉</button><button title="Editar" onClick={()=>resetEditor(item)}>✎</button><button title="Duplicar" onClick={()=>duplicate(item)}>▣</button><button title="Copiar" onClick={()=>copy(item)}>⧉</button><button title={item.active===false?"Ativar":"Desativar"} onClick={()=>toggleActive(item)}>◌</button><button className="danger" title="Excluir" onClick={()=>remove(item)}>♲</button></div></article>)}</div>
            <footer className="models-pagination"><span>Mostrando {(page-1)*pageSize+1} a {Math.min(page*pageSize,filtered.length)} de {filtered.length} modelos</span><div><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>{Array.from({length:Math.min(5,pages)},(_,i)=>i+1).map(p=><button key={p} className={page===p?"active":""} onClick={()=>setPage(p)}>{p}</button>)}<button disabled={page===pages} onClick={()=>setPage(p=>p+1)}>›</button></div></footer>
          </>}
        </section>

        {isAdmin && ["first_message","follow_up"].includes(category) && <section className="sequence-card"><div><span>↻</span><div><strong>Distribuição sequencial ativa</strong><p>001 → 002 → 003 → … → último modelo ativo → 001. A sequência só avança após o envio confirmado.</p></div></div><small>Telefones inválidos mantêm o modelo reservado. {"{NOME}"} e {"{EMPRESA}"} são preenchidos apenas no uso.</small></section>}
      </section>

      {editorOpen && <aside className="template-editor">
        <header><h2>{editing ? "Editar modelo" : "Novo modelo"}</h2><button onClick={()=>setEditorOpen(false)}>×</button></header>
        <label>Categoria<select value={category} onChange={e=>setCategory(e.target.value as any)}>{categories.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Título do modelo<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Digite um título claro" maxLength={120}/></label>
        {category==="audio" ? <div className="audio-editor"><label>Arquivo de áudio<input type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/x-m4a" onChange={e=>notify(e.target.files?.[0] ? "Áudio selecionado para envio seguro ao salvar." : "Selecione um áudio.")}/></label><div className="audio-wave"><button>▶</button><i/><time>00:00</time></div><button onClick={()=>notify("Gravação habilitada quando o navegador autorizar o microfone.")}>◉ Gravar áudio</button></div> : null}
        <label>Mensagem<div className="editor-toolbar"><button onClick={()=>insertVariable("*texto*")}><b>B</b></button><button onClick={()=>insertVariable("_texto_")}><i>I</i></button><button onClick={()=>insertVariable("~texto~")}><u>S</u></button><button onClick={()=>insertVariable("• ")}>☷</button><button onClick={()=>insertVariable("1. ")}>☰</button><button onClick={()=>insertVariable("https://")}>↗</button></div><textarea ref={textareaRef} value={body} onChange={e=>setBody(e.target.value)} placeholder="Digite a mensagem..." rows={8}/><small className="char-count">{body.length}/4096</small></label>
        <div className="variables"><span>Variáveis disponíveis:</span><div><button onClick={()=>insertVariable("{NOME}")}>{"{NOME}"}</button><button onClick={()=>insertVariable("{EMPRESA}")}>{"{EMPRESA}"}</button>{!isAdmin&&<button onClick={()=>insertVariable("{ASSINATURA}")}>{"{ASSINATURA}"}</button>}</div></div>
        <label>Tags<div className="tag-input"><input value={tagDraft} onChange={e=>setTagDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTag()}}} placeholder="Criar ou selecionar tag"/><button onClick={addTag}>＋</button></div><div className="selected-tags">{tags.map(tag=><button key={tag} onClick={()=>setTags(tags.filter(t=>t!==tag))}>{tag} ×</button>)}</div></label>
        <label>Observação interna<textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Opcional — não será enviada ao contato"/></label>
        <label className="status-toggle"><span><b>Modelo ativo</b><small>Modelos inativos não entram na distribuição.</small></span><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/></label>
        <div className="whatsapp-preview"><header>Pré-visualização <button onClick={()=>setPreviewOpen(true)}>Expandir</button></header><p>{previewText(body || "Sua mensagem aparecerá aqui.", signature)}</p><time>10:30 ✓✓</time></div>
        <footer><button onClick={()=>setEditorOpen(false)}>Cancelar</button><button className="save" disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar modelo"}</button></footer>
      </aside>}

      {previewOpen && <div className="preview-modal" onClick={()=>setPreviewOpen(false)}><section onClick={e=>e.stopPropagation()}><header><h2>Pré-visualização</h2><button onClick={()=>setPreviewOpen(false)}>×</button></header><div className="preview-phone"><p>{previewText(editing?.body || body || "Sua mensagem aparecerá aqui.", signature)}</p><time>10:30 ✓✓</time></div><small>A prévia é uma simulação e não contabiliza uso.</small></section></div>}

      <button className="templates-fab" onClick={()=>resetEditor()}>＋</button>
      <nav className="templates-mobile-nav">{(isAdmin ? [["home","Início","⌂"],["notifications","Notificações","♧"],["agenda","Agenda","▦"],["lists","Listas","☷"],["templates","Mais","•••"]] : NAV_LAWYER.filter(([key])=>["home","notifications","agenda","lists","profile"].includes(key))).map(([key,label,icon])=><button key={key} className={key==="templates"||(!isAdmin&&key==="profile")?"active":""} onClick={()=>onNavigate(key)}><span>{icon}</span><small>{label}</small></button>)}</nav>
    </main>
  </div>;
}
