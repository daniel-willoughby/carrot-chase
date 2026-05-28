import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NewCourseModal } from "./new-course-modal";
import { DeleteCourseButton } from "./delete-course-button";

export default async function SchoolCoursesPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, name, distance_metres, is_platform_preset, organisation_id, created_at",
    )
    .is("deleted_at", null)
    .order("is_platform_preset", { ascending: false })
    .order("distance_metres");

  const presets = (courses ?? []).filter((c) => c.is_platform_preset);
  const custom = (courses ?? []).filter((c) => !c.is_platform_preset);

  return (
    <div className="fade-in">
      <header className="mb-6 flex items-center justify-between gap-3 lg:mb-7">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">
            Courses
          </h1>
          <p
            className="mt-0.5 text-xs lg:text-sm"
            style={{ color: "var(--muted)" }}
          >
            Routes available for your group leads to pick from
          </p>
        </div>
        <NewCourseModal />
      </header>

      <Card className="mb-4 p-0">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="text-base font-bold tracking-tight">Your courses</div>
          <Badge tone="orange">{custom.length}</Badge>
        </div>
        {custom.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="runevent"
              title="No custom courses yet"
              description="Add your school's loops, playground laps, or local routes here."
            />
          </div>
        ) : (
          <ul>
            {custom.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
                style={{
                  borderBottom:
                    i === custom.length - 1
                      ? "none"
                      : "1px solid var(--border)",
                }}
              >
                <div>
                  <div className="text-sm font-bold">{c.name}</div>
                  <div
                    className="font-mono text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    {c.distance_metres} m
                  </div>
                </div>
                <DeleteCourseButton courseId={c.id} courseName={c.name} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-0">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="text-base font-bold tracking-tight">
            Platform presets
          </div>
          <Badge tone="neutral">{presets.length}</Badge>
        </div>
        {presets.length === 0 ? (
          <div
            className="px-5 py-4 text-sm"
            style={{ color: "var(--muted)" }}
          >
            No presets configured yet.
          </div>
        ) : (
          <ul>
            {presets.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
                style={{
                  borderBottom:
                    i === presets.length - 1
                      ? "none"
                      : "1px solid var(--border)",
                }}
              >
                <div>
                  <div className="text-sm font-bold">{c.name}</div>
                  <div
                    className="font-mono text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    {c.distance_metres} m
                  </div>
                </div>
                <Badge tone="blue">Platform</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
