import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, ChevronRight, FileText, Printer, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { DOC_PARAGRAPHS } from './programData.js';
import './styles.css';

const PROGRAM_OPTIONS = [
  {
    id: 'I',
    label: 'I etap edukacyjny',
    title: 'Program nauczania języka angielskiego dla I etapu edukacyjnego w klasach I - III szkoły podstawowej',
    stage: 'I etap edukacyjny - klasy I-III szkoły podstawowej',
    basis: 'I.1 - język obcy nowożytny nauczany jako pierwszy',
  },
  {
    id: 'II',
    label: 'II etap edukacyjny',
    title: 'Program nauczania języka angielskiego dla II etapu edukacyjnego w klasach IV - VIII szkoły podstawowej',
    stage: 'II etap edukacyjny - klasy IV-VIII szkoły podstawowej',
    basis: 'II.1 - język obcy nowożytny nauczany jako pierwszy, kontynuacja nauki po klasach I-III',
  },
];

const STEPS = [
  { id: 'start', title: 'Dane programu' },
  { id: 'basis', title: 'Podstawa i poziom' },
  { id: 'series', title: 'Seria NGL' },
  { id: 'methods', title: 'Metody uzupełniające' },
  { id: 'materials', title: 'Materiały dydaktyczne' },
  { id: 'exam', title: 'Egzamin i podgląd' },
];

const LEVELS = [
  { id: '5', title: '#5 Poziom oczekiwany', subtitle: 'A2 - zgodnie z ESOKJ' },
  { id: '6', title: '#6 Poziom wyższy', subtitle: 'B1 - zgodnie z ESOKJ' },
];

const SERIES = [
  { id: '7', title: '#7 Our World', subtitle: 'Treści globalne, Nat Geo Explorers, wartości i poznawanie świata.' },
  { id: '8', title: '#8 Look', subtitle: 'Ciekawość poznawcza, visual literacy, projekty i życie codzienne.' },
  { id: '9', title: '#9 Trailblazer', subtitle: 'Inquiry-based learning, multiple literacies, autonomia i empowerment.' },
  { id: '10', title: '#10 New Close-up', subtitle: 'Mediacja, egzamin, SEL, critical thinking i global citizenship.' },
];

const METHODS = [
  { id: '11', title: '#11 VI.1.4. Nauczanie zintegrowane (CLIL)' },
  { id: '12', title: '#12 VI.1.5. Metoda projektu (project-based learning)' },
  { id: '13', title: '#13 VI.1.6. Elementy metody audiolingwalnej' },
  { id: '14', title: '#14 VI.1.7. Elementy Total Physical Response (TPR)' },
  { id: '15', title: '#15 VI.1.8. Elementy metody gramatyczno-tłumaczeniowej' },
];

const MATERIALS = [
  { id: '16', title: '#16 VI.3.2. Zeszyt ćwiczeń (Workbook)' },
  { id: '17', title: '#17 VI.3.3. Karty pracy' },
  { id: '18', title: '#18 VI.3.4. Materiały audiowizualne' },
  { id: '19', title: '#19 VI.3.5. Komponent cyfrowy (platforma Spark)' },
  { id: '20', title: '#20 VI.3.6. Flashcards' },
  { id: '21', title: '#21 VI.3.7. Materiały wizualne i graficzne' },
  { id: '22', title: '#22 VI.3.8. Materiały autentyczne' },
  { id: '23', title: '#23 VI.3.9. Realia i materiały manipulacyjne' },
  { id: '24', title: '#24 VI.3.10. Materiały projektowe i prezentacyjne' },
  { id: '25', title: '#25 VI.3.11. Materiały dla nauczyciela' },
];

const DEFAULT_FORM = {
  teacherName: '',
  schoolName: '',
  city: '',
  year: new Date().getFullYear().toString(),
  programType: 'II',
  foundation: '4',
  level: '5',
  series: '7',
  methods: ['11', '12'],
  materials: ['16', '18', '19', '21', '25'],
  exam: true,
};

