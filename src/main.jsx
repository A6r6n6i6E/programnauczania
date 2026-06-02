import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, ChevronRight, FileText, Printer, Save, RotateCcw, CheckCircle2, ZoomIn, ZoomOut } from 'lucide-react';
import { PROGRAM_DOCUMENTS, SERIES_LABELS, LEVEL_LABELS, METHOD_LABELS, MATERIAL_LABELS } from './programData.js';
import './styles.css';

const STEPS = [
  { id: 'start', title: 'Dane programu' },
  { id: 'basis', title: 'Podstawa i poziom' },
  { id: 'series', title: 'Seria' },
  { id: 'methods', title: 'Metody' },
  { id: 'materials', title: 'Materiały' },
  { id: 'exam', title: 'Egzamin / ESOKJ' },
];

const ESOKJ_LABELS = {
  "27": ["A2", "poziom minimalny"],
  "28": ["B1", "poziom rozszerzony"],
  "29": ["B1+", "poziom wyższy"],
  "30": ["B2", "poziom zaawansowany"],
};

const DEFAULT_FORM = {
  teacherName: '',
  schoolName: '',
  city: '',
  year: new Date().getFullYear().toString(),
  stageGroup: 'I',
  foundation: '2026',
  level: '5',
  series: '7',
  methodsByDoc: {},
  materialsByDoc: {},
  examByDoc: {},
  esokjByDoc: {},
};

function docIdFromForm(form) {
  const stageSuffix = form.stageGroup === 'I' ? '1_3' : '4_8';
  return `${form.foundation}_${stageSuffix}`;
}

function documentById(id) {
  return PROGRAM_DOCUMENTS.find((doc) => doc.id === id) || PROGRAM_DOCUMENTS[0];
}

function normalizeForm(value) {
  const form = { ...DEFAULT_FORM, ...(value || {}) };
  // Backward compatibility with earlier versions that stored one document id.
  if (value?.documentId && !value?.stageGroup) {
    const legacyDoc = documentById(value.documentId);
    form.stageGroup = legacyDoc.stageGroup;
    form.foundation = legacyDoc.foundation;
  }
  if (value?.programType && !value?.stageGroup) {
    form.stageGroup = value.programType === 'I' ? 'I' : 'II';
    form.foundation = value.foundation === '3' ? '2024' : '2026';
  }
  form.methodsByDoc = form.methodsByDoc || {};
  form.materialsByDoc = form.materialsByDoc || {};
  form.examByDoc = form.examByDoc || {};
  form.esokjByDoc = form.esokjByDoc || {};
  return form;
}

function labelOptions(ids, labels) {
  return ids.map((id) => {
    const [title, subtitle] = labels[id] || [`#${id}`, ''];
    return { id, title, subtitle };
  });
}

function defaultMethods(doc) {
  if (doc.stageGroup === 'II') return ['11', '12'].filter((id) => doc.methodIds.includes(id));
  return ['9', '10'].filter((id) => doc.methodIds.includes(id));
}

function defaultMaterials(doc) {
  if (doc.stageGroup === 'II') return ['16', '18', '19', '21', '25'].filter((id) => doc.materialIds.includes(id));
  return ['14', '17', '19', '21', '23'].filter((id) => doc.materialIds.includes(id));
}

function getDocArray(form, doc, key, defaultsFactory) {
  const current = form[key]?.[doc.id];
  if (Array.isArray(current)) return current.filter((id) => (key === 'methodsByDoc' ? doc.methodIds : doc.materialIds).includes(id));
  return defaultsFactory(doc);
}

function selectedEsokjId(form, doc) {
  if (!doc.esokjIds?.length) return null;

  const current = form.esokjByDoc?.[doc.id];
  if (doc.esokjIds.includes(current)) return current;

  return doc.esokjIds[0];
}

function selectedVariants(form, doc) {
  const esokjId = selectedEsokjId(form, doc);

  return {
    default: new Set(doc.defaultSelected || []),
    level: new Set(doc.levelIds?.includes(form.level) ? [form.level] : []),
    esokj: new Set(esokjId ? [esokjId] : []),
    series: new Set(doc.seriesIds.includes(form.series) ? [form.series] : []),
    methods: new Set(getDocArray(form, doc, 'methodsByDoc', defaultMethods)),
    materials: new Set(getDocArray(form, doc, 'materialsByDoc', defaultMaterials)),
    exam: new Set(doc.examId && (form.examByDoc?.[doc.id] ?? true) ? [doc.examId] : []),
  };
}

