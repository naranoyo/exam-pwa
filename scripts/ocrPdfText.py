# scripts/ocrPdfText.py
"""
PDF -> (1) 埋め込みテキスト抽出（あれば最優先） -> (2) OCR（縦/横/表最適化 + 再試行）
出力: data/questions/kokugo/2025/raw_pages_q_ocr.json

狙い：
- 28p以降の「資料・図表」が OCR で崩れる問題を軽減（psm/前処理を切替 & 再試行）
- そもそも PDF に文字が埋め込まれているページは get_text() で“完全”に取る
"""

import json
import re
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import pytesseract

# 必要ならパス固定（PATHが通ってるなら消してOK）
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

ROOT = Path(__file__).resolve().parents[1]

PDF_PATH = ROOT / "public" / "past" / "kyotsu-kokugo-2025-q.pdf"
OUT_PATH = ROOT / "data" / "questions" / "kokugo" / "2025" / "raw_pages_q_ocr.json"

# --- OCR languages ---
LANG_VERT = "jpn_vert+jpn"
LANG_HORI = "jpn"

# --- OCR configs ---
# 本文（縦）
CONFIG_VERT_TEXT = r"--oem 1 --psm 5 -c preserve_interword_spaces=1"
# 横書き一般
CONFIG_HORI_TEXT = r"--oem 1 --psm 6 -c preserve_interword_spaces=1"
# 表/図表（スパース/段組など）
CONFIG_TABLE_11 = r"--oem 1 --psm 11 -c preserve_interword_spaces=1"
CONFIG_TABLE_4 = r"--oem 1 --psm 4 -c preserve_interword_spaces=1"
CONFIG_TABLE_6 = r"--oem 1 --psm 6 -c preserve_interword_spaces=1"

# cover は文字量が少ないので psm 6/11 も効くことがある
CONFIG_COVER_6 = r"--oem 1 --psm 6 -c preserve_interword_spaces=1"
CONFIG_COVER_11 = r"--oem 1 --psm 11 -c preserve_interword_spaces=1"


# ----------------------------
# Utilities
# ----------------------------
def render_page_to_image(page: fitz.Page, zoom: float) -> Image.Image:
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def normalize_text(t: str) -> str:
    return (t or "").replace("\u00a0", " ").strip()


def jp_ratio(t: str) -> float:
    """ざっくり日本語比率（ひらがな/カタカナ/漢字）"""
    if not t:
        return 0.0
    jp = re.findall(r"[ぁ-んァ-ヶ一-龥]", t)
    return len(jp) / max(1, len(t))


def is_garbage(t: str) -> bool:
    """
    OCRの崩れを雑に判定
    - 極端に短い
    - 日本語比率が低すぎる
    - 同一文字が連続しすぎ（ががが… / HHHH…）
    """
    t = normalize_text(t)
    if len(t) < 40:
        return True
    if jp_ratio(t) < 0.12:
        return True
    if re.search(r"(.)\1\1\1", t):  # 同じ文字4連
        return True
    return False


def score_text(t: str) -> float:
    """
    “どっちがマシか”のスコア
    - 長いほど良い（ただし上限）
    - 日本語比率が高いほど良い
    - ゴミ判定なら大幅減点
    """
    t = normalize_text(t)
    if not t:
        return 0.0
    length = min(len(t), 4000)  # 長すぎるのは頭打ち
    score = length * 0.6 + jp_ratio(t) * 1000
    if is_garbage(t):
        score *= 0.25
    return score


def pick_best_text(candidates: list[str]) -> str:
    best = ""
    best_s = -1.0
    for c in candidates:
        s = score_text(c)
        if s > best_s:
            best_s = s
            best = c or ""
    return normalize_text(best)


# ----------------------------
# Preprocess
# ----------------------------
def preprocess_text(img: Image.Image) -> Image.Image:
    """
    本文（縦書き・細字）向け
    - グレースケール
    - コントラスト少し上げる
    - シャープ + 軽いメディアン
    - 二値化は “L” のまま（1bitは潰れやすい）
    - NEARESTで2倍（細字を拾いやすく）
    """
    g = ImageOps.grayscale(img)
    g = ImageEnhance.Contrast(g).enhance(1.6)
    g = g.filter(ImageFilter.SHARPEN)
    g = g.filter(ImageFilter.MedianFilter(size=3))

    TH = 190  # 175〜205で調整余地
    bw = g.point(lambda x: 0 if x < TH else 255, mode="L")
    bw = bw.resize((bw.width * 2, bw.height * 2), Image.Resampling.NEAREST)
    return bw


def preprocess_cover(img: Image.Image) -> Image.Image:
    """
    表紙・注意書きなど（文字少/余白多）向け
    - 二値化しない
    - BICUBIC拡大
    """
    g = ImageOps.grayscale(img)
    g = ImageEnhance.Contrast(g).enhance(1.3)
    g = g.filter(ImageFilter.SHARPEN)
    g = g.resize((g.width * 2, g.height * 2), Image.Resampling.BICUBIC)
    return g


def preprocess_table(img: Image.Image) -> Image.Image:
    """
    図表・資料（罫線+細文字）向け
    - 二値化を避ける
    - 罫線に負けない程度にコントラスト
    - BICUBIC拡大
    """
    g = ImageOps.grayscale(img)
    g = ImageEnhance.Contrast(g).enhance(1.25)
    g = g.filter(ImageFilter.SHARPEN)
    g = g.resize((g.width * 2, g.height * 2), Image.Resampling.BICUBIC)
    return g


# ----------------------------
# Page kind heuristic
# ----------------------------
def page_kind(page_no: int) -> str:
    """
    ページ種別（初期ルール）
    - 1: cover
    - 26以降: table（資料が多い前提）
    - 他: text
    """
    if page_no == 1:
        return "cover"
    if page_no >= 26:
        return "table"
    return "text"


