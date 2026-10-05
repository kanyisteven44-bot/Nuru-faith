import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
    <section className="space-y-5" aria-label="Super Admin directory">
      <h2 className="font-display text-xl">Members, churches and mentors</h2>
      {directory.isPending && <p role="status">Loading directory…</p>}
      {directory.isError && (
        <p role="alert">
          Directory could not load.{" "}
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
            }).map(([label, value]) => (
              <div key={label} className="nuru-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value ?? "Unavailable"}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            AI conversation totals measure usage. Private questions and messages are not displayed
            here.
          </p>
        </>
      )}
      <label className="block text-sm">
        View members by church
        <select
          className="input-nuru mt-2"
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
      {directory.data && (
        <>
          <p className="text-sm text-muted-foreground">
            {directory.data.total} members in this view
          </p>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {directory.data.people.map((p) => (
              <li className="p-3" key={p.id}>
                <span className="block font-semibold">
                  {p.full_name || p.username || "Nuru member"}
                </span>
                <span className="text-xs text-muted-foreground">Member ID: {p.id}</span>
              </li>
            ))}
          </ul>
          {!directory.data.people.length && <p>No members in this view.</p>}
          <div className="flex items-center justify-between">
            <button
              className="nuru-card min-h-11 px-4 disabled:opacity-40"
              disabled={!page || directory.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className="nuru-card min-h-11 px-4 disabled:opacity-40"
              disabled={(page + 1) * 25 >= directory.data.total || directory.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      <form
        className="nuru-card space-y-4 p-5"
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
        <h3 className="font-display text-lg">Add to the community</h3>
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
          className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-40"
          disabled={create.isPending}
        >
          {create.isPending ? "Saving…" : `Add ${kind}`}
        </button>
        <Link to="/settings" className="ml-4 text-sm text-primary">
          Account security
        </Link>
        {create.isError && (
          <p role="alert" className="text-sm">
            {create.error.message}
          </p>
        )}
      </form>
    </section>
  );
}
