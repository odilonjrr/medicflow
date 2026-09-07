import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { traduzir } from "@/lib/i18n/dicionario";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteForm } from "./_components/InviteForm";
import { CreateMemberForm } from "./_components/CreateMemberForm";

export const dynamic = "force-dynamic";

export default async function TeamInvitePage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg || ROLE_RANK[activeOrg.role] < ROLE_RANK.admin) {
    redirect("/403");
  }
  const idioma = user.idioma;
  const t = (texto: string) => traduzir(texto, idioma);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Adicionar membros")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Convide por e-mail ou crie membros diretamente.")}
        </p>
      </header>
      <Tabs defaultValue="create" className="flex flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="create">{t("Criar membro")}</TabsTrigger>
          <TabsTrigger value="invite">{t("Convidar por e-mail")}</TabsTrigger>
        </TabsList>
        <TabsContent value="create" className="mt-4">
          <CreateMemberForm />
        </TabsContent>
        <TabsContent value="invite" className="mt-4">
          <InviteForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
