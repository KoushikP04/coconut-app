import { useState, useEffect, useCallback } from "react";
import { useApiFetch } from "../lib/api";

export interface Account {
  id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balance_current: number;
  balance_available: number;
  iso_currency_code: string;
  institution_name: string;
  plaid_item_id: string;
}

export function useAccounts() {
  const apiFetch = useApiFetch();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/plaid/accounts");
      if (!res.ok) {
        setAccounts([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data?.accounts) ? data.accounts : [];
      // Normalize each account to match the Account interface
      const normalized: Account[] = list.map((a: Record<string, unknown>) => ({
        id: (a.account_id as string) ?? (a.id as string) ?? "",
        name: (a.name as string) ?? "",
        type: (a.type as string) ?? "",
        subtype: (a.subtype as string) ?? "",
        mask: (a.mask as string) ?? "",
        balance_current: (a.balance_current as number) ?? (a.balances as Record<string, unknown>)?.current ?? 0,
        balance_available: (a.balance_available as number) ?? (a.balances as Record<string, unknown>)?.available ?? 0,
        iso_currency_code: (a.iso_currency_code as string) ?? (a.balances as Record<string, unknown>)?.iso_currency_code ?? "USD",
        institution_name: (a.institution_name as string) ?? "",
        plaid_item_id: (a.plaid_item_id as string) ?? (a.item_id as string) ?? "",
      }));
      setAccounts(normalized);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const byInstitution: Record<string, Account[]> = {};
  for (const acct of accounts) {
    const key = acct.institution_name || "Unknown";
    if (!byInstitution[key]) byInstitution[key] = [];
    byInstitution[key].push(acct);
  }

  return { accounts, byInstitution, loading, refetch: fetchAccounts };
}
