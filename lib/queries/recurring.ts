import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecurringRule,
  deleteRecurringRule,
  listRecurringRules,
  updateRecurringRule,
  type RecurringRuleInput,
} from "@/lib/recurring";
import { handleError } from "@/lib/utils/errorHandler";

export const recurringKeys = {
  all: (userId: string) => ["recurring", userId] as const,
};

export function useRecurringQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? recurringKeys.all(userId) : ["recurring", "anonymous"],
    queryFn: () => listRecurringRules(userId!),
    enabled: Boolean(userId),
  });
}

function useInvalidate(userId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: ["recurring", userId] });
    qc.invalidateQueries({ queryKey: ["expenses", userId] });
  };
}

export function useCreateRecurringMutation(userId: string | undefined) {
  const invalidate = useInvalidate(userId);
  return useMutation({
    mutationFn: ({
      rule,
      firstAlreadySaved,
    }: {
      rule: RecurringRuleInput;
      firstAlreadySaved?: boolean;
    }) => createRecurringRule(userId!, rule, firstAlreadySaved),
    onSuccess: invalidate,
    onError: (err) => handleError(err, "createRecurring"),
  });
}

export function useUpdateRecurringMutation(userId: string | undefined) {
  const invalidate = useInvalidate(userId);
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<RecurringRuleInput> }) =>
      updateRecurringRule(userId!, id, patch),
    onSuccess: invalidate,
    onError: (err) => handleError(err, "updateRecurring"),
  });
}

export function useDeleteRecurringMutation(userId: string | undefined) {
  const invalidate = useInvalidate(userId);
  return useMutation({
    mutationFn: (id: string) => deleteRecurringRule(userId!, id),
    onSuccess: invalidate,
    onError: (err) => handleError(err, "deleteRecurring"),
  });
}