// Ranges are based on the uploaded DOCX. start and end are paragraph indexes in DOC_PARAGRAPHS.
// Paragraph at start is the marker itself and is never printed. Paragraphs from start+1 to end-1 belong to the variant.
const VARIANT_RANGES = [
  { start: 34, end: 36, ids: ['5'] },
  { start: 36, end: 38, ids: ['6'] },
  { start: 66, end: 72, ids: ['7'] },
  { start: 72, end: 78, ids: ['8'] },
  { start: 78, end: 86, ids: ['9'] },
  { start: 86, end: 91, ids: ['10'] },
  { start: 142, end: 261, ids: ['5'] },
  { start: 261, end: 389, ids: ['6'] },
  { start: 389, end: 454, ids: ['5'] },
  { start: 454, end: 532, ids: ['6'] },
  { start: 616, end: 619, ids: ['11'] },
  { start: 619, end: 622, ids: ['12'] },
  { start: 622, end: 625, ids: ['13'] },
  { start: 625, end: 628, ids: ['14'] },
  { start: 628, end: 632, ids: ['15'] },
  { start: 650, end: 654, ids: ['16'] },
  { start: 654, end: 659, ids: ['17'] },
  { start: 659, end: 665, ids: ['18'] },
  { start: 665, end: 692, ids: ['19'] },
  { start: 692, end: 697, ids: ['20'] },
  { start: 697, end: 702, ids: ['21'] },
  { start: 702, end: 707, ids: ['22'] },
  { start: 707, end: 713, ids: ['23'] },
  { start: 713, end: 718, ids: ['24'] },
  { start: 718, end: 725, ids: ['25'] },
  { start: 848, end: 872, ids: ['9'] },
  { start: 872, end: 874, ids: ['7', '8'] },
  { start: 874, end: 876, ids: ['7', '9'] },
  { start: 923, end: 962, ids: ['26'] },
  { start: 1068, end: 1072, ids: ['5'] },
  { start: 1072, end: 1074, ids: ['6'] },
];

function selectedVariantIds(form) {
  const ids = new Set();
  ids.add(form.level);
  ids.add(form.series);
  form.methods.forEach((id) => ids.add(id));
  form.materials.forEach((id) => ids.add(id));
  if (form.exam) ids.add('26');
  return ids;
}

function shouldShowParagraph(index, form) {
  if (index < 24) return false; // skip original title page and table of contents
  const text = DOC_PARAGRAPHS[index]?.trim() || '';
  if (!text) return false;
  if (text === '[AUTO]' || text.includes('[WARIANT')) return false;

  const selected = selectedVariantIds(form);
  const range = VARIANT_RANGES.find((r) => index > r.start && index < r.end);
  if (!range) return true;
  return range.ids.some((id) => selected.has(id));
}

function adaptText(text, form) {
  const program = PROGRAM_OPTIONS.find((p) => p.id === form.programType) || PROGRAM_OPTIONS[1];
  if (form.programType === 'I') {
    return text
      .replaceAll('II etapu edukacyjnego', 'I etapu edukacyjnego')
      .replaceAll('II etap edukacyjny – klasy IV–VIII szkoły podstawowej', 'I etap edukacyjny - klasy I-III szkoły podstawowej')
      .replaceAll('II etap edukacyjny - klasy IV-VIII szkoły podstawowej', 'I etap edukacyjny - klasy I-III szkoły podstawowej')
      .replaceAll('klasach IV–VIII', 'klasach I-III')
      .replaceAll('klasach IV-VIII', 'klasach I-III')
      .replaceAll('II.1 – język obcy nowożytny nauczany jako pierwszy, kontynuacja nauki po klasach I–III', program.basis)
      .replaceAll('II.1 - język obcy nowożytny nauczany jako pierwszy, kontynuacja nauki po klasach I-III', program.basis);
  }
  return text;
}

function paragraphKind(text) {
  if (/^[IVX]+\.\s/.test(text) || /^[IVX]+\.$/.test(text)) return 'h2';
  if (/^[IVX]+\.\d+\.\s/.test(text) || /^[IVX]+\.\d+\./.test(text)) return 'h3';
  if (/^[IVX]+\.\d+\.\d+\./.test(text)) return 'h4';
  if (/^\d+\)/.test(text) || text.startsWith('· ')) return 'li';
  if (/^[a-ząćęłńóśźż].+,$/.test(text) || /^[a-ząćęłńóśźż].+\.$/.test(text) && text.length < 180) return 'maybe-li';
  return 'p';
}

function renderParagraph(text, index) {
  const kind = paragraphKind(text);
  if (kind === 'h2') return <h2 key={index}>{text}</h2>;
  if (kind === 'h3') return <h3 key={index}>{text}</h3>;
  if (kind === 'h4') return <h4 key={index}>{text}</h4>;
  if (kind === 'li') return <p key={index} className="bullet">{text.replace(/^·\s*/, '')}</p>;
  return <p key={index}>{text}</p>;
}