function rangeCategory(range, doc) {
  const ids = range.ids || [];
  if (ids.some((id) => doc.defaultSelected?.includes(id))) return 'default';
  if (ids.some((id) => id === doc.examId)) return 'exam';
  if (ids.some((id) => doc.levelIds?.includes(id))) return 'level';
  if (ids.some((id) => doc.esokjIds?.includes(id))) return 'esokj';
  if (ids.some((id) => doc.materialIds.includes(id))) return 'materials';

  // In the I etap files marker #9 is reused: once for the Trailblazer series and later for inquiry tasks.
  // The first part of the file contains series descriptions; later occurrences are method fragments.
  if (doc.stageGroup === 'I' && ids.includes('9')) {
    return range.start < 250 ? 'series' : 'methods';
  }

  if (ids.some((id) => doc.methodIds.includes(id))) return 'methods';
  if (ids.some((id) => doc.seriesIds.includes(id))) return 'series';
  return 'default';
}

function selectedIdsForCategory(form, doc, category) {
  return selectedVariants(form, doc)[category] || new Set();
}

function rangeHasAutoBeforeIndex(range, index, doc) {
  for (let i = range.start + 1; i < index; i += 1) {
    const text = doc.paragraphs[i]?.trim() || '';
    if (/^\[AUTO\]$/i.test(text)) return true;
  }

  return false;
}

function isForcedAutoParagraph(index, doc) {
  return doc.variantRanges.some((range) => (
    index > range.start &&
    index < range.end &&
    rangeHasAutoBeforeIndex(range, index, doc)
  ));
}

function paragraphRange(index, doc) {
  if (isForcedAutoParagraph(index, doc)) return null;
  return doc.variantRanges.find((r) => index > r.start && index < r.end) || null;
}

function paragraphVariantInfo(index, form, doc) {
  if (isForcedAutoParagraph(index, doc)) return null;

  const active = [];

  for (const range of doc.variantRanges) {
    if (index > range.start && index < range.end) {
      const category = rangeCategory(range, doc);
      const selected = selectedIdsForCategory(form, doc, category);

      for (const id of range.ids) {
        if (selected.has(id) && !active.some((item) => item.id === id && item.category === category)) {
          active.push({ id, category });
        }
      }
    }
  }

  if (!active.length) return null;

  const category = active[0].category;

  let step = category;
  if (category === 'level' || category === 'default') step = 'basis';

  return { ids: active.map((item) => item.id), step };
}

function isMarker(text) {
  return /^\s*\[.*(?:AUTO|WARIANT|wariant).*\]\s*$/.test(text) || text.includes('[wariant') || text.includes('[WARIANT');
}

function shouldShowParagraph(index, form, doc) {
  if (index < doc.contentStart) return false;
  const text = doc.paragraphs[index]?.trim() || '';
  if (!text) return false;
  if (isMarker(text)) return false;
  const range = paragraphRange(index, doc);
  if (!range) return true;
  const category = rangeCategory(range, doc);
  const selected = selectedIdsForCategory(form, doc, category);
  return range.ids.some((id) => selected.has(id));
}

function paragraphKind(text) {
  const trimmed = text.trim();
  if (text.trim() === 'Bibliografia') return 'h2';
  if (/^Rozdział\s+[IVX]+/.test(trimmed)) return 'h2';
  if (/^[IVX]+\.\s/.test(trimmed) || /^[IVX]+\.$/.test(trimmed)) return 'h2';
  if (/^[IVX]+\.\s*\d+\.\s/.test(trimmed) || /^[IVX]+\.\d+\.?\s/.test(trimmed)) return 'h3';
  if (/^[IVX]+\.\d+\.\d+\.?/.test(trimmed)) return 'h4';
  if (/^\d+\)/.test(trimmed) || trimmed.startsWith('· ') || trimmed.startsWith('• ')) return 'li';
  return 'p';
}

function renumberOptionalHeadings(items, doc) {
  if (doc.stageGroup !== 'II') return items;

  let methodCounter = 4;
  let materialCounter = 2;

  return items.map((item) => {
    let text = item.text;

    if (/^VI\.1\.[4-8]\.\s+/.test(text)) {
      text = text.replace(/^VI\.1\.[4-8]\.\s+/, `VI.1.${methodCounter}. `);
      methodCounter += 1;
    }

    if (/^VI\.3\.(?:[2-9]|10|11)\.\s+/.test(text)) {
      text = text.replace(/^VI\.3\.(?:[2-9]|10|11)\.\s+/, `VI.3.${materialCounter}. `);
      materialCounter += 1;
    }

    return { ...item, text };
  });
}

