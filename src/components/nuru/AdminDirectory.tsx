import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, ChevronLeft, ChevronRight, Plus, ShieldCheck, Sparkles, UserRoundCheck, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAdminDirectory, createAdminDirectoryEntry } from "@/lib/adminDirectory.functions";

export function AdminDirectory({
  userId,
  churches,
}: {
  userId: string;
  churches: { id: string; name: string }[];
}) {
  const [churchId, setChurchId] = useState("");
  const [page, setPage] = useState(0);
  const qc = useQueryClient();
  const directory = useQuery({
    queryKey: ["admin-directory", userId, churchId, page],
    queryFn: () => getAdminDirectory({ data: { page, churchId: churchId || undefined } }),
  });
  const create = useMutation({
    mutationFn: createAdminDirectoryEntry,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-directory"] }),
        qc.invalidateQueries({ queryKey: ["churches"] }),
        qc.invalidateQueries({ queryKey: ["mentors"] }),
      ]);
      toast.success("Added to Nuru. Verification remains pending.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });
  const [kind, setKind] = useState<"church" | "mentor">("church");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [denomination, setDenomination] = useState("");
  const [mentorUserId, setMentorUserId] = useState("");
  const [mentorChurchId, setMentorChurchId] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  return (
    <section className="space-y-6" aria-label="Super Admin directory">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Directory</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Members, churches and mentors</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Browse the people connected to Nuru, filter by church and create new community records
            without leaving the admin workspace.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-leaf/20 bg-leaf/10 px-3 py-1.5 text-[11px] font-semibold text-leaf">
          <ShieldCheck className="h-3.5 w-3.5" />
          Super-admin directory
        </div>
      </div>
      {directory.isPending && <p role="status">Loading directory…</p>}
      {directory.isError && (
        <p role="alert">
          Directory could not load: {directory.error.message}.{" "}
          <button className="underline" onClick={() => void directory.refetch()}>
            Try again
          </button>
        </p>
      )}
      {directory.data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries({
              Members: directory.data.counts.users,
              Churches: directory.data.counts.churches,
              Mentors: directory.data.counts.mentors,
              "AI conversations": directory.data.counts.aiConversations,
            }).map(([label, value]) => {
              const Icon =
                label === "Members"
                  ? Users
                  : label === "Churches"
                    ? Building2
                    : label === "Mentors"
                      ? UserRoundCheck
                      : Sparkles;
              return (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-background/35 p-4 transition hover:border-border-strong"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-leaf/20 bg-leaf/10 text-leaf">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 font-display text-2xl font-semibold">{value ?? "—"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            AI conversation totals measure usage. Private questions and messages are not displayed
            here.
          </p>
        </>
      )}
      <div className="rounded-2xl border border-border bg-background/30 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Filter directory
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm">
            <span className="sr-only">View members by church</span>
            <select
              className="input-nuru"
              value={churchId}
              onChange={(e) => {
                setChurchId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All members</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            <span className="font-semibold">{directory.data?.total ?? 0}</span>{" "}
            <span className="text-muted-foreground">members in this view</span>
          </div>
        </div>
      </div>
      {directory.data && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Member directory</p>
              <p className="text-xs text-muted-foreground">Showing up to 25 records per page.</p>
            </div>
            <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Page {page + 1}
            </span>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-border bg-background/25 divide-y divide-border">
            {directory.data.people.map((p) => (
              <li className="flex items-center gap-3 p-4 transition hover:bg-surface-2/70" key={p.id}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-leaf">
                  {(p.full_name || p.username || "N").slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {p.full_name || p.username || "Nuru member"}
                  </span>
                  {p.username && (
                    <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
                  )}
                </span>
                <span className="hidden max-w-52 truncate text-[10px] text-muted-foreground sm:block">
                  {p.id}
                </span>
              </li>
            ))}
          </ul>
          {!directory.data.people.length && <p>No members in this view.</p>}
          <div className="flex items-center justify-between gap-3">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold transition hover:border-border-strong disabled:opacity-40"
              disabled={!page || directory.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold transition hover:border-border-strong disabled:opacity-40"
              disabled={(page + 1) * 25 >= directory.data.total || directory.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
      <form
className="rounded-3xl border border-border bg-background/30 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            data:
              kind === "church"
                ? { kind, name, city, denomination }
                : {
                    kind,
                    name,
                    userId: mentorUserId,
                    churchId: mentorChurchId || undefined,
                    bio,
                    specialties: specialties
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
          });
        }}
      >
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-leaf/20 bg-leaf/10 text-leaf">
            <Plus className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-xl font-semibold">Add to the community</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Create a church directory record or connect an existing Nuru member as a mentor.
            </p>
          </div>
        </div>
        <div className="space-y-4">
        <label className="block text-sm">
          Record type
          <select
            className="input-nuru mt-1"
            value={kind}
            onChange={(e) => setKind(e.target.value as "church" | "mentor")}
          >
            <option value="church">Church</option>
            <option value="mentor">Mentor</option>
          </select>
        </label>
        <label className="block text-sm">
          Name
          <input
            className="input-nuru mt-1"
            required
            minLength={2}
            maxLength={150}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {kind === "church" ? (
          <>
            <label className="block text-sm">
              City
              <input
                className="input-nuru mt-1"
                maxLength={100}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Denomination
              <input
                className="input-nuru mt-1"
                maxLength={100}
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <label className="block text-sm">
              Existing member ID
              <input
                className="input-nuru mt-1"
                required
                value={mentorUserId}
                onChange={(e) => setMentorUserId(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Church
              <select
                className="input-nuru mt-1"
                value={mentorChurchId}
                onChange={(e) => setMentorChurchId(e.target.value)}
              >
                <option value="">No church assigned</option>
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Mentor biography
              <textarea
                className="input-nuru mt-1"
                required
                minLength={20}
                maxLength={3000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Specialties, separated by commas
              <input
                className="input-nuru mt-1"
                required
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
              />
            </label>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          New records begin unverified. Adding a mentor does not grant an administrator role.
        </p>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-40"
          disabled={create.isPending}
        >
          <Plus className="h-4 w-4" />
          {create.isPending ? "Saving…" : `Add ${kind}`}
        </button>
        <Link to="/settings" className="ml-4 text-sm text-primary">
          Account security
        </Link>
        {create.isError && (
          <p role="alert" className="text-sm text-destructive">
            {create.error.message}
          </p>
        )}
        </div>
      </form>
    </section>
  );
}
