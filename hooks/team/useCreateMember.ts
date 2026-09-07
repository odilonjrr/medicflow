"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import type { CreateMemberInput } from "@/lib/schemas/team";

interface CreateMemberResult {
  data: {
    user_id: string;
    email: string;
    name: string;
    role: string;
    membership_id: string;
    temp_password: string | null;
  };
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMemberInput) =>
      apiClient.post<CreateMemberResult>("/api/v1/team/create-member", input),
    onError: showApiError,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
