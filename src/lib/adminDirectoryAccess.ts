export function assertSuperAdmin(roles: { role: string }[] | null, failed = false): void {
  if (failed || !roles?.some((row) => row.role === "super_admin")) {
    throw new Error("Super Admin access required");
  }
}
export function assertAdminWriteAssurance(aal: unknown): void {
  if (aal !== "aal2")
    throw new Error(
      "Verify your authenticator in account security before adding churches or mentors.",
    );
}