# ----------------------------
# PDF text extraction first
# ----------------------------
def extract_pdf_text_first(page: fitz.Page) -> str:
    """
    PDFに埋め込みテキストがあるページは、OCRよりこちらが“完全”。
    """
    try:
        t = page.get_text("text") or ""
    except Exception:
        return ""

    t = normalize_text(t)
    # ある程度の分量があり、日本語比率も極端に低くなければ採用
    if len(t) >= 80 and jp_ratio(t) >= 0.10:
        return t
    return ""


# ----------------------------
# OCR
# ----------------------------
def ocr_string(img: Image.Image, lang: str, config: str) -> str:
    return pytesseract.image_to_string(img, lang=lang, config=config)


def ocr_by_kind(img: Image.Image, kind: str) -> str:
    """
    kindごとに“候補を複数出して”ベストを選ぶ
    """
    candidates: list[str] = []

    if kind == "text":
        # 本文は縦優先 + 横も保険
        candidates.append(ocr_string(img, lang=LANG_VERT, config=CONFIG_VERT_TEXT))
        candidates.append(ocr_string(img, lang=LANG_HORI, config=CONFIG_HORI_TEXT))
        return pick_best_text(candidates)

    if kind == "cover":
        # 文字少なので複数psmを試す
        candidates.append(ocr_string(img, lang=LANG_VERT, config=CONFIG_VERT_TEXT))
        candidates.append(ocr_string(img, lang=LANG_HORI, config=CONFIG_COVER_6))
        candidates.append(ocr_string(img, lang=LANG_HORI, config=CONFIG_COVER_11))
        return pick_best_text(candidates)

    # table
    candidates.append(ocr_string(img, lang=LANG_HORI, config=CONFIG_TABLE_11))
    candidates.append(ocr_string(img, lang=LANG_HORI, config=CONFIG_TABLE_4))
    candidates.append(ocr_string(img, lang=LANG_HORI, config=CONFIG_TABLE_6))
    # 念のため縦も一回
    candidates.append(ocr_string(img, lang=LANG_VERT, config=CONFIG_VERT_TEXT))
    return pick_best_text(candidates)


def ocr_with_retry(img_raw: Image.Image, kind: str, page_no: int) -> str:
    """
    1回目の前処理+OCRが崩れたら、別前処理/別設定でもう一度拾う
    """
    # 1st: kindの通常前処理
    if kind == "text":
        img1 = preprocess_text(img_raw)
    elif kind == "cover":
        img1 = preprocess_cover(img_raw)
    else:
        img1 = preprocess_table(img_raw)

    t1 = ocr_by_kind(img1, kind)
    if not is_garbage(t1):
        return t1

    # 2nd: 別ルート（表っぽい/本文っぽいで揺れるページ対策）
    candidates = [t1]

    # coverは table 前処理でも試す
    if kind == "cover":
        img2 = preprocess_table(img_raw)
        candidates.append(ocr_by_kind(img2, "table"))

    # tableは text 前処理でも試す（縦本文が混ざってる可能性）
    if kind == "table":
        img2 = preprocess_text(img_raw)
        candidates.append(ocr_by_kind(img2, "text"))

        # さらに“二値化しない軽前処理”でもう一発
        g = ImageOps.grayscale(img_raw)
        g = ImageEnhance.Contrast(g).enhance(1.1)
        g = g.resize((g.width * 2, g.height * 2), Image.Resampling.BICUBIC)
        candidates.append(ocr_string(g, lang=LANG_HORI, config=CONFIG_TABLE_11))
        candidates.append(ocr_string(g, lang=LANG_HORI, config=CONFIG_TABLE_4))

    # textは table 前処理でも試す（図表混在の可能性）
    if kind == "text":
        img2 = preprocess_table(img_raw)
        candidates.append(ocr_by_kind(img2, "table"))

    best = pick_best_text(candidates)
    return best


# ----------------------------
# Main
# ----------------------------
def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(PDF_PATH))
    pages_out = []

    # 重要：レンダリング解像度（重いほど精度上がる）
    # まずは 6.0〜7.0 推奨（PC性能に合わせて）
    ZOOM = 7.0

    for i in range(doc.page_count):
        page_no = i + 1
        page = doc.load_page(i)

        kind = page_kind(page_no)

        # まずPDF埋め込みテキストを優先
        embedded = extract_pdf_text_first(page)
        if embedded:
            text = embedded
            used = "pdf_text"
        else:
            # OCR用にレンダリング
            img = render_page_to_image(page, zoom=ZOOM)
            try:
                text = ocr_with_retry(img, kind=kind, page_no=page_no)
                used = f"ocr:{kind}"
            except Exception as e:
                # 最終フォールバック
                try:
                    text = ocr_string(img, lang=LANG_VERT, config=CONFIG_VERT_TEXT)
                    used = "ocr:fallback_vert"
                except Exception as e2:
                    try:
                        text = ocr_string(img, lang=LANG_HORI, config=CONFIG_HORI_TEXT)
                        used = "ocr:fallback_hori"
                    except Exception as e3:
                        text = f"[OCR_ERROR] {e} / {e2} / {e3}"
                        used = "error"

        text = normalize_text(text)
        pages_out.append(
            {
                "page": page_no,
                "text": text,
                # 解析やデバッグ用（不要なら消してOK）
                "meta": {"kind": kind, "used": used},
            }
        )

        if page_no % 2 == 0:
            print(f"... {page_no}/{doc.page_count} ({kind}) [{used}]")

    OUT_PATH.write_text(
        json.dumps(pages_out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"✅ wrote: {OUT_PATH}")


if __name__ == "__main__":
    main()