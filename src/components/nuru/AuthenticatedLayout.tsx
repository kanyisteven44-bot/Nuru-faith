import { Outlet } from "@tanstack/react-router";
import { MessageAlerts } from "@/components/nuru/MessageAlerts";
import { CallManager } from "@/components/nuru/CallManager";

/**
 * Only authenticated routes need the incoming-call and message listeners.
 * Import this module lazily so neither subsystem competes with the public
 * opening screen, search landing pages or sign-in JavaScript.
 */
export function AuthenticatedLayout() {
  return (
    <CallManager>
      <MessageAlerts />
      <Outlet />
    </CallManager>
  );
}
