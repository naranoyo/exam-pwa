// components/admin/kokugo/Kokugo2025EditorClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  KokugoPassage,
  KokugoPassageBlock,
  KokugoQuestion,
} from "@/lib/kokugo";

type Props = {
  initialPassages: KokugoPassage[];
  initialQuestions: KokugoQuestion[];
};

type DaiId = 1 | 2 | 3 | 4 | 5;
const DAI_LIST: DaiId[] = [1, 2, 3, 4, 5];

type PdfRange = { start: number; end: number };
type PassagePdf = { q: PdfRange; a: PdfRange };

function downloadJson(filename: string, obj: unknown) {
  const json = JSON.stringify(obj, null, 2) + "\n";
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function blocksToText(blocks: KokugoPassageBlock[]) {
  return (blocks ?? [])
    .map((b) => {
      if (b.kind === "heading") return `# ${b.text}`;
      if (b.kind === "note") return `※ ${b.text}`;
      if (b.kind === "quote") return `> ${b.text}`;
      return b.text;
    })
    .join("\n\n");
}

function textToBlocks(text: string): KokugoPassageBlock[] {
  const t = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!t) return [{ kind: "paragraph", text: "" }];

  const parts = t
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  return parts.map((p) => {
    if (p.startsWith("# ")) return { kind: "heading", text: p.slice(2).trim() };
    if (p.startsWith("※"))
      return { kind: "note", text: p.replace(/^※\s?/, "").trim() };
    if (p.startsWith(">"))
      return { kind: "quote", text: p.replace(/^>\s?/, "").trim() };
    return { kind: "paragraph", text: p };
  });
}

/** pdf を「必ず start/end が number の完全形」に正規化 */
function normalizePdf(p: KokugoPassage): PassagePdf {
  const qStart = p.pdf?.q?.start ?? 1;
  const qEnd = p.pdf?.q?.end ?? qStart;

  const aStart = p.pdf?.a?.start ?? 1;
  const aEnd = p.pdf?.a?.end ?? aStart;

  return {
    q: { start: qStart, end: qEnd },
    a: { start: aStart, end: aEnd },
  };
}

/** passages の中の特定 dai の pdf を安全に更新（型崩れしない） */
function updatePassagePdf(
  prev: KokugoPassage[],
  activeDai: number,
  patch: { q?: Partial<PdfRange>; a?: Partial<PdfRange> }
): KokugoPassage[] {
  return prev.map((p) => {
    if (p.dai !== activeDai) return p;

    const base = normalizePdf(p);

    const nextQ: PdfRange = {
      start: patch.q?.start ?? base.q.start,
      end: patch.q?.end ?? base.q.end,
    };
    const nextA: PdfRange = {
      start: patch.a?.start ?? base.a.start,
      end: patch.a?.end ?? base.a.end,
    };

    return { ...p, pdf: { q: nextQ, a: nextA } };
  });
}

function ensurePassage(passages: KokugoPassage[], dai: number): KokugoPassage {
  const found = passages.find((p) => p.dai === dai);
  if (found) {
    // 既存でも pdf を完全形に寄せておく（表示/編集の安全性UP）
    const pdf = normalizePdf(found);
    return { ...found, pdf };
  }

  return {
    id: `d${dai}`,
    dai,
    title: `第${dai}問`,
    label: "",
    pdf: { q: { start: 1, end: 1 }, a: { start: 1, end: 1 } },
    blocks: [{ kind: "paragraph", text: "" }],
  };
}

function nextQuestionId(year: number, dai: number, no: number) {
  return `${year}_d${dai}_q${no}`;
}

