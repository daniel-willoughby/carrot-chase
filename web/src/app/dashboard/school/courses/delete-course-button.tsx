"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { deleteCourseAction } from "./actions";

export function DeleteCourseButton({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function onClick() {
    if (!window.confirm(`Archive course "${courseName}"?`)) return;
    startTransition(async () => {
      const res = await deleteCourseAction(courseId);
      if (res.error) showToast(res.error, "error");
      else showToast("Course archived", "success");
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="text-xs font-semibold transition-colors disabled:opacity-50"
      style={{ color: "var(--danger)" }}
    >
      {isPending ? "…" : "Archive"}
    </button>
  );
}
