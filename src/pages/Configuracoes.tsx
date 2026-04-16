import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor, User, Lock, Palette, Shield } from "lucide-react";
import { toast } from "sonner";

// ─── Mapa de roles legíveis ────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  master_admin: "Master ADM",
  admin: "Administrador",
  user: "Usuário",
  monitor: "Monitor",
  dispatcher: "Despachante",
  ti_master: "TI Master",
  financeiro: "Financeiro",
  comercial: "Comercial",
  motorista: "Motorista",
  operador_wms: "Operador WMS",
  rh: "RH",
};

export default function Configuracoes() {
  const { user, refresh } = useAuth({ redirectOnUnauthenticated: true });
  const { theme, setTheme } = useTheme();
  const utils = trpc.useUtils();

  // ── Estado do formulário de perfil ────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState((user as any)?.phone ?? "");
  const [bio, setBio] = useState((user as any)?.bio ?? "");

  // ── Estado do formulário de senha ─────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.auth.me.invalidate();
      refresh();
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao atualizar perfil");
    },
  });

  const changePassword = trpc.users.changeOwnPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao alterar senha");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveProfile = () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("O nome deve ter ao menos 2 caracteres");
      return;
    }
    updateProfile.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      bio: bio.trim() || null,
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error("Informe a senha atual");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter ao menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  // ── Iniciais para avatar ───────────────────────────────────────────────────
  const initials = (user?.name ?? "U")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = ROLE_LABELS[user?.role ?? "user"] ?? user?.role ?? "Usuário";

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie suas informações pessoais, segurança e preferências.
        </p>
      </div>

      {/* ── Perfil ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Perfil</CardTitle>
              <CardDescription>Suas informações pessoais visíveis no sistema.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar + info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={(user as any)?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-lg bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{user?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
              <Badge variant="secondary" className="mt-1 text-xs">{roleLabel}</Badge>
            </div>
          </div>

          <Separator />

          {/* Campos editáveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Uma breve descrição sobre você..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              size="sm"
            >
              {updateProfile.isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Segurança ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Segurança</CardTitle>
              <CardDescription>Altere sua senha de acesso.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">As senhas não coincidem.</p>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={changePassword.isPending}
              variant="outline"
              size="sm"
            >
              {changePassword.isPending ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Aparência ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Aparência</CardTitle>
              <CardDescription>Escolha o tema visual do sistema.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { key: "light" as const, icon: Sun, label: "Claro", desc: "Fundo branco" },
              { key: "gray" as const, icon: Monitor, label: "Cinza", desc: "Fundo neutro" },
              { key: "dark" as const, icon: Moon, label: "Escuro", desc: "Fundo escuro" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTheme(item.key)}
                className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  theme === item.key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <item.icon className={`h-5 w-5 ${theme === item.key ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-center">
                  <p className={`text-sm font-medium ${theme === item.key ? "text-primary" : "text-foreground"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Informações da conta ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Informações da conta</CardTitle>
              <CardDescription>Dados de registro e acesso.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="font-medium text-foreground mt-0.5">{user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Perfil de acesso</dt>
              <dd className="font-medium text-foreground mt-0.5">{roleLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-0.5">
                <Badge
                  variant={user?.status === "approved" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {user?.status === "approved" ? "Ativo" : user?.status ?? "—"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Membro desde</dt>
              <dd className="font-medium text-foreground mt-0.5">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