export function Kokugo2025EditorClient({
  initialPassages,
  initialQuestions,
}: Props) {
  // 初期化時点で「第1〜5問の枠」を必ず作っておく
  const initialPassagesNormalized = useMemo(() => {
    const base = Array.isArray(initialPassages) ? initialPassages : [];
    const out: KokugoPassage[] = [];
    for (const d of DAI_LIST) out.push(ensurePassage(base, d));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [passages, setPassages] = useState<KokugoPassage[]>(
    initialPassagesNormalized
  );

  const [questions, setQuestions] = useState<KokugoQuestion[]>(
    Array.isArray(initialQuestions) ? initialQuestions : []
  );

  const [activeDai, setActiveDai] = useState<DaiId>(1);

  const activePassage = useMemo(
    () => ensurePassage(passages, activeDai),
    [passages, activeDai]
  );

  const daiQuestions = useMemo(() => {
    return [...questions]
      .filter((q) => q.dai === activeDai)
      .sort((a, b) => a.no - b.no);
  }, [questions, activeDai]);

  const [passageText, setPassageText] = useState<string>(() =>
    blocksToText(activePassage.blocks ?? [])
  );

  // ✅ dai切替時にtextarea反映（副作用はuseEffectで）
  useEffect(() => {
    setPassageText(blocksToText(activePassage.blocks ?? []));
  }, [activeDai, activePassage.blocks]);

  const syncPassageTextToState = () => {
    const blocks = textToBlocks(passageText);

    setPassages((prev) => {
      const base = ensurePassage(prev, activeDai);

      // base を更新（pdfは完全形のまま）
      const next = prev.map((p) =>
        p.dai === activeDai ? { ...base, blocks } : p
      );

      // 念のため第1〜5を揃える
      const ensured: KokugoPassage[] = [];
      for (const d of DAI_LIST) {
        const exist = next.find((p) => p.dai === d);
        ensured.push(exist ? ensurePassage(next, d) : ensurePassage(next, d));
      }
      ensured.sort((a, b) => a.dai - b.dai);
      return ensured;
    });
  };

  const upsertQuestion = (qid: string, patch: Partial<KokugoQuestion>) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qid);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const addQuestion = () => {
    const nextNo = (daiQuestions[daiQuestions.length - 1]?.no ?? 0) + 1;
    const id = nextQuestionId(2025, activeDai, nextNo);

    const q: KokugoQuestion = {
      id,
      dai: activeDai,
      no: nextNo,
      passageId: `d${activeDai}`,
      prompt: `問${nextNo} （ここに設問文）`,
      choices: ["①", "②", "③", "④"],
      answer: 0,
      slots: 1,
      pdfPageQ: undefined,
      pdfPageA: undefined,
      tags: [],
    };

    setQuestions((prev) => [...prev, q]);
  };

  const removeQuestion = (qid: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
  };

  const normalizeAll = () => {
    // passages: 第1〜5を必ず用意（pdf完全形保証）
    setPassages((prev) => {
      const next: KokugoPassage[] = [];
      for (const d of DAI_LIST) next.push(ensurePassage(prev, d));
      return next;
    });

    // questions: dai/no順、slots未設定は1
    setQuestions((prev) => {
      return prev
        .map((q) => ({
          ...q,
          slots: typeof q.slots === "number" && q.slots > 0 ? q.slots : 1,
          choices:
            Array.isArray(q.choices) && q.choices.length === 4
              ? q.choices
              : ["①", "②", "③", "④"],
          answer: typeof q.answer === "number" ? q.answer : 0,
        }))
        .sort((a, b) => (a.dai !== b.dai ? a.dai - b.dai : a.no - b.no));
    });

    // passageTextも反映
    syncPassageTextToState();
  };

  const validate = () => {
    const errors: string[] = [];

    for (const d of DAI_LIST) {
      const p = passages.find((x) => x.dai === d);
      if (!p) errors.push(`passages: 第${d}問が存在しません`);
      else {
        if (!p.id) errors.push(`passages: 第${d}問 id が空です`);
        if (!p.title) errors.push(`passages: 第${d}問 title が空です`);

        // pdfは必須扱い（start/end揃ってるか）
        const pdf = normalizePdf(p);
        if (!Number.isFinite(pdf.q.start) || !Number.isFinite(pdf.q.end))
          errors.push(`passages: 第${d}問 pdf.q start/end が不正です`);
        if (!Number.isFinite(pdf.a.start) || !Number.isFinite(pdf.a.end))
          errors.push(`passages: 第${d}問 pdf.a start/end が不正です`);
      }
    }

    for (const q of questions) {
      if (!q.id)
        errors.push(
          `questions: idが空の行があります（dai=${q.dai}, no=${q.no}）`
        );
      if (!q.passageId) errors.push(`questions: passageIdが空です（${q.id}）`);
      if (!Array.isArray(q.choices) || q.choices.length !== 4)
        errors.push(`questions: choicesは4択にしてください（${q.id}）`);
      if (typeof q.answer !== "number" || q.answer < 0 || q.answer > 3)
        errors.push(`questions: answerは0〜3です（${q.id}）`);
      if (typeof q.slots !== "number" || q.slots < 1)
        errors.push(`questions: slotsは1以上です（${q.id}）`);
    }

    return errors;
  };

  const exportAll = () => {
    // textarea を state に反映
    syncPassageTextToState();

    const errs = validate();
    if (errs.length) {
      alert("エラーがあります:\n\n" + errs.join("\n"));
      return;
    }

    const passagesOut = [...passages]
      .map((p) => ({ ...p, pdf: normalizePdf(p) }))
      .sort((a, b) => a.dai - b.dai);

    const questionsOut = [...questions].sort((a, b) =>
      a.dai !== b.dai ? a.dai - b.dai : a.no - b.no
    );

    downloadJson("passages.json", passagesOut);
    downloadJson("questions.json", questionsOut);
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4">
      <div className="rounded-2xl border bg-white/80 p-4">
        <div className="text-xl font-bold">
          国語 2025 データ編集（私的利用）
        </div>
        <div className="text-sm text-black/60 mt-1">
          ここで本文・設問をコピペ → JSONをダウンロード →
          data/questions/kokugo/2025/ に上書き
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {DAI_LIST.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDai(d)}
              className={[
                "px-3 py-2 rounded-xl border",
                activeDai === d ? "bg-black text-white" : "bg-white",
              ].join(" ")}
            >
              第{d}問
            </button>
          ))}

          <div className="flex-1" />

          <button
            type="button"
            className="px-3 py-2 rounded-xl border bg-white"
            onClick={normalizeAll}
            title="第1〜5問の枠を揃える / slots未設定を1にする"
          >
            整形
          </button>

          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-black text-white font-semibold"
            onClick={exportAll}
          >
            JSONを書き出す（DL）
          </button>
        </div>
      </div>

      {/* 本文 */}
      <section className="rounded-2xl border bg-white/80 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-bold">本文（第{activeDai}問）</div>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border bg-white"
            onClick={syncPassageTextToState}
          >
            本文を反映（blocks化）
          </button>
        </div>

        <div className="text-sm text-black/60">
          ルール：空行で段落分割 / 行頭「# 」は見出し / 行頭「※」は注記 /
          行頭「&gt;」は引用扱い
        </div>

        <textarea
          className="w-full min-h-80 rounded-xl border p-3 bg-white font-mono text-sm"
          value={passageText}
          onChange={(e) => setPassageText(e.target.value)}
          placeholder={`（ここに第${activeDai}問の本文を貼る）`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="w-28 text-black/60">問題PDF</span>
            <input
              className="flex-1 rounded-lg border px-2 py-1"
              value={activePassage.pdf?.q?.start ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? 1 : Number(e.target.value);
                setPassages((prev) =>
                  updatePassagePdf(prev, activeDai, { q: { start: v } })
                );
              }}
              placeholder="start"
            />
            <span className="text-black/50">〜</span>
            <input
              className="flex-1 rounded-lg border px-2 py-1"
              value={activePassage.pdf?.q?.end ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? 1 : Number(e.target.value);
                setPassages((prev) =>
                  updatePassagePdf(prev, activeDai, { q: { end: v } })
                );
              }}
              placeholder="end"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="w-28 text-black/60">解答PDF</span>
            <input
              className="flex-1 rounded-lg border px-2 py-1"
              value={activePassage.pdf?.a?.start ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? 1 : Number(e.target.value);
                setPassages((prev) =>
                  updatePassagePdf(prev, activeDai, { a: { start: v } })
                );
              }}
              placeholder="start"
            />
            <span className="text-black/50">〜</span>
            <input
              className="flex-1 rounded-lg border px-2 py-1"
              value={activePassage.pdf?.a?.end ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? 1 : Number(e.target.value);
                setPassages((prev) =>
                  updatePassagePdf(prev, activeDai, { a: { end: v } })
                );
              }}
              placeholder="end"
            />
          </label>
        </div>
      </section>

      {/* 設問 */}
      <section className="rounded-2xl border bg-white/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">設問（第{activeDai}問）</div>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border bg-white"
            onClick={addQuestion}
          >
            ＋ 設問を追加
          </button>
        </div>

        {daiQuestions.length === 0 ? (
          <div className="text-sm text-black/60">
            この大問の設問がまだありません。
          </div>
        ) : (
          <div className="space-y-3">
            {daiQuestions.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border bg-white p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold">
                    問{q.no}（id: {q.id}）
                  </div>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-lg border text-sm bg-white"
                    onClick={() => removeQuestion(q.id)}
                  >
                    削除
                  </button>
                </div>

                <textarea
                  className="w-full rounded-xl border p-2 text-sm"
                  value={q.prompt}
                  onChange={(e) =>
                    upsertQuestion(q.id, { prompt: e.target.value })
                  }
                  placeholder="設問文"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <label key={i} className="text-sm flex items-center gap-2">
                      <span className="w-8 text-black/60">
                        {["①", "②", "③", "④"][i]}
                      </span>
                      <input
                        className="flex-1 rounded-lg border px-2 py-1"
                        value={q.choices?.[i] ?? ""}
                        onChange={(e) => {
                          const next = [...(q.choices ?? ["", "", "", ""])];
                          next[i] = e.target.value;
                          upsertQuestion(q.id, { choices: next });
                        }}
                        placeholder={`選択肢${i + 1}`}
                      />
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <label className="text-sm flex items-center gap-2">
                    <span className="w-20 text-black/60">正解</span>
                    <select
                      className="flex-1 rounded-lg border px-2 py-1 bg-white"
                      value={q.answer}
                      onChange={(e) =>
                        upsertQuestion(q.id, { answer: Number(e.target.value) })
                      }
                    >
                      <option value={0}>①</option>
                      <option value={1}>②</option>
                      <option value={2}>③</option>
                      <option value={3}>④</option>
                    </select>
                  </label>

                  <label className="text-sm flex items-center gap-2">
                    <span className="w-20 text-black/60">slots</span>
                    <input
                      className="flex-1 rounded-lg border px-2 py-1"
                      type="number"
                      min={1}
                      value={q.slots ?? 1}
                      onChange={(e) =>
                        upsertQuestion(q.id, {
                          slots: Number(e.target.value || 1),
                        })
                      }
                    />
                  </label>

                  <label className="text-sm flex items-center gap-2">
                    <span className="w-20 text-black/60">問題p</span>
                    <input
                      className="flex-1 rounded-lg border px-2 py-1"
                      type="number"
                      value={q.pdfPageQ ?? ""}
                      onChange={(e) => {
                        const v =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        upsertQuestion(q.id, { pdfPageQ: v });
                      }}
                    />
                  </label>

                  <label className="text-sm flex items-center gap-2">
                    <span className="w-20 text-black/60">解答p</span>
                    <input
                      className="flex-1 rounded-lg border px-2 py-1"
                      type="number"
                      value={q.pdfPageA ?? ""}
                      onChange={(e) => {
                        const v =
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value);
                        upsertQuestion(q.id, { pdfPageA: v });
                      }}
                    />
                  </label>
                </div>

                <label className="text-sm flex items-center gap-2">
                  <span className="w-20 text-black/60">tags</span>
                  <input
                    className="flex-1 rounded-lg border px-2 py-1"
                    value={(q.tags ?? []).join(",")}
                    onChange={(e) =>
                      upsertQuestion(q.id, {
                        tags: e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="例：内容一致,理由"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 使い方 */}
      <section className="rounded-2xl border bg-white/80 p-4 text-sm text-black/70 space-y-2">
        <div className="font-bold text-black">使い方</div>
        <ol className="list-decimal pl-5 space-y-1">
          <li>上のタブで「第n問」を選ぶ</li>
          <li>本文をコピペ（空行で段落分割）→ 必要なら「本文を反映」</li>
          <li>設問を追加して、設問文/選択肢/正解/slots/pdfページを入力</li>
          <li>
            右上「JSONを書き出す（DL）」で passages.json / questions.json をDL
          </li>
          <li>
            DLした2ファイルを <code>data/questions/kokugo/2025/</code> に上書き
          </li>
        </ol>
      </section>
    </section>
  );
}
