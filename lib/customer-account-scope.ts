export interface CustomerAccountCandidate {
  id: string;
  trader_id: string;
}

/**
 * Selects an account only from the server-resolved trader scope.
 * A requested ID is a selection hint, never an ownership check.
 */
export function resolveCustomerAccount(
  accounts: readonly CustomerAccountCandidate[],
  requestedAccountId?: string,
): CustomerAccountCandidate | null {
  if (requestedAccountId) {
    return accounts.find((account) => account.id === requestedAccountId) ?? null;
  }
  return accounts[0] ?? null;
}
