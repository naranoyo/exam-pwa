// components/dashboard/StudyTabs.tsx
"use client";

import Link from "next/link";

type TabKey = "today" | "week" | "month";

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center",
        "h-9 px-3 rounded-xl border",
        "text-sm font-semibold",
        "transition active:scale-[0.98]",
        active
          ? "bg-black text-white border-black"
          : "bg-white border-black/15 hover:bg-black/5",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function StudyTabs({ active }: { active: TabKey }) {
  return (
    <div className="inline-flex items-center gap-2">
      <Tab href="/dashboard/study" label="今日" active={active === "today"} />
      <Tab
        href="/dashboard/study/week"
        label="週間"
        active={active === "week"}
      />
      <Tab
        href="/dashboard/study/month"
        label="月間"
        active={active === "month"}
      />
    </div>
  );
}
