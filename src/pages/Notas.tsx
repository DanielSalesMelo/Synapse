import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextStyle from "@tiptap/extension-text-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus, Search, Pin, Archive, Trash2, Copy, Tag, Folder,
  Bold, Italic, UnderlineIcon, Strikethrough, Code, List,
  ListOrdered, CheckSquare, Heading1, Heading2, Heading3,
  Quote, Minus, Undo, Redo, Highlighter, FileText,
  ChevronRight, Star, Clock, Hash, BookOpen, StickyNote,
} from "lucide-react";

// ─── Cores das notas ──────────────────────────────────────────────────────────
const CORES: Record<string, { bg: string; border: string; label: string }> = {
  default: { bg: "bg-card", border: "border-border", label: "Padrão" },
  yellow:  { bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-300 dark:border-yellow-700", label: "Amarelo" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-300 dark:border-blue-700", label: "Azul" },
  green:   { bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-300 dark:border-green-700", label: "Verde" },
  red:     { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-300 dark:border-red-700", label: "Vermelho" },
  purple:  { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-300 dark:border-purple-700", label: "Roxo" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-300 dark:border-orange-700", label: "Laranja" },
};

// ─── Toolbar do editor ────────────────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <button
      key={title}
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? "bg-muted text-primary" : "text-muted-foreground"}`}
    >
      {icon}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b bg-muted/30">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-4 w-4" />, "Negrito (Ctrl+B)")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-4 w-4" />, "Itálico (Ctrl+I)")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-4 w-4" />, "Sublinhado (Ctrl+U)")}
      {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), <Strikethrough className="h-4 w-4" />, "Tachado")}
      {btn(editor.isActive("highlight"), () => editor.chain().focus().toggleHighlight().run(), <Highlighter className="h-4 w-4" />, "Destacar")}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="h-4 w-4" />, "Título 1")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-4 w-4" />, "Título 2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-4 w-4" />, "Título 3")}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-4 w-4" />, "Lista")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-4 w-4" />, "Lista numerada")}
      {btn(editor.isActive("taskList"), () => editor.chain().focus().toggleTaskList().run(), <CheckSquare className="h-4 w-4" />, "Lista de tarefas")}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), <Code className="h-4 w-4" />, "Código inline")}
      {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), <FileText className="h-4 w-4" />, "Bloco de código (SQL, JS...)")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="h-4 w-4" />, "Citação")}
      <button
        title="Separador"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      {btn(false, () => editor.chain().focus().undo().run(), <Undo className="h-4 w-4" />, "Desfazer (Ctrl+Z)")}
      {btn(false, () => editor.chain().focus().redo().run(), <Redo className="h-4 w-4" />, "Refazer (Ctrl+Y)")}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Notas() {
  const [pastaSelecionada, setPastaSelecionada] = useState("todas");
  const [tagSelecionada, setTagSelecionada] = useState("");
  const [search, setSearch] = useState("");
  const [notaSelecionada, setNotaSelecionada] = useState<any>(null);
  const [showArquivadas, setShowArquivadas] = useState(false);
  const [showNovaPasta, setShowNovaPasta] = useState(false);
  const [novaPastaNome, setNovaPastaNome] = useState("");
  const [showPropriedades, setShowPropriedades] = useState(false);
  const [tituloEditando, setTituloEditando] = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Queries
  const notasQ = trpc.notas.list.useQuery({ pasta: pastaSelecionada, search, tag: tagSelecionada, arquivadas: showArquivadas }, { refetchInterval: 30000 });
  const pastasQ = trpc.notas.listPastas.useQuery();
  const tagsQ = trpc.notas.listTags.useQuery();

  // Mutations
  const createNota = trpc.notas.create.useMutation({ onSuccess: (data) => { notasQ.refetch(); pastasQ.refetch(); if (data) { setNotaSelecionada(data); setTituloEditando(data.titulo); } } });
  const updateNota = trpc.notas.update.useMutation({ onSuccess: () => { notasQ.refetch(); pastasQ.refetch(); tagsQ.refetch(); } });
  const autoSave = trpc.notas.autoSave.useMutation({ onSuccess: () => setSalvando(false) });
  const toggleFixada = trpc.notas.toggleFixada.useMutation({ onSuccess: () => notasQ.refetch() });
  const toggleArquivada = trpc.notas.toggleArquivada.useMutation({ onSuccess: () => { notasQ.refetch(); setNotaSelecionada(null); } });
  const deleteNota = trpc.notas.delete.useMutation({ onSuccess: () => { notasQ.refetch(); setNotaSelecionada(null); toast.success("Nota excluída"); } });
  const duplicateNota = trpc.notas.duplicate.useMutation({ onSuccess: () => { notasQ.refetch(); toast.success("Nota duplicada"); } });

  // Editor TipTap
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Comece a escrever... (suporta SQL, código, listas, títulos e muito mais)" }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
    ],
    content: notaSelecionada?.conteudo || "",
    onUpdate: ({ editor }) => {
      if (!notaSelecionada) return;
      setSalvando(true);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        autoSave.mutate({ id: notaSelecionada.id, titulo: tituloEditando, conteudo: editor.getHTML() });
      }, 1500);
    },
  });

  // Carregar nota no editor quando muda
  useEffect(() => {
    if (editor && notaSelecionada) {
      editor.commands.setContent(notaSelecionada.conteudo || "");
      setTituloEditando(notaSelecionada.titulo || "");
    }
  }, [notaSelecionada?.id]);

  // Auto-save do título
  const handleTituloChange = useCallback((titulo: string) => {
    setTituloEditando(titulo);
    if (!notaSelecionada) return;
    setSalvando(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSave.mutate({ id: notaSelecionada.id, titulo, conteudo: editor?.getHTML() || "" });
    }, 1500);
  }, [notaSelecionada, editor]);

  const notas = notasQ.data || [];
  const pastas = pastasQ.data || [];
  const tags = tagsQ.data || [];

  const notasFixadas = notas.filter((n: any) => n.fixada);
  const notasNormais = notas.filter((n: any) => !n.fixada);

  function formatDate(d: string) {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d atrás`;
    return date.toLocaleDateString("pt-BR");
  }

  function stripHtml(html: string) {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 100);
  }

  function NoteCard({ nota }: { nota: any }) {
    const cor = CORES[nota.cor] || CORES.default;
    const isSelected = notaSelecionada?.id === nota.id;
    return (
      <div
        onClick={() => setNotaSelecionada(nota)}
        className={`group relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${cor.bg} ${cor.border} ${isSelected ? "ring-2 ring-primary" : ""}`}
      >
        {nota.fixada && <Pin className="absolute top-2 right-2 h-3 w-3 text-primary" />}
        <p className="font-medium text-sm truncate pr-4">{nota.titulo || "Sem título"}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{stripHtml(nota.conteudo)}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />{formatDate(nota.updatedAt)}
          </span>
          {nota.pasta && nota.pasta !== "Geral" && (
            <Badge variant="outline" className="text-xs py-0 px-1.5">{nota.pasta}</Badge>
          )}
        </div>
        {nota.tags && (
          <div className="flex flex-wrap gap-1 mt-1">
            {nota.tags.split(",").filter(Boolean).slice(0, 3).map((t: string) => (
              <span key={t} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">#{t.trim()}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden -m-6">

      {/* ── Sidebar esquerda: pastas e tags ── */}
      <div className="w-48 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-3 border-b">
          <Button size="sm" className="w-full" onClick={() => createNota.mutate({ titulo: "Nova nota", conteudo: "", pasta: pastaSelecionada === "todas" ? "Geral" : pastaSelecionada })}>
            <Plus className="h-4 w-4 mr-1" />Nova Nota
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground px-2 pt-2 pb-1 uppercase tracking-wider">Pastas</p>

          {[{ id: "todas", label: "Todas as notas", icon: <BookOpen className="h-3.5 w-3.5" /> },
            { id: "fixadas", label: "Fixadas", icon: <Pin className="h-3.5 w-3.5" /> }].map((item) => (
            <button
              key={item.id}
              onClick={() => { setPastaSelecionada(item.id); setTagSelecionada(""); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${pastaSelecionada === item.id && !tagSelecionada ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}

          {pastas.map((p: any) => (
            <button
              key={p.pasta}
              onClick={() => { setPastaSelecionada(p.pasta); setTagSelecionada(""); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${pastaSelecionada === p.pasta && !tagSelecionada ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span className="truncate flex-1 text-left">{p.pasta}</span>
              <span className="text-xs opacity-60">{p.total}</span>
            </button>
          ))}

          <button
            onClick={() => setShowNovaPasta(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />Nova pasta
          </button>

          {tags.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground px-2 pt-3 pb-1 uppercase tracking-wider">Tags</p>
              {tags.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => { setTagSelecionada(tag); setPastaSelecionada("todas"); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${tagSelecionada === tag ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
                >
                  <Hash className="h-3.5 w-3.5" />
                  <span className="truncate">{tag}</span>
                </button>
              ))}
            </>
          )}

          <div className="pt-3 border-t mt-3">
            <button
              onClick={() => setShowArquivadas(!showArquivadas)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${showArquivadas ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
            >
              <Archive className="h-3.5 w-3.5" />Arquivadas
            </button>
          </div>
        </div>
      </div>

      {/* ── Lista de notas ── */}
      <div className="w-64 border-r flex flex-col shrink-0">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {notasQ.isLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
          )}

          {notasFixadas.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1">
                <Pin className="h-3 w-3" />FIXADAS
              </p>
              {notasFixadas.map((n: any) => <NoteCard key={n.id} nota={n} />)}
              {notasNormais.length > 0 && <div className="border-t my-2" />}
            </>
          )}

          {notasNormais.map((n: any) => <NoteCard key={n.id} nota={n} />)}

          {notas.length === 0 && !notasQ.isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma nota encontrada</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => createNota.mutate({ titulo: "Nova nota" })}>
                <Plus className="h-4 w-4 mr-1" />Criar nota
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {notaSelecionada ? (
          <>
            {/* Barra de título e ações */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
              <input
                value={tituloEditando}
                onChange={(e) => handleTituloChange(e.target.value)}
                placeholder="Título da nota..."
                className="flex-1 text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-1 shrink-0">
                {salvando && <span className="text-xs text-muted-foreground">Salvando...</span>}
                {!salvando && <span className="text-xs text-green-600">✓ Salvo</span>}
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Fixar nota" onClick={() => toggleFixada.mutate({ id: notaSelecionada.id })}>
                  <Pin className={`h-4 w-4 ${notaSelecionada.fixada ? "text-primary fill-primary" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Propriedades" onClick={() => setShowPropriedades(true)}>
                  <Tag className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => duplicateNota.mutate({ id: notaSelecionada.id })}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Arquivar" onClick={() => toggleArquivada.mutate({ id: notaSelecionada.id })}>
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir" onClick={() => { if (confirm("Excluir esta nota?")) deleteNota.mutate({ id: notaSelecionada.id }); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Toolbar do editor */}
            <EditorToolbar editor={editor} />

            {/* Área de edição */}
            <div className="flex-1 overflow-y-auto">
              <EditorContent
                editor={editor}
                className="min-h-full p-6 prose prose-sm dark:prose-invert max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_code]:text-sm [&_.task-list]:list-none [&_.task-list]:pl-0"
              />
            </div>

            {/* Rodapé com metadados */}
            <div className="border-t px-4 py-1.5 bg-muted/20 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Folder className="h-3 w-3" />{notaSelecionada.pasta || "Geral"}</span>
              {notaSelecionada.tags && <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{notaSelecionada.tags}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Editado {formatDate(notaSelecionada.updatedAt)}</span>
              <span className="ml-auto">{editor?.storage.characterCount?.characters?.() || 0} caracteres</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <StickyNote className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Selecione uma nota</p>
            <p className="text-sm mt-1">ou crie uma nova para começar</p>
            <Button className="mt-4" onClick={() => createNota.mutate({ titulo: "Nova nota" })}>
              <Plus className="h-4 w-4 mr-2" />Nova Nota
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialog: Propriedades da nota ── */}
      <Dialog open={showPropriedades} onOpenChange={setShowPropriedades}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Propriedades da Nota</DialogTitle></DialogHeader>
          {notaSelecionada && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Pasta</label>
                <Input
                  defaultValue={notaSelecionada.pasta || "Geral"}
                  placeholder="Nome da pasta"
                  onBlur={(e) => updateNota.mutate({ id: notaSelecionada.id, pasta: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(separadas por vírgula)</span></label>
                <Input
                  defaultValue={notaSelecionada.tags || ""}
                  placeholder="sql, importante, projeto"
                  onBlur={(e) => updateNota.mutate({ id: notaSelecionada.id, tags: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cor</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {Object.entries(CORES).map(([key, val]) => (
                    <button
                      key={key}
                      title={val.label}
                      onClick={() => { updateNota.mutate({ id: notaSelecionada.id, cor: key }); setNotaSelecionada({ ...notaSelecionada, cor: key }); }}
                      className={`w-7 h-7 rounded-full border-2 ${val.bg} ${notaSelecionada.cor === key ? "border-primary scale-110" : "border-transparent"} transition-all`}
                    />
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={() => setShowPropriedades(false)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nova pasta ── */}
      <Dialog open={showNovaPasta} onOpenChange={setShowNovaPasta}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              value={novaPastaNome}
              onChange={(e) => setNovaPastaNome(e.target.value)}
              placeholder="Nome da pasta"
              onKeyDown={(e) => {
                if (e.key === "Enter" && novaPastaNome.trim()) {
                  createNota.mutate({ titulo: "Nova nota", pasta: novaPastaNome.trim() });
                  setShowNovaPasta(false);
                  setNovaPastaNome("");
                  setPastaSelecionada(novaPastaNome.trim());
                }
              }}
            />
            <Button className="w-full" onClick={() => {
              if (!novaPastaNome.trim()) return;
              createNota.mutate({ titulo: "Nova nota", pasta: novaPastaNome.trim() });
              setShowNovaPasta(false);
              setNovaPastaNome("");
              setPastaSelecionada(novaPastaNome.trim());
            }}>
              Criar pasta e primeira nota
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