function ChoiceCard({ active, title, subtitle, onClick, multi = false }) {
  return (
    <button type="button" className={`choice ${active ? 'active' : ''}`} onClick={onClick}>
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
  const [form, setForm] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kreator-programu-angielski') || 'null') || DEFAULT_FORM;
    } catch {
      return DEFAULT_FORM;
    }
  });

  const program = PROGRAM_OPTIONS.find((p) => p.id === form.programType) || PROGRAM_OPTIONS[1];
  const printableParagraphs = useMemo(() => {
    return DOC_PARAGRAPHS
      .map((text, index) => ({ text: adaptText(text, form), index }))
      .filter(({ index }) => shouldShowParagraph(index, form));
  }, [form]);

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

  const toggleArray = (key, id) => {
    setForm((prev) => {
      const value = prev[key];
      return { ...prev, [key]: value.includes(id) ? value.filter((x) => x !== id) : [...value, id] };
    });
  };

  return (
    <div className="app">
      <header className="topbar noPrint">
        <div className="brand"><FileText /><div><strong>Kreator programu nauczania</strong><span>Język angielski</span></div></div>
        <div className="actions"><button onClick={reset} className="secondary"><RotateCcw size={16}/>Reset</button><button onClick={save} className="secondary"><Save size={16}/>Zapisz</button><button onClick={() => window.print()}><Printer size={16}/>PDF / druk</button></div>
      </header>

      <main className="layout">
        <aside className="sidebar noPrint">
          {STEPS.map((s, i) => <button key={s.id} className={i === step ? 'current' : ''} onClick={() => setStep(i)}>{i + 1}. {s.title}</button>)}
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
              <div className="full choices">{PROGRAM_OPTIONS.map((p) => <ChoiceCard key={p.id} active={form.programType === p.id} title={p.title} subtitle={p.stage} onClick={() => setForm({ ...form, programType: p.id })} />)}</div>
            </div>}

            {STEPS[step].id === 'basis' && <div className="choices">
              <p>Wybierz podstawę programową oraz poziom. Wersja „stara/nowa” jest zapisana informacyjnie w danych projektu; dokument bazowy jest z pliku 2026.</p>
              <div className="twocol"><ChoiceCard active={form.foundation === '3'} title="#3 stara podstawa (2024/2025)" onClick={() => setForm({ ...form, foundation: '3' })} /><ChoiceCard active={form.foundation === '4'} title="#4 nowa podstawa (2026/2027)" onClick={() => setForm({ ...form, foundation: '4' })} /></div>
              <div className="twocol">{LEVELS.map((v) => <ChoiceCard key={v.id} active={form.level === v.id} title={v.title} subtitle={v.subtitle} onClick={() => setForm({ ...form, level: v.id })} />)}</div>
            </div>}

            {STEPS[step].id === 'series' && <div className="choices"><p>Wybierz jedną serię. Do dokumentu trafią tylko pasujące fragmenty wariantowe.</p>{SERIES.map((v) => <ChoiceCard key={v.id} active={form.series === v.id} title={v.title} subtitle={v.subtitle} onClick={() => setForm({ ...form, series: v.id })} />)}</div>}

            {STEPS[step].id === 'methods' && <div className="choices"><p>Zaznacz metody uzupełniające, które nauczyciel chce uwzględnić.</p>{METHODS.map((v) => <ChoiceCard key={v.id} multi active={form.methods.includes(v.id)} title={v.title} onClick={() => toggleArray('methods', v.id)} />)}</div>}

            {STEPS[step].id === 'materials' && <div className="choices"><p>Zaznacz materiały i środki dydaktyczne, które mają pojawić się w programie.</p>{MATERIALS.map((v) => <ChoiceCard key={v.id} multi active={form.materials.includes(v.id)} title={v.title} onClick={() => toggleArray('materials', v.id)} />)}</div>}

            {STEPS[step].id === 'exam' && <div className="choices"><ChoiceCard multi active={form.exam} title="#26 Przygotowanie do egzaminu ósmoklasisty" subtitle="Po odznaczeniu rozdział VI.6 nie zostanie dodany do PDF." onClick={() => setForm({ ...form, exam: !form.exam })} /><div className="notice"><strong>Gotowe.</strong> Sprawdź podgląd po prawej stronie. Aby zapisać PDF, kliknij „PDF / druk”, a następnie wybierz „Zapisz jako PDF”.</div></div>}

            <div className="navbuttons"><button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft size={16}/>Wstecz</button><button disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Dalej<ChevronRight size={16}/></button></div>
          </div>
        </section>

        <section className="preview">
          <article className="paper">
            <section className="titlePage">
              <h1>{program.title}</h1>
              <p>Autorzy: {form.teacherName || '____________________'}, Aleksandra Marchwian (National Geographic Learning)</p>
              {form.schoolName && <p>{form.schoolName}</p>}
              {(form.city || form.year) && <p>{[form.city, form.year].filter(Boolean).join(', ')}</p>}
            </section>
            <section className="docBody">
              {printableParagraphs.map(({ text, index }) => renderParagraph(text, index))}
            </section>
          </article>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
