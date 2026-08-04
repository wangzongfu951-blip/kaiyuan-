export function normalizeRow(row) {
  if (!row) return null;

  const idiom = (row.word || '').trim();
  if (!idiom) return null;

  const pinyin = (row.pinyin || '').trim();

  const sourceRaw = (row.derivation || '').trim();
  let sourceBook = '';
  let sourceChapter = '';

  const m = sourceRaw.match(/^(.*?[》\u3011\uFF09\)】])(.*)$/s);
  if (m) {
    sourceBook = m[1].trim();
    sourceChapter = m[2].replace(/^[\s,，\-—:：、]+|[\s,，\-—:：、]+$/g, '').trim();
  } else {
    sourceBook = sourceRaw;
  }

  const explanation = (row.explanation || '').trim();
  const context = (row.example || '').trim();

  const base = {
    idiom,
    pinyin,
    explanation,
    source_book: sourceBook,
    source_chapter: sourceChapter,
    source_text: sourceRaw,
    context,
    abbreviation: (row.abbreviation || '').trim(),
    raw_json: JSON.stringify(row),
  };

  return base;
}
