import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Bot, Building2, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Search, UserPlus, Users } from "lucide-react";
import { getAdminOverview } from "@/lib/adminOperations.functions";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { MfaChallenge } from "./MfaSecurity";

type Church = Database["public"]["Tables"]["churches"]["Row"];
type Tab = "People" | "Churches" | "Mentors" | "AI topics";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold transition hover:border-border-strong hover:bg-surface-2 disabled:opacity-50";
const clean = (value: string) =>
  value
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim();

export function AdminOperations({ churches }: { churches: Church[] }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("People");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [memberChurch, setMemberChurch] = useState<Church | null>(null);
  const [churchEditor, setChurchEditor] = useState<Church | "new" | null>(null);
  const [mentorEditor, setMentorEditor] = useState(false);
  const [mentorChurchSearch, setMentorChurchSearch] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [busy, setBusy] = useState(false);
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    staleTime: 30_000,
  });
  const people = useQuery({
    queryKey: ["admin-people", search, page, memberChurch?.id],
    enabled: tab === "People" || mentorEditor,
    queryFn: async () => {
      let ids: string[] | null = null;
      let membershipTotal = 0;
      if (memberChurch) {
        const members = await supabase
          .from("church_members")
          .select("user_id", { count: "exact" })
          .eq("church_id", memberChurch.id)
          .order("id")
          .range(page * 24, page * 24 + 23);
        if (members.error) throw members.error;
        ids = (members.data ?? []).map((member) => member.user_id);
        membershipTotal = members.count ?? 0;
        if (!ids.length) return { rows: [], total: membershipTotal };
      }
      let query = supabase
        .from("profiles")
        .select("id,full_name,username,church_id,created_at", { count: "exact" })
        .order("full_name")
        .order("id");
      if (ids) query = query.in("id", ids);
      else {
        if (clean(search))
          query = query.or(`full_name.ilike.%${clean(search)}%,username.ilike.%${clean(search)}%`);
        query = query.range(page * 24, page * 24 + 23);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: ids ? membershipTotal : (count ?? 0) };
    },
  });
  const mentors = useQuery({
    queryKey: ["admin-mentors", search, page],
    enabled: tab === "Mentors",
    queryFn: async () => {
      let query = supabase
        .from("mentors")
        .select("id,display_name,role_title,church_name,verified,user_id", { count: "exact" })
        .order("display_name")
        .order("id")
        .range(page * 24, page * 24 + 23);
      if (clean(search)) query = query.ilike("display_name", `%${clean(search)}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
  const matchingChurches = churches.filter(
    (church) =>
      !search.trim() ||
      `${church.name} ${church.city ?? ""} ${church.region ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const memberCounts = new Map(
    overview.data?.church_members.map((row) => [row.church_id, row.members]),
  );
  const total =
    tab === "People"
      ? (people.data?.total ?? 0)
      : tab === "Mentors"
        ? (mentors.data?.total ?? 0)
        : matchingChurches.length;
  async function authorizedWrite() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    if (data.currentLevel !== "aal2") {
      setNeedsMfa(true);
      return false;
    }
    return true;
  }
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["churches"] }),
      qc.invalidateQueries({ queryKey: ["mentors"] }),
      qc.invalidateQueries({ queryKey: ["admin-overview"] }),
      qc.invalidateQueries({ queryKey: ["admin-mentors"] }),
    ]);
  }
  async function saveChurch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      if (!(await authorizedWrite())) return;
      const name = String(form.get("name") ?? "").trim();
      const fields = {
        name,
        city: String(form.get("city") ?? "").trim() || null,
        region: String(form.get("region") ?? "").trim() || null,
        denomination: String(form.get("denomination") ?? "").trim() || null,
        description: String(form.get("description") ?? "").trim() || null,
      };
      if (name.length < 3) throw new Error("Enter the church’s full name.");
      const result =
        churchEditor && churchEditor !== "new"
          ? await supabase
              .from("churches")
              .update(fields)
              .eq("id", churchEditor.id)
              .select("id")
              .single()
          : await supabase
              .from("churches")
              .insert({
                ...fields,
                slug: `${name
                  .toLowerCase()
                  .replace(/[^a-z\d]+/g, "-")
                  .replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 8)}`,
                country: "Kenya",
                verified: false,
              })
              .select("id")
              .single();
      if (result.error) throw result.error;
      await refresh();
      setChurchEditor(null);
      toast.success("Church saved.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Church could not be saved. Check your permissions and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveMentor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      if (!(await authorizedWrite())) return;
      const userId = String(form.get("user") ?? "");
      const profile = people.data?.rows.find((row) => row.id === userId);
      if (!profile) throw new Error("Select the mentor’s registered account.");
      const existing = await supabase.from("mentors").select("id").eq("user_id", userId).limit(1);
      if (existing.error) throw existing.error;
      if (existing.data?.length) throw new Error("This account already has a mentor profile.");
      const churchId = String(form.get("church") ?? "");
      const church = churches.find((row) => row.id === churchId);
      const result = await supabase.from("mentors").insert({
        user_id: userId,
        display_name: profile.full_name || profile.username || "Mentor",
        role_title: String(form.get("role") ?? "").trim(),
        bio: String(form.get("bio") ?? "").trim(),
        specialties: String(form.get("specialties") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 10),
        church_id: church?.id ?? null,
        church_name: church?.name ?? null,
        verified: false,
      });
      if (result.error) throw result.error;
      await refresh();
      setMentorEditor(false);
      toast.success("Mentor added for verification.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Mentor could not be added. Check your permissions and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verifyMentor(id: string, verified: boolean) {
    setBusy(true);
    try {
      if (!(await authorizedWrite())) return;
      const result = await supabase
        .from("mentors")
        .update({ verified })
        .eq("id", id)
        .select("id")
        .single();
      if (result.error) throw result.error;
      await refresh();
      toast.success(verified ? "Mentor verified." : "Mentor verification removed.");
    } catch {
      toast.error("Mentor could not be updated.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Super-admin operations" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">
            Platform operations
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">People & community controls</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Search live records, review church membership, manage mentors and see privacy-safe AI
            topic trends from one workspace.
          </p>
        </div>
        <button className={button} onClick={() => void overview.refetch()}>
          <RefreshCw className="h-4 w-4" />
          Refresh totals
        </button>
      </div>
      {overview.isPending ? (
        <p role="status">Loading live totals…</p>
      ) : overview.isError ? (
        <p role="alert">The report could not load. Use Refresh totals to retry.</p>
      ) : (
        overview.data && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Registered people", overview.data.people],
              ["Church directory", overview.data.churches],
              ["Churches with members", overview.data.churches_with_members],
              ["Church memberships", overview.data.memberships],
              ["Mentors", overview.data.mentors],
              ["Verified mentors", overview.data.verified_mentors],
              ["AI questions · 30 days", overview.data.ai_questions_30d],
            ].map(([label, value]) => {
              const Icon =
                String(label).includes("people") || String(label).includes("memberships")
                  ? Users
                  : String(label).includes("Church")
                    ? Building2
                    : String(label).includes("Mentor")
                      ? BadgeCheck
                      : Bot;
              return (
                <div
                  className="rounded-2xl border border-border bg-background/35 p-4 transition hover:border-border-strong"
                  key={label}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-leaf/20 bg-leaf/10 text-leaf">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 font-display text-2xl font-semibold">
                    {Number(value).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                </div>
              );
            })}
          </div>
        )
      )}
      <div
        className="flex flex-wrap gap-2 rounded-2xl border border-border bg-background/30 p-2"
        aria-label="Operations sections"
      >
        {(["People", "Churches", "Mentors", "AI topics"] as Tab[]).map((name) => (
          <button
            type="button"
            className={[
              "min-h-10 rounded-xl px-4 text-sm font-semibold transition",
              tab === name
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface hover:text-foreground",
            ].join(" ")}
            aria-pressed={tab === name}
            key={name}
            onClick={() => {
              setTab(name);
              setSearch("");
              setPage(0);
              setMemberChurch(null);
              setChurchEditor(null);
              setMentorEditor(false);
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {needsMfa && (
        <MfaChallenge
          title="Verify to manage church and mentor records"
          onSuccess={() => {
            setNeedsMfa(false);
            toast.success("Verified. You can now save your changes.");
          }}
        />
      )}
      {tab !== "AI topics" && (
        <div className="rounded-2xl border border-border bg-background/30 p-3">
          <div className="flex flex-wrap gap-3">
            <label className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="input-nuru w-full pl-10"
                aria-label={`Search ${tab.toLowerCase()}`}
                placeholder={
                  memberChurch ? `Members of ${memberChurch.name}` : `Search ${tab.toLowerCase()}`
                }
                disabled={!!memberChurch}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          {tab === "Churches" && (
            <button className={button} onClick={() => setChurchEditor("new")}>
              <Plus className="h-4 w-4" />
              Add church
            </button>
          )}
          {tab === "Mentors" && (
            <button
              className={button}
              onClick={() => {
                setMentorEditor(true);
                setSearch("");
                setPage(0);
                setMemberChurch(null);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Add mentor
            </button>
          )}
          {memberChurch && (
            <button
              className={button}
              onClick={() => {
                setMemberChurch(null);
                setPage(0);
              }}
            >
              All people
            </button>
          )}
          </div>
        </div>
      )}
      {churchEditor && (
        <form
          key={churchEditor === "new" ? "new" : churchEditor.id}
          onSubmit={(e) => void saveChurch(e)}
          className="nuru-card space-y-3 p-5"
        >
          <h3 className="font-display text-xl">
            {churchEditor === "new" ? "Add a church" : "Edit church"}
          </h3>
          {(["name", "denomination", "city", "region"] as const).map((field) => (
            <label className="block text-sm capitalize" key={field}>
              {field}
              <input
                className="input-nuru mt-1"
                name={field}
                required={field === "name"}
                maxLength={160}
                defaultValue={churchEditor === "new" ? "" : (churchEditor[field] ?? "")}
              />
            </label>
          ))}
          <label className="block text-sm">
            Description
            <textarea
              name="description"
              className="input-nuru mt-1"
              rows={3}
              maxLength={2000}
              defaultValue={churchEditor === "new" ? "" : (churchEditor.description ?? "")}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            New churches start unverified. Adding a directory listing does not create church-admin
            access.
          </p>
          <div className="flex gap-2">
            <button className={`${button} bg-primary text-primary-foreground`} disabled={busy}>
              {busy ? "Saving…" : "Save church"}
            </button>
            <button className={button} type="button" onClick={() => setChurchEditor(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {mentorEditor && (
        <form onSubmit={(e) => void saveMentor(e)} className="nuru-card space-y-3 p-5">
          <h3 className="font-display text-xl">Add a mentor</h3>
          <label className="block text-sm">
            Find the registered account
            <input
              className="input-nuru mt-1"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search their name or username"
            />
          </label>
          <label className="block text-sm">
            Account
            <select className="input-nuru mt-1" name="user" required>
              <option value="">Choose an account</option>
              {people.data?.rows.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name || person.username || "Unnamed member"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Find church
            <input
              className="input-nuru mt-1"
              value={mentorChurchSearch}
              onChange={(e) => setMentorChurchSearch(e.target.value)}
              placeholder="Search church name or town"
            />
          </label>
          <label className="block text-sm">
            Church
            <select className="input-nuru mt-1" name="church">
              <option value="">Independent mentor</option>
              {churches
                .filter((church) =>
                  `${church.name} ${church.city ?? ""}`
                    .toLowerCase()
                    .includes(mentorChurchSearch.trim().toLowerCase()),
                )
                .slice(0, 50)
                .map((church) => (
                  <option key={church.id} value={church.id}>
                    {church.name}
                    {church.city ? ` · ${church.city}` : ""}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            Role or experience
            <input
              className="input-nuru mt-1"
              name="role"
              required
              maxLength={160}
              placeholder="Youth mentor, pastor, counsellor…"
            />
          </label>
          <label className="block text-sm">
            Biography
            <textarea className="input-nuru mt-1" name="bio" required rows={3} maxLength={2000} />
          </label>
          <label className="block text-sm">
            Specialties, separated by commas
            <input className="input-nuru mt-1" name="specialties" maxLength={500} />
          </label>
          <p className="text-xs text-muted-foreground">
            Mentors stay unverified until you complete their identity and suitability review.
            Linking their account enables in-app mentor messaging.
          </p>
          <div className="flex gap-2">
            <button
              className={`${button} bg-primary text-primary-foreground`}
              disabled={busy || !people.data?.rows.length}
            >
              {busy ? "Saving…" : "Add mentor"}
            </button>
            <button type="button" className={button} onClick={() => setMentorEditor(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {tab === "People" && (
        <div className="space-y-2">
          {memberChurch && (
            <h3 className="font-semibold">{memberChurch.name} · registered members</h3>
          )}
          {people.isPending ? (
            <p role="status">Loading people…</p>
          ) : people.isError ? (
            <p role="alert">
              People could not load.{" "}
              <button className="underline" onClick={() => void people.refetch()}>
                Retry
              </button>
            </p>
          ) : !people.data?.rows.length ? (
            <p className="text-sm text-muted-foreground">No people match this view.</p>
          ) : (
            people.data.rows.map((person) => (
              <article key={person.id} className="nuru-card p-4">
                <p className="font-semibold">{person.full_name || "Unnamed member"}</p>
                {person.username && (
                  <p className="text-sm text-muted-foreground">@{person.username}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {churches.find((church) => church.id === person.church_id)?.name ??
                    "No primary church selected"}
                </p>
              </article>
            ))
          )}
        </div>
      )}
      {tab === "Churches" && (
        <div className="grid gap-3 md:grid-cols-2">
          {matchingChurches.slice(page * 24, page * 24 + 24).map((church) => (
            <article className="nuru-card p-4" key={church.id}>
              <h3 className="font-semibold">{church.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {[church.denomination, church.city, church.region].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-2 text-sm">
                {memberCounts.get(church.id) ?? 0} registered members ·{" "}
                {church.verified ? "Verified listing" : "Unverified listing"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={button}
                  onClick={() => {
                    setMemberChurch(church);
                    setTab("People");
                    setSearch("");
                    setPage(0);
                  }}
                >
                  View members
                </button>
                <button className={button} onClick={() => setChurchEditor(church)}>
                  <Pencil className="h-4 w-4" />
                  Edit church
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === "Mentors" && (
        <div className="space-y-2">
          {mentors.isPending ? (
            <p role="status">Loading mentors…</p>
          ) : mentors.isError ? (
            <p role="alert">
              Mentors could not load.{" "}
              <button className="underline" onClick={() => void mentors.refetch()}>
                Retry
              </button>
            </p>
          ) : !mentors.data?.rows.length ? (
            <p className="text-sm text-muted-foreground">
              No mentors yet. Add a registered member’s mentor profile to get started.
            </p>
          ) : (
            mentors.data.rows.map((mentor) => (
              <article
                className="nuru-card flex flex-wrap items-center justify-between gap-3 p-4"
                key={mentor.id}
              >
                <div>
                  <h3 className="font-semibold">{mentor.display_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {mentor.role_title} · {mentor.church_name ?? "Independent"}
                  </p>
                  <p className="mt-1 text-xs">
                    {mentor.verified ? "Verified mentor" : "Pending verification"}
                    {mentor.user_id ? " · Account linked" : " · Account not linked"}
                  </p>
                </div>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void verifyMentor(mentor.id, !mentor.verified)}
                >
                  {mentor.verified ? "Remove verification" : "Mark verified"}
                </button>
              </article>
            ))
          )}
        </div>
      )}
      {tab === "AI topics" && (
        <div className="rounded-3xl border border-border bg-background/30 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-leaf/20 bg-leaf/10 text-leaf">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-xl font-semibold">What the community is asking about</h3>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-leaf">
                Privacy-safe trends
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Broad topic trends from the past 30 days. A topic appears only after at least five
            different people contribute. These are question themes, not diagnoses. Private prompts,
            answers and identities are not shown.
          </p>
          {overview.data?.ai_topics.length ? (
            overview.data.ai_topics.map((topic) => (
              <div
className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3"
                key={topic.topic}
              >
                <span className="text-sm">{topic.topic}</span>
                <span className="text-sm font-semibold">{topic.questions} questions</span>
              </div>
            ))
          ) : (
            <p className="text-sm">
              There is not enough activity yet to display privacy-safe topic trends.
            </p>
          )}
        </div>
      )}
      {tab !== "AI topics" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground" role="status">
            {total
              ? `${page * 24 + 1}–${Math.min((page + 1) * 24, total)} of ${total.toLocaleString()}`
              : "0 records"}
          </p>
          <div className="flex gap-2">
            <button
              className={button}
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              className={button}
              disabled={(page + 1) * 24 >= total}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
