"use client";

import type { ExamProfile } from "@/lib/state";

/**
 * 大学 → 学部 → 学科
 * ※英検などの試験カテゴリも university として扱う
 */
const SCHOOL_DATA: Record<string, Record<string, string[]>> = {
  立教大学: {
    観光学部: [],
  },
  山形大学: {
    人文社会科学部: [],
    医学部: ["医学科"],
  },
  東京大学: {
    医学部: ["医学科"],
  },
  東北大学: {
    医学部: ["医学科"],
  },
  英検2級: {
    "2025年第3回": [],
  },
};

const OPTION_PLACEHOLDER = "（選択してください）";

function getUniversities(): string[] {
  return Object.keys(SCHOOL_DATA).sort((a, b) => a.localeCompare(b, "ja"));
}

function getFaculties(university: string): string[] {
  return Object.keys(SCHOOL_DATA[university] ?? {});
}

function getDepartments(university: string, faculty: string): string[] {
  return SCHOOL_DATA[university]?.[faculty] ?? [];
}

function isExamCategory(university: string): boolean {
  return university.startsWith("英検");
}

export function SchoolCard({
  profile,
  onChange,
}: {
  profile: ExamProfile;
  onChange: (patch: Partial<ExamProfile>) => void;
}) {
  const universities = getUniversities();
  const faculties = getFaculties(profile.university);
  const departments = getDepartments(profile.university, profile.faculty);

  const isExam = isExamCategory(profile.university);

  return (
    <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
      <div className="text-sm font-semibold tracking-wide text-black/70">
        志望校・試験
      </div>

      <div className="mt-3 space-y-3">
        {/* 大学 / 試験 */}
        <div>
          <div className="text-xs text-black/60 mb-1">
            {isExam ? "試験" : "大学"}
          </div>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={profile.university || OPTION_PLACEHOLDER}
            onChange={(e) =>
              onChange({
                university: e.target.value,
                faculty: "",
                department: "",
              })
            }
          >
            <option value={OPTION_PLACEHOLDER}>{OPTION_PLACEHOLDER}</option>
            {universities.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* 学部 / 試験回 */}
        {profile.university && (
          <div>
            <div className="text-xs text-black/60 mb-1">
              {isExam ? "回次" : "学部"}
            </div>
            <select
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              value={profile.faculty || OPTION_PLACEHOLDER}
              onChange={(e) =>
                onChange({ faculty: e.target.value, department: "" })
              }
            >
              <option value={OPTION_PLACEHOLDER}>{OPTION_PLACEHOLDER}</option>
              {faculties.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 学科（英検は表示しない） */}
        {!isExam && departments.length > 0 && (
          <div>
            <div className="text-xs text-black/60 mb-1">学科</div>
            <select
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              value={profile.department || OPTION_PLACEHOLDER}
              onChange={(e) => onChange({ department: e.target.value })}
            >
              <option value={OPTION_PLACEHOLDER}>{OPTION_PLACEHOLDER}</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 現在値 */}
        <div className="text-xs text-black/55 pt-1">
          現在：
          <strong className="text-black/80 ml-1">
            {profile.university || "—"}
          </strong>
          {profile.faculty && ` / ${profile.faculty}`}
          {profile.department && ` / ${profile.department}`}
        </div>
      </div>
    </section>
  );
}
