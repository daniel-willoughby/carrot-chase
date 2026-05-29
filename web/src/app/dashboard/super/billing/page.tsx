import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { NavIcon } from "@/components/ui/nav-icon";
import { EmptyState } from "@/components/ui/empty-state";

function formatPounds(pence: number) {
  return `£${(pence / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function badgeTone(status: string | null) {
  switch (status) {
    case "active":
      return "success" as const;
    case "trial":
      return "warning" as const;
    case "past_due":
      return "danger" as const;
    case "cancelled":
    case "inactive":
      return "neutral" as const;
    default:
      return "blue" as const;
  }
}

export default async function BillingPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("billing")
    .select(
      "id, amount_invoiced_pence, amount_paid_pence, subscription_status, licence_year_starts, licence_year_ends, organisations(name)",
    )
    .order("created_at", { ascending: false });

  const list = (rows ?? []).map((b) => ({
    id: b.id,
    name: b.organisations?.name ?? "—",
    status: b.subscription_status,
    invoiced: b.amount_invoiced_pence ?? 0,
    paid: b.amount_paid_pence ?? 0,
    ends: b.licence_year_ends,
  }));

  const totalInvoiced = list.reduce((s, r) => s + r.invoiced, 0);
  const totalPaid = list.reduce((s, r) => s + r.paid, 0);
  const outstanding = totalInvoiced - totalPaid;
  const activeCount = list.filter((r) => r.status === "active").length;
  const trialCount = list.filter((r) => r.status === "trial").length;

  return (
    <div className="fade-in">
      <header className="mb-6 lg:mb-7">
        <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
          Billing
        </h1>
        <p
          className="mt-1 text-[13px] sm:text-sm"
          style={{ color: "var(--muted)" }}
        >
          Manage licences and invoices
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4 lg:mb-7">
        <StatCard
          label="Monthly Revenue"
          value={formatPounds(totalPaid)}
          sub={`${activeCount} active plan${activeCount === 1 ? "" : "s"}`}
          tone="success"
          accented
          icon={<NavIcon name="pound" size={16} />}
        />
        <StatCard
          label="Active Licences"
          value={activeCount}
          sub={
            activeCount > 0
              ? `${activeCount} on plan`
              : "No active plans"
          }
          icon={<NavIcon name="check-circle" size={16} />}
        />
        <StatCard
          label="Trials"
          value={trialCount}
          sub={
            trialCount > 0
              ? `${trialCount} on trial`
              : "No trials currently"
          }
          tone="warning"
          accented
          icon={<NavIcon name="clock" size={16} />}
        />
      </div>

      <Card className="p-0">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="text-base font-bold tracking-tight">
            Licence overview
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {list.length} organisation{list.length === 1 ? "" : "s"}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="billing"
              title="No billing records yet"
              description="Add a billing record from an organisation's detail page."
            />
          </div>
        ) : (
          <>
            {/* Mobile: card rows */}
            <div className="flex flex-col gap-2.5 p-4 lg:hidden">
              {list.map((r) => {
                const owe = r.invoiced - r.paid;
                return (
                  <div
                    key={r.id}
                    className="rounded-xl border p-3.5"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--background)",
                    }}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="text-sm font-bold">{r.name}</div>
                      <Badge tone={badgeTone(r.status)}>
                        {r.status ?? "—"}
                      </Badge>
                    </div>
                    <div
                      className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]"
                      style={{ color: "var(--muted)" }}
                    >
                      <div>
                        <div>Invoiced</div>
                        <div
                          className="font-mono text-sm font-semibold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {formatPounds(r.invoiced)}
                        </div>
                      </div>
                      <div>
                        <div>Paid</div>
                        <div
                          className="font-mono text-sm font-semibold"
                          style={{ color: "var(--success)" }}
                        >
                          {formatPounds(r.paid)}
                        </div>
                      </div>
                      <div>
                        <div>Owed</div>
                        <div
                          className="font-mono text-sm font-bold"
                          style={{
                            color:
                              owe > 0 ? "var(--warning)" : "var(--muted)",
                          }}
                        >
                          {formatPounds(owe)}
                        </div>
                      </div>
                      <div className="col-span-3">
                        <span>Renews </span>
                        <span
                          className="font-semibold"
                          style={{ color: "var(--foreground)" }}
                        >
                          {r.ends
                            ? new Date(r.ends).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs uppercase tracking-[0.06em]"
                    style={{
                      background: "var(--background-subtle)",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    <th className="px-5 py-3 font-semibold">Organisation</th>
                    <th className="px-3 py-3 font-semibold">Invoiced</th>
                    <th className="px-3 py-3 font-semibold">Paid</th>
                    <th className="px-3 py-3 font-semibold">Outstanding</th>
                    <th className="px-3 py-3 font-semibold">Renewal</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const owe = r.invoiced - r.paid;
                    return (
                      <tr
                        key={r.id}
                        className="tr-hover"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td className="px-5 py-3 font-semibold">{r.name}</td>
                        <td className="px-3 py-3 font-mono">
                          {formatPounds(r.invoiced)}
                        </td>
                        <td
                          className="px-3 py-3 font-mono"
                          style={{ color: "var(--success)" }}
                        >
                          {formatPounds(r.paid)}
                        </td>
                        <td
                          className="px-3 py-3 font-mono font-bold"
                          style={{
                            color:
                              owe > 0 ? "var(--warning)" : "var(--muted)",
                          }}
                        >
                          {formatPounds(owe)}
                        </td>
                        <td
                          className="px-3 py-3 text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {r.ends
                            ? new Date(r.ends).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={badgeTone(r.status)}>
                            {r.status ?? "—"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Manual invoice — matches prototype's bottom card */}
      <Card className="mt-6">
        <div className="text-base font-bold tracking-tight">Manual Invoice</div>
        <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: "var(--muted)" }}
            >
              Organisation
            </label>
            <select
              className="w-full rounded-xl px-3.5 py-2.5 text-sm"
              style={{
                background: "var(--card)",
                border: "1.5px solid var(--border)",
                color: "var(--foreground)",
              }}
              defaultValue=""
            >
              <option value="">Select organisation…</option>
              {list.map((r) => (
                <option key={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: "var(--muted)" }}
            >
              Amount
            </label>
            <input
              type="text"
              placeholder="£49.00"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm sm:w-32"
              style={{
                background: "var(--card)",
                border: "1.5px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <button
            type="button"
            disabled
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{
              background: "var(--orange-gradient)",
              boxShadow: "0 2px 8px rgba(232,82,10,0.28)",
              opacity: 0.5,
              cursor: "not-allowed",
            }}
            title="Coming next — Phase 2 Stripe"
          >
            Send invoice
          </button>
        </div>
      </Card>
    </div>
  );
}