function renumberAfterHiddenExam(text, form, doc) {
  const examSelected = selectedIdsForCategory(form, doc, 'exam').has(doc.examId);

  if (
    doc.id === '2024_4_8' &&
    !examSelected &&
    text.startsWith('VI.7.')
  ) {
    return text.replace(/^VI\.7\./, 'VI.6.');
  }

  return text;
}



function plainTextForListItem(text) {
  return text.trim().replace(/^\d+\)\s*/, '').replace(/^[·•]\s*/, '');
}

function headingId(docId, index) {
  return `${docId}-heading-${index}`;
}

function tocLevelForKind(kind) {
  if (kind === 'h2') return 1;
  if (kind === 'h3') return 2;
  if (kind === 'h4') return 3;
  return 0;
}

function tocEntriesFromItems(items, doc) {
  return items
    .map(({ text, index }) => ({ text, index, kind: paragraphKind(text) }))
    .filter((item) => ['h2', 'h3', 'h4'].includes(item.kind))
    .map((item) => ({
      id: headingId(doc.id, item.index),
      text: item.text,
      level: tocLevelForKind(item.kind),
    }));
}

function looksLikeImplicitBullet(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (['h2', 'h3', 'h4', 'li'].includes(paragraphKind(trimmed))) return false;
  // The DOCX parser removes the Word bullet symbol from many paragraphs.
  // In the source files these bullet points usually begin with a lowercase word
  // and appear as consecutive short paragraphs.
  return /^[a-ząćęłńóśźż]/.test(trimmed);
}

function implicitBulletIndexes(items) {
  const indexes = new Set();
  let group = [];

  const flushGroup = () => {
    if (group.length >= 2) group.forEach((item) => indexes.add(item.index));
    group = [];
  };

  items.forEach((item) => {
    if (looksLikeImplicitBullet(item.text)) {
      group.push(item);
    } else {
      flushGroup();
    }
  });
  flushGroup();
  return indexes;
}

