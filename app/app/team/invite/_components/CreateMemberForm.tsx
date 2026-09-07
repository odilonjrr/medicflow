"use client";
import { useState } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { useCreateMember } from "@/hooks/team/useCreateMember";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, type Role } from "@/lib/schemas/team";

interface CreatedMember {
  email: string;
  name: string;
  role: string;
  temp_password: string | null;
}

export function CreateMemberForm() {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("agent");
  const [created, setCreated] = useState<CreatedMember | null>(null);
  const create = useCreateMember();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error(t("Preencha nome e e-mail."));
      return;
    }
    try {
      const res = await create.mutateAsync({ name: name.trim(), email: email.trim(), role });
      setCreated({
        email: res.data.email,
        name: res.data.name,
        role: res.data.role,
        temp_password: res.data.temp_password,
      });
      toast.success(t("Membro criado com sucesso!"));
      setName("");
      setEmail("");
    } catch {
      /* showApiError handled */
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr,2fr]">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="member-name">{t("Nome")}</Label>
          <Input
            id="member-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. João Silva"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-email">Email</Label>
          <Input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joao@clinica.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger id="member-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? t("Criando…") : t("Criar membro")}
        </Button>
      </form>

      <div className="space-y-4">
        {created ? (
          <section className="rounded-md border p-4">
            <h2 className="text-sm font-semibold">{t("Membro criado")}</h2>
            <div className="mt-2 space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">{t("Nome")}:</span>{" "}
                <span className="font-medium">{created.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{created.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Role:</span>{" "}
                <span className="font-medium">{created.role}</span>
              </div>
              {created.temp_password ? (
                <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    {t("Senha temporária (anote agora — não será exibida novamente):")}
                  </p>
                  <code className="mt-1 block text-sm font-bold">{created.temp_password}</code>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("Usuário já existia. Peça que use 'Esqueci minha senha' para definir o acesso.")}
                </p>
              )}
            </div>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("O membro será criado com uma senha temporária que você poderá repassar.")}
          </p>
        )}
      </div>
    </div>
  );
}
