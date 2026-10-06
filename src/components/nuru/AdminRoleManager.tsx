import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Building2, Search, Shield, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addAdminRole, getAdminRoleAssignments, removeAdminRole } from "@/lib/adminRoles.functions";
import { Avatar } from "@/components/nuru/AppShell";
import { MfaChallenge } from "@/components/nuru/MfaSecurity";

type ChurchOption = { id: string; name: string };
type RoleValue = "super_admin" | "moderator" | "church_admin";

export function AdminRoleManager({ churches }: { churches: ChurchOption[] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [role, setRole] = useState<RoleValue>("moderator");
  const [churchId, setChurchId] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);

  const assignments = useQuery({
    queryKey: ["admin-role-assignments"],
    queryFn: () => getAdminRoleAssignments(),
  });

  const people = useQuery({
    queryKey: ["admin-role-people", search],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url")
        .order("full_name")
        .limit(20);
      const term = search.trim().replace(/[^\p{L}\p{N}_.\s-]/gu, " ");
      if (term) query = query.or("full_name.ilike.%" + term + "%,username.ilike.%" + term + "%");
      const result = await query;
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  async function requireAal2() {
    const result = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (result.error) throw result.error;
    if (result.data.currentLevel !== "aal2") {
      setNeedsMfa(true);
      return false;
    }
    return true;
  }

  const add = useMutation({
    mutationFn: async () => {
      if (!(await requireAal2())) throw new Error("Verify your admin session first.");
      if (!selectedUser) throw new Error("Choose a Nuru member.");
      if (role === "church_admin" && !churchId) throw new Error("Choose a church.");
      return addAdminRole({
        data: {
          userId: selectedUser,
          role,
          churchId: role === "church_admin" ? churchId : undefined,
        },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-role-assignments"] });
      toast.success("Admin role assigned.");
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes("Verify your admin session")) return;
      toast.error(error instanceof Error ? error.message : "Role could not be assigned.");
    },
  });

  const remove = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!(await requireAal2())) throw new Error("Verify your admin session first.");
      return removeAdminRole({ data: { assignmentId } });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-role-assignments"] });
      toast.success("Role removed.");
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes("Verify your admin session")) return;
      toast.error(error instanceof Error ? error.message : "Role could not be removed.");
    },
  });

  const roleLabel = (value: RoleValue) =>
    value === "super_admin" ? "Super Admin" : value === "church_admin" ? "Church Admin" : "Moderator";

  return (
    <div className="space-y-5">
      {needsMfa && (
        <MfaChallenge
          title="Verify before changing admin roles"
          onSuccess={() => {
            setNeedsMfa(false);
            toast.success("Admin session verified.");
          }}
        />
      )}

      <section className="rounded-2xl border border-[#153b5c] bg-[#071727] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <UserCog className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Assign admin access</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Every role change requires a Super Admin session with MFA. Church Admin access is scoped
              to one church.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_1fr_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search member"
              className="min-h-11 w-full rounded-xl border border-[#173b59] bg-[#04111f] pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
            />
          </label>
          <select
            value={selectedUser}
            onChange={(event) => setSelectedUser(event.target.value)}
            className="min-h-11 rounded-xl border border-[#173b59] bg-[#04111f] px-3 text-sm text-white"
          >
            <option value="">Choose member</option>
            {(people.data ?? []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name || person.username || "Nuru member"}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as RoleValue)}
              className="min-h-11 rounded-xl border border-[#173b59] bg-[#04111f] px-3 text-sm text-white"
            >
              <option value="moderator">Moderator</option>
              <option value="church_admin">Church Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            {role === "church_admin" ? (
              <select
                value={churchId}
                onChange={(event) => setChurchId(event.target.value)}
                className="min-h-11 rounded-xl border border-[#173b59] bg-[#04111f] px-3 text-sm text-white"
              >
                <option value="">Choose church</option>
                {churches.map((church) => (
                  <option key={church.id} value={church.id}>
                    {church.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>
          <button
            type="button"
            onClick={() => add.mutate()}
            disabled={add.isPending}
            className="min-h-11 rounded-xl bg-cyan-500 px-5 text-sm font-bold text-[#02101b] transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {add.isPending ? "Assigning…" : "Assign role"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#153b5c] bg-[#071727]">
        <div className="flex items-center justify-between border-b border-[#153b5c] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Current admin roles</p>
            <p className="mt-0.5 text-xs text-slate-400">Live assignments from Nuru access control.</p>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            Protected
          </span>
        </div>

        {assignments.isLoading ? (
          <p className="p-5 text-sm text-slate-400">Loading role assignments…</p>
        ) : assignments.isError ? (
          <p className="p-5 text-sm text-rose-300">Role assignments could not be loaded.</p>
        ) : (
          <div className="divide-y divide-[#12314b]">
            {(assignments.data ?? []).map((assignment) => (
              <div key={assignment.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <Avatar
                  url={assignment.person?.avatar_url ?? null}
                  name={assignment.person?.full_name ?? assignment.person?.username ?? "Admin"}
                  seed={assignment.user_id}
                  size="sm"
                  className="h-10 w-10 border-cyan-400/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {assignment.person?.full_name || assignment.person?.username || "Nuru member"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      {assignment.role === "super_admin" ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
                      ) : assignment.role === "church_admin" ? (
                        <Building2 className="h-3.5 w-3.5 text-cyan-300" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-cyan-300" />
                      )}
                      {roleLabel(assignment.role as RoleValue)}
                    </span>
                    {assignment.church_name && <span>· {assignment.church_name}</span>}
                  </div>
                </div>
                <span className="rounded-full border border-[#234b68] bg-[#0b2033] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">
                  {assignment.role.replace("_", " ")}
                </span>
                <button
                  type="button"
                  aria-label="Remove role"
                  onClick={() => remove.mutate(assignment.id)}
                  disabled={remove.isPending}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/5 text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!assignments.data?.length && (
              <div className="p-5 text-sm text-slate-400">No admin roles are assigned.</div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-[#153b5c] bg-[#061522] px-4 py-3 text-xs text-slate-400">
        <BadgeCheck className="h-4 w-4 text-emerald-300" />
        Sensitive writes remain protected by Super Admin checks and AAL2 verification.
      </div>
    </div>
  );
}
