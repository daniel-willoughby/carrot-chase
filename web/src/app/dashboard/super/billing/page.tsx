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
        <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">
          Billing
        </h1>
        <p
          className="mt-0.5 text-xs lg:text-sm"
          style={{ color: "var(--muted)" }}
        >
          Licences and invoices — MVP: manual invoicing
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:mb-7 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Invoiced"
          value={formatPounds(totalInvoiced)}
          sub="All time"
          tone="success"
          accented
          icon={<NavIcon name="pound" size={16} />}
        />
        <StatCard
          label="Paid"
          value={formatPounds(totalPaid)}
          sub="Received"
          tone="blue"
          accented
          icon={<NavIcon name="check-circle" size={16} />}
        />
        <StatCard
          label="Outstanding"
          value={formatPounds(outstanding)}
          sub="Awaiting payment"
          tone={outstanding > 0 ? "warning" : "neutral"}
          accented={outstanding > 0}
          icon={<NavIcon name="clock" size={16} />}
        />
        <StatCard
          label="Licences"
          value={activeCount}
          sub={`${trialCount} on trial`}
          tone="orange"
          accented
          icon={<NavIcon name="check-circle" size={16} />}
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
          <div className="overflow-x-auto">
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
                          color: owe > 0 ? "var(--warning)" : "var(--muted)",
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
        )}
      </Card>
    </div>
  );
}
