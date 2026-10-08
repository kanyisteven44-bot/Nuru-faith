/** Keep router/data work outside Supabase's synchronous auth notification lock. */
export function createAuthRefreshHandler(
  refresh: (accountChanged: boolean) => void,
  schedule: (work: () => void) => ReturnType<typeof setTimeout> = (work) => setTimeout(work, 0),
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout,
) {
  let account: string | null | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let changed = false;
  return {
    handle(event: string, nextAccount: string | null) {
      if (event === "INITIAL_SESSION") {
        account = nextAccount;
        return;
      }
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      // SIGNED_IN also fires on refocus: retain the current screen and cached data.
      if (event === "SIGNED_IN" && account === nextAccount) return;
      changed ||= account !== nextAccount;
      account = nextAccount;
      if (timer !== undefined) cancel(timer);
      timer = schedule(() => {
        timer = undefined;
        const accountChanged = changed;
        changed = false;
        refresh(accountChanged);
      });
    },
    dispose() {
      if (timer !== undefined) cancel(timer);
    },
  };
}
