import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { ApiError } from "@/lib/api/types";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMemberSchema, validateRequest } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const { user: authUser, org: activeOrg } = authz;

  let input;
  try {
    input = await validateRequest(createMemberSchema, req);
  } catch (err) {
    if (err instanceof ApiError) {
      return fail(err.code, err.message, err.status, {
        details: err.details as Record<string, unknown> | undefined,
        requestId,
      });
    }
    throw err;
  }

  const email = input.email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: existingMembers } = await admin
    .from("user_organizations")
    .select("user_id")
    .eq("organization_id", activeOrg.orgId)
    .is("revoked_at", null);

  let userId: string;
  let tempPassword: string | null = null;

  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: input.name },
  });

  if (createErr) {
    if (createErr.message?.includes("already been registered") || createErr.status === 422) {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1 });
      const existing = listData?.users?.find(
        (u) => u.email?.trim().toLowerCase() === email,
      );
      if (!existing) {
        return fail("internal_error", "Usuário existe mas não foi encontrado.", 500, { requestId });
      }
      userId = existing.id;

      const alreadyMember = existingMembers?.some((m) => m.user_id === userId);
      if (alreadyMember) {
        return fail("conflict", "Este e-mail já é membro da organização.", 409, { requestId });
      }
    } else {
      return fail("internal_error", createErr.message, 500, { requestId });
    }
  } else {
    userId = createData.user.id;
    tempPassword = randomUUID().slice(0, 12);
    await admin.auth.admin.updateUserById(userId, { password: tempPassword });
  }

  const alreadyMember = existingMembers?.some((m) => m.user_id === userId);
  if (alreadyMember) {
    return fail("conflict", "Este e-mail já é membro da organização.", 409, { requestId });
  }

  const nowIso = new Date().toISOString();

  const { data: existing } = await admin
    .from("user_organizations")
    .select("id, revoked_at")
    .eq("user_id", userId)
    .eq("organization_id", activeOrg.orgId)
    .maybeSingle();

  let membershipId: string;

  if (existing?.id) {
    const { error: updErr } = await admin
      .from("user_organizations")
      .update({
        role: input.role,
        revoked_at: null,
        accepted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", existing.id);
    if (updErr) {
      return fail("internal_error", updErr.message, 500, { requestId });
    }
    membershipId = existing.id;
  } else {
    const { data: inserted, error: insErr } = await admin
      .from("user_organizations")
      .insert({
        user_id: userId,
        organization_id: activeOrg.orgId,
        role: input.role,
        invited_by: authUser.id,
        invited_at: nowIso,
        accepted_at: nowIso,
      })
      .select("id")
      .single();
    if (insErr) {
      return fail("internal_error", insErr.message, 500, { requestId });
    }
    membershipId = inserted.id;
  }

  await audit({
    action: "member.accepted",
    actorUserId: authUser.id,
    organizationId: activeOrg.orgId,
    resourceType: "membership",
    resourceId: membershipId,
    requestId,
    metadata: {
      email,
      name: input.name,
      role: input.role,
      method: "manual",
    },
  });

  return ok(
    {
      user_id: userId,
      email,
      name: input.name,
      role: input.role,
      membership_id: membershipId,
      temp_password: tempPassword,
    },
    { status: 201, requestId },
  );
}