function renderEsokjTable(level) {
  const tableData = {
    A2: [
      [
        'Słuchanie ze zrozumieniem',
        'Potrafi zrozumieć wyrażenia i najczęściej używane słowa związane ze sprawami dla niego ważnymi (np. podstawowe informacje dotyczące jego samego i rodziny, zakupów, szkoły, czasu wolnego). Potrafi zrozumieć główną myśl krótkich, prostych komunikatów i wypowiedzi.'
      ],
      [
        'Czytanie ze zrozumieniem',
        'Potrafi czytać krótkie, proste teksty. Potrafi znaleźć konkretne, przewidywalne informacje w prostych materiałach użytkowych, takich jak ogłoszenia, wiadomości, plakaty, menu czy rozkłady. Rozumie krótkie, proste teksty narracyjne i informacyjne.'
      ],
      [
        'Mówienie – interakcja',
        'Potrafi brać udział w prostych, typowych rozmowach wymagających bezpośredniej wymiany informacji na znane tematy. Radzi sobie w krótkich rozmowach towarzyskich, nawet jeśli potrzebuje wsparcia rozmówcy.'
      ],
      [
        'Mówienie – produkcja',
        'Potrafi posłużyć się prostymi wyrażeniami i zdaniami, aby opisać siebie, innych ludzi, codzienne czynności, miejsca, doświadczenia i plany.'
      ],
      [
        'Pisanie',
        'Potrafi pisać krótkie i proste notatki, wiadomości oraz teksty użytkowe. Potrafi stworzyć prosty opis, wiadomość lub krótki tekst o sobie i swoim otoczeniu.'
      ]
    ],
    B1: [
      [
        'Słuchanie ze zrozumieniem',
        'Potrafi zrozumieć główne myśli wypowiedzi formułowanych wyraźnie i w standardowej odmianie języka, dotyczących spraw znanych i typowych. Rozumie sens głównych wątków krótkich nagrań, rozmów i wypowiedzi.'
      ],
      [
        'Czytanie ze zrozumieniem',
        'Potrafi rozumieć teksty składające się głównie z języka codziennego lub związanego z jego zainteresowaniami. Potrafi wyszukiwać informacje, rozpoznawać intencję autora i rozumieć główny sens tekstu.'
      ],
      [
        'Mówienie – interakcja',
        'Potrafi radzić sobie w większości sytuacji komunikacyjnych, podtrzymywać prostą rozmowę, zadawać pytania i reagować adekwatnie do sytuacji.'
      ],
      [
        'Mówienie – produkcja',
        'Potrafi tworzyć proste, spójne wypowiedzi na znane tematy, opisywać doświadczenia, wydarzenia, marzenia i plany oraz krótko uzasadniać opinie.'
      ],
      [
        'Pisanie',
        'Potrafi pisać proste, spójne teksty użytkowe i osobiste, np. wiadomość, opis, wpis lub krótką opinię.'
      ]
    ],
    'B1+': [
      [
        'Słuchanie ze zrozumieniem',
        'Potrafi rozumieć dłuższe wypowiedzi i nagrania o umiarkowanym stopniu złożoności, w tym wybrane materiały autentyczne, jeśli temat jest znany lub wsparty kontekstem.'
      ],
      [
        'Czytanie ze zrozumieniem',
        'Potrafi rozumieć dłuższe teksty informacyjne i narracyjne, wyszukiwać informacje szczegółowe, rozpoznawać zależności i interpretować sens tekstu.'
      ],
      [
        'Mówienie – interakcja',
        'Potrafi aktywnie uczestniczyć w rozmowie, rozwijać wypowiedź, reagować adekwatnie i odnosić się do opinii innych rozmówców.'
      ],
      [
        'Mówienie – produkcja',
        'Potrafi tworzyć bardziej rozbudowane, uporządkowane wypowiedzi ustne, wyrażać i uzasadniać opinie, porównywać stanowiska oraz komentować argumenty.'
      ],
      [
        'Pisanie',
        'Potrafi pisać bardziej rozwinięte i uporządkowane teksty, przekazując informacje, uzasadniając opinie i porządkując argumenty.'
      ]
    ],
    B2: [
      [
        'Słuchanie ze zrozumieniem',
        'Potrafi rozumieć dłuższe wypowiedzi i bardziej złożone komunikaty, także wtedy, gdy nie są one ściśle związane z codziennym doświadczeniem ucznia. Rozumie główne sensy i istotne szczegóły materiałów autentycznych.'
      ],
      [
        'Czytanie ze zrozumieniem',
        'Potrafi czytać ze zrozumieniem bardziej złożone teksty, w tym teksty autentyczne, rozpoznawać ich strukturę, intencję autora oraz interpretować sens i argumentację.'
      ],
      [
        'Mówienie – interakcja',
        'Potrafi uczestniczyć w rozmowie w sposób płynny i spontaniczny, podtrzymywać interakcję, precyzować znaczenie i dostosowywać język do sytuacji oraz odbiorcy.'
      ],
      [
        'Mówienie – produkcja',
        'Potrafi tworzyć szczegółowe, spójne i dobrze zorganizowane wypowiedzi ustne, rozwijać argumentację, uzasadniać stanowisko i analizować problem.'
      ],
      [
        'Pisanie',
        'Potrafi pisać spójne, uporządkowane i rozwinięte teksty, w których przekazuje informacje, argumentuje, uzasadnia i porządkuje treść adekwatnie do celu wypowiedzi.'
      ]
    ]
  };

  const rows = tableData[level] || tableData.A2;

  return (
    <table className="esokjTable">
      <thead>
        <tr>
          <th>Umiejętności</th>
          <th>Poziom {level}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([skill, description]) => (
          <tr key={skill}>
            <td>{skill}</td>
            <td>{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderDocumentItems(items, form, doc) {
  const nodes = [];
  let bulletBuffer = [];
  const autoBulletIndexes = implicitBulletIndexes(items);

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    nodes.push(
      <ul className="bulletList" key={`bullets-${bulletBuffer[0].index}`}>
        {bulletBuffer.map(({ text, index, props }) => (
          <li key={`${doc.id}-${index}`} {...props}>
  {fixPolishWidows(plainTextForListItem(text))}
</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

items.forEach(({ text, index }, itemNumber) => {
  text = renumberAfterHiddenExam(text, form, doc);

  const info = paragraphVariantInfo(index, form, doc);
  const props = info
    ? { className: 'variantHighlight', 'data-variant-ids': info.ids.join(','), 'data-step-target': info.step || undefined }
    : {};
    const esokjTableMarkers = {
      '[TABLE_ESOKJ_A2]': 'A2',
      '[TABLE_ESOKJ_B1]': 'B1',
      '[TABLE_ESOKJ_B1_PLUS]': 'B1+',
      '[TABLE_ESOKJ_B2]': 'B2',
    };

    if (esokjTableMarkers[text]) {
      flushBullets();
      nodes.push(
        <div key={`esokj-${esokjTableMarkers[text]}-${index}`} {...props}>
          {renderEsokjTable(esokjTableMarkers[text])}
        </div>
      );
      return;
    }

    if (itemNumber === 0) props.className = [props.className, 'docBodyStart'].filter(Boolean).join(' ');

    const kind = paragraphKind(text);
    const shouldRenderAsBullet = kind === 'li' || autoBulletIndexes.has(index);

    if (
  doc.stageGroup === 'I' &&
  text.includes('Program zakłada również możliwość rozszerzania procesu dydaktycznego o podejścia i metody')
) {
  props['data-section-target'] = 'methods';
}

if (
  doc.stageGroup === 'II' &&
  text.includes('Metody uzupełniające')
) {
  props['data-section-target'] = 'methods';
}

if (
  text.includes('VI.3. Materiały i środki dydaktyczne') ||
  text.includes('IV.5.3. Komponenty programu i materiały dydaktyczne') ||
  text.includes('IV.8.3. Komponenty programu i materiały dydaktyczne')
) {
  props['data-section-target'] = 'materials';
}

    if (
      doc.stageGroup === 'I' &&
      text.includes('Program zakłada również możliwość rozszerzania procesu dydaktycznego o podejścia i metody')
    ) {
      props['data-section-target'] = 'methods';
    }

    if (shouldRenderAsBullet) {
      bulletBuffer.push({ text, index, props });
      return;
    }

    flushBullets();

    if (['h2', 'h3', 'h4'].includes(kind)) {
      props.id = headingId(doc.id, index);
      props['data-toc-heading'] = headingId(doc.id, index);
    }

    nodes.push(renderParagraph(text, `${doc.id}-${index}`, props));
  });

  flushBullets();
  return nodes;
}

function fixPolishWidows(text) {
  return text.replace(
    /(^|[\s(„"'])((?:[aiouwzAIUOWZ]|do|od|na|po|we|ze|za|ku|Do|Od|Na|Po|We|Ze|Za|Ku))\s+/g,
    '$1$2\u00A0'
  );
}

function renderParagraph(text, index, extraProps = {}) {
  const kind = paragraphKind(text);
  const className = [extraProps.className, kind === 'li' ? 'bullet' : ''].filter(Boolean).join(' ');
  const props = { ...extraProps, key: index, className: className || undefined };

  const fixedText = fixPolishWidows(text);

  if (kind === 'h2') return <h2 {...props}>{fixedText}</h2>;
  if (kind === 'h3') return <h3 {...props}>{fixedText}</h3>;
  if (kind === 'h4') return <h4 {...props}>{fixedText}</h4>;
  if (kind === 'li') return <p {...props}>{fixPolishWidows(text.replace(/^[·•]\s*/, ''))}</p>;

  return <p {...props}>{fixedText}</p>;
}

function ChoiceCard({ active, title, subtitle, onClick, multi = false, disabled = false }) {
  return (
    <button type="button" className={`choice ${active ? 'active' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="choiceIcon">{active ? <CheckCircle2 size={18} /> : multi ? '□' : '○'}</span>
      <span>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
    </button>
  );
}

function App() {
  const [step, setStep] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1);
  const previewRef = useRef(null);
  const paperRef = useRef(null);
  const [tocPages, setTocPages] = useState({});
  const [form, setForm] = useState(() => {
    try {
      return normalizeForm(JSON.parse(localStorage.getItem('kreator-programu-angielski') || 'null'));
    } catch {
      return DEFAULT_FORM;
    }
  });

  const doc = documentById(docIdFromForm(form));
  const currentMethods = getDocArray(form, doc, 'methodsByDoc', defaultMethods);
  const currentMaterials = getDocArray(form, doc, 'materialsByDoc', defaultMaterials);
  const seriesOptions = labelOptions(doc.seriesIds, SERIES_LABELS);
  const methodOptions = labelOptions(doc.methodIds, METHOD_LABELS[doc.stageGroup] || {});
  const materialOptions = labelOptions(doc.materialIds, MATERIAL_LABELS[doc.stageGroup] || {});
  const levelOptions = labelOptions(doc.levelIds || [], LEVEL_LABELS);
  const examEnabled = doc.examId ? (form.examByDoc?.[doc.id] ?? true) : false;
  const currentEsokjId = selectedEsokjId(form, doc);
  const esokjOptions = labelOptions(doc.esokjIds || [], ESOKJ_LABELS);
  const showBody = step > 0;

  const printableParagraphs = useMemo(() => {
    const visible = doc.paragraphs
      .map((text, index) => ({ text, index }))
      .filter(({ index }) => shouldShowParagraph(index, form, doc));
    return renumberOptionalHeadings(visible, doc);
  }, [form, doc]);

  const tocEntries = useMemo(() => tocEntriesFromItems(printableParagraphs, doc), [printableParagraphs, doc]);

  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const stepId = STEPS[step].id;
    let selector = `[data-step-target="${stepId}"]`;
    if (stepId === 'start') selector = '.titlePage';
    if (stepId === 'basis') selector = '.docBodyStart';
    if (stepId === 'methods') selector = '[data-section-target="methods"]';
    if (stepId === 'materials') selector = '[data-section-target="materials"]';
    if (stepId === 'preview') selector = '.titlePage';
    const target = root.querySelector(selector) || root.querySelector('.docBodyStart') || root.querySelector('.titlePage');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }, [step, doc.id, form.level, form.series, currentMethods.join(','), currentMaterials.join(','), examEnabled]);



  useEffect(() => {
    if (!showBody || !paperRef.current || !tocEntries.length) {
      setTocPages({});
      return;
    }

    const measurePages = () => {
      const paper = paperRef.current;
      if (!paper) return;
      const rect = paper.getBoundingClientRect();
      const zoomSafeWidth = rect.width / previewZoom;
      const pageHeight = zoomSafeWidth * (297 / 210);
      const nextPages = {};

      tocEntries.forEach((entry) => {
        const element = paper.querySelector(`[data-toc-heading="${entry.id}"]`);
        if (!element) return;
        nextPages[entry.id] = Math.max(1, Math.floor(element.offsetTop / pageHeight) + 1);
      });

      setTocPages((current) => {
        const currentJson = JSON.stringify(current);
        const nextJson = JSON.stringify(nextPages);
        return currentJson === nextJson ? current : nextPages;
      });
    };

    const id = window.requestAnimationFrame(measurePages);
    window.addEventListener('resize', measurePages);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', measurePages);
    };
  }, [showBody, tocEntries, previewZoom, doc.id]);

  useEffect(() => {
    if (!doc.seriesIds.includes(form.series)) {
      setForm((prev) => ({ ...prev, series: doc.seriesIds[0] || '7' }));
    }
    if (doc.levelIds?.length && !doc.levelIds.includes(form.level)) {
      setForm((prev) => ({ ...prev, level: doc.levelIds[0] }));
    }
  }, [doc.id]);

  const save = () => {
    localStorage.setItem('kreator-programu-angielski', JSON.stringify(form));
    alert('Zapisano szkic w tej przeglądarce.');
  };

  const reset = () => {
    if (confirm('Wyczyścić formularz i wrócić do ustawień domyślnych?')) {
      setForm(DEFAULT_FORM);
      localStorage.removeItem('kreator-programu-angielski');
    }
  };
  
  const handlePrint = async () => {
  try {
    await fetch('/api/save-print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teacherName: form.teacherName,
        schoolName: form.schoolName,
        city: form.city,
        year: form.year,
        stageGroup: form.stageGroup,
        foundation: form.foundation,
      }),
    });
  } catch (error) {
    console.warn('Nie udało się zapisać danych przed drukiem.', error);
  }

  window.print();
};

  const setStage = (stageGroup) => {
    setForm((prev) => ({ ...prev, stageGroup }));
  };

  const setFoundation = (foundation) => {
    setForm((prev) => ({ ...prev, foundation }));
  };

  const setDocArray = (key, values) => {
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [doc.id]: values } }));
  };

  const toggleArray = (key, id) => {
    const current = key === 'methodsByDoc' ? currentMethods : currentMaterials;
    setDocArray(key, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  return (
    <div className="app">
      <main className="layout">
        <aside className="sidebar noPrint">
          <div className="sidebarBrand">
            <img src="/nowa-era-logo.png" alt="Nowa Era" />
            <h2>Kreator programu nauczania</h2>
            <p>Język angielski</p>
          </div>
          <nav className="stepNav" aria-label="Kroki kreatora">
            {STEPS.map((s, i) => (
              <button key={s.id} className={i === step ? 'current' : ''} onClick={() => setStep(i)}>
                <span className="stepNumber">{i + 1}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </nav>
          <div className="sidebarActions">
            <button onClick={save} className="secondary"><Save size={16}/>Zapisz szkic</button>
            <button onClick={reset} className="secondary"><RotateCcw size={16}/>Wyczyść ustawienia</button>
          </div>
        </aside>

        <section className="wizard noPrint">
          <div className="panel">
            <p className="eyebrow">Krok {step + 1} z {STEPS.length}</p>
            <h1>{STEPS[step].title}</h1>

            {STEPS[step].id === 'start' && <div className="formgrid">
              <label>Imię i nazwisko nauczyciela / autora<input value={form.teacherName} onChange={(e) => setForm({ ...form, teacherName: e.target.value })} placeholder="np. Anna Kowalska" /></label>
              <label>Nazwa szkoły<input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} placeholder="np. Szkoła Podstawowa nr 1" /></label>
              <label>Miejscowość<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="np. Częstochowa" /></label>
              <label>Rok<input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></label>
              <div className="full choices compactChoices">
                <p><strong>Wybierz zakres klas.</strong> Na tym etapie podgląd pokazuje tylko stronę tytułową.</p>
                <ChoiceCard active={form.stageGroup === 'I'} title="Klasy 1–3" subtitle="I etap edukacyjny" onClick={() => setStage('I')} />
                <ChoiceCard active={form.stageGroup === 'II'} title="Klasy 4–8" subtitle="II etap edukacyjny" onClick={() => setStage('II')} />
              </div>
            </div>}

            {STEPS[step].id === 'basis' && <div className="choices">
              <p>Wybierz podstawę programową. Na tej podstawie kreator przełączy się na odpowiedni podprogram źródłowy.</p>
              <div className="twocol">
                <ChoiceCard active={form.foundation === '2024'} title="Stara podstawa · 2024" subtitle="Dokument oparty na podstawie 2024" onClick={() => setFoundation('2024')} />
                <ChoiceCard active={form.foundation === '2026'} title="Nowa podstawa · 2026" subtitle="Dokument oparty na podstawie 2026" onClick={() => setFoundation('2026')} />
              </div>
              {form.stageGroup === 'II' && form.foundation === '2026' && levelOptions.length > 0 && <>
                <p>W przypadku klas 4–8 na nowej podstawie wybierz także poziom.</p>
                <div className="twocol">{levelOptions.map((v) => <ChoiceCard key={v.id} active={form.level === v.id} title={v.title} subtitle={v.subtitle} onClick={() => setForm({ ...form, level: v.id })} />)}</div>
              </>}
              <div className="notice"><strong>Wybrany podprogram:</strong> {doc.label} · {doc.stage}</div>
            </div>}

            {STEPS[step].id === 'series' && <div className="choices"><p>Wybierz jedną serię. Do dokumentu trafią tylko pasujące fragmenty wariantowe.</p>{seriesOptions.map((v) => <ChoiceCard key={v.id} active={form.series === v.id} title={v.title} subtitle={v.subtitle} onClick={() => setForm({ ...form, series: v.id })} />)}</div>}

            {STEPS[step].id === 'methods' && <div className="choices"><p>Zaznacz metody uzupełniające, które chcesz uwzględnić.</p>{methodOptions.map((v) => <ChoiceCard key={v.id} multi active={currentMethods.includes(v.id)} title={v.title} subtitle={v.subtitle} onClick={() => toggleArray('methodsByDoc', v.id)} />)}</div>}

            {STEPS[step].id === 'materials' && <div className="choices"><p>Zaznacz materiały i środki dydaktyczne, które mają pojawić się w programie.</p>{materialOptions.map((v) => <ChoiceCard key={v.id} multi active={currentMaterials.includes(v.id)} title={v.title} subtitle={v.subtitle} onClick={() => toggleArray('materialsByDoc', v.id)} />)}</div>}

            {STEPS[step].id === 'exam' && <div className="choices">
              {doc.examId ? <ChoiceCard multi active={examEnabled} title="#26 Przygotowanie do egzaminu ósmoklasisty" subtitle="Po odznaczeniu rozdział egzaminacyjny nie zostanie dodany do PDF." onClick={() => setForm({ ...form, examByDoc: { ...(form.examByDoc || {}), [doc.id]: !examEnabled } })} /> : <div className="notice">Dla klas I–III krok egzaminacyjny nie jest przewidziany.</div>}

              {doc.esokjIds?.length > 0 && <>
                <p><strong>Poziom odniesienia ESOKJ.</strong> Wybierz tabelę deskryptorów osiągnięć, która ma znaleźć się w dokumencie.</p>
                <div className="twocol">
                  {esokjOptions.map((option) => (
                    <ChoiceCard
                      key={option.id}
                      active={currentEsokjId === option.id}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          esokjByDoc: {
                            ...(prev.esokjByDoc || {}),
                            [doc.id]: option.id,
                          },
                        }));

                        window.setTimeout(() => {
                          const root = previewRef.current;
                          const target = root?.querySelector(`[data-step-target="esokj"][data-variant-ids="${option.id}"]`) || root?.querySelector(`[data-variant-ids="${option.id}"]`);
                          if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                          }
                        }, 80);
                      }}
                    />
                  ))}
                </div>
              </>}

              <div className="notice"><strong>Gotowe.</strong> Sprawdź podgląd po prawej stronie. Aby zapisać PDF, kliknij „PDF / druk”, a następnie wybierz „Zapisz jako PDF”.</div>
            </div>}

            <div className="navbuttons"><button className="secondary" disabled={step === 0} onClick={() => setStep((current) => current - 1)}><ChevronLeft size={16}/>Wstecz</button><button disabled={step === STEPS.length - 1} onClick={() => setStep((current) => current + 1)}>Dalej<ChevronRight size={16}/></button></div>
          </div>
        </section>

        <div className="leftColumnsCopyright noPrint">
          © Copyright by Nowa Era Sp. z o.o./Sanoma
        </div>

        <section className="previewShell">
          <div className="previewHeader noPrint">
            <div className="previewTitle"><FileText size={18}/><strong>{doc.foundation} · klasy {doc.stageGroup === 'I' ? '1–3' : '4–8'}</strong></div>
            <div className="previewToolbar">
              <button className="secondary compactButton" aria-label="Pomniejsz podgląd" onClick={() => setPreviewZoom((value) => Math.max(0.55, +(value - 0.1).toFixed(2)))}><ZoomOut size={15}/></button>
              <span>{Math.round(previewZoom * 100)}%</span>
              <button className="secondary compactButton" aria-label="Powiększ podgląd" onClick={() => setPreviewZoom((value) => Math.min(1.4, +(value + 0.1).toFixed(2)))}><ZoomIn size={15}/></button>
              <button onClick={handlePrint} className="printButton">
  <Printer size={16}/>PDF / druk
</button>
            </div>
          </div>
          <div className="preview" ref={previewRef}>
          <article className="paper" ref={paperRef} style={{ zoom: previewZoom }}>
         <section className="titlePage">
  <div className="titlePageMain">
    <h1>{doc.title}</h1>
    <p className="authorsLine">
      Autorzy: {form.teacherName ? `${form.teacherName}${form.schoolName ? ` (${form.schoolName})` : ''}` : '____________________'}, Aleksandra Marchwian (National Geographic Learning)
    </p>
  </div>

  <div className="titlePageFooterBlock">
    {(form.city || form.year) && (
      <p className="titlePageFooter">
        {[form.city, form.year].filter(Boolean).join(', ')}
      </p>
    )}

    <p className="titlePageCopyright">
      © Copyright by Nowa Era Sp. z o.o./Sanoma
    </p>
  </div>
</section>
            {showBody && <section className="tocPage">
              <h2>Spis treści</h2>
              <ol className="tocList">
                {tocEntries.map((entry) => (
                  <li key={entry.id} className={`tocLevel${entry.level}`}>
                    <span className="tocTitle">{entry.text}</span>
                    <span className="tocDots" aria-hidden="true"></span>
                    <span className="tocPageNumber">{tocPages[entry.id] || ''}</span>
                  </li>
                ))}
              </ol>
            </section>}
            {showBody && <section className="docBody">
              {renderDocumentItems(printableParagraphs, form, doc)}
            </section>}
          </article>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
