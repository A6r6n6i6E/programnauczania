export const SERIES_LABELS = {
  "7": [
    "Our World",
    "Treści globalne, visual literacy, wartości i poznawanie świata."
  ],
  "8": [
    "Look",
    "Ciekawość poznawcza, projekty, obraz i życie codzienne."
  ],
  "9": [
    "Trailblazer",
    "Inquiry-based learning, multiple literacies, autonomia i sprawczość."
  ],
  "10": [
    "New Close-up",
    "Mediacja, egzamin, SEL, critical thinking i global citizenship."
  ]
};

export const LEVEL_LABELS = {
  "5": [
    "Poziom oczekiwany",
    "A2 – zgodnie z ESOKJ"
  ],
  "6": [
    "Poziom wyższy",
    "B1 – zgodnie z ESOKJ"
  ]
};

export const METHOD_LABELS = {
  "I": {
    "9": [
      "Podejście oparte na dociekaniu (inquiry-based learning)",
      ""
    ],
    "10": [
      "Nauczanie projektowe (project-based learning)",
      ""
    ],
    "11": [
      "CLIL – integrowanie języka z treściami",
      ""
    ],
    "12": [
      "Metoda naturalna",
      ""
    ],
    "13": [
      "Elementy metody audiolingwalnej",
      ""
    ]
  },
  "II": {
    "11": [
      "Nauczanie zintegrowane (CLIL)",
      ""
    ],
    "12": [
      "Metoda projektu (project-based learning)",
      ""
    ],
    "13": [
      "Elementy metody audiolingwalnej",
      ""
    ],
    "14": [
      "Elementy Total Physical Response (TPR)",
      ""
    ],
    "15": [
      "Elementy metody gramatyczno-tłumaczeniowej",
      ""
    ]
  }
};

export const MATERIAL_LABELS = {
  "I": {
    "14": [
      "Zeszyt ćwiczeń",
      ""
    ],
    "15": [
      "Karty pracy i materiały do kopiowania",
      ""
    ],
    "16": [
      "Książka nauczyciela (lesson planner)",
      ""
    ],
    "17": [
      "Flashcards i materiały wizualne",
      ""
    ],
    "18": [
      "Plakaty i ekspozycje językowe",
      ""
    ],
    "19": [
      "Materiały audio i video",
      ""
    ],
    "20": [
      "Readersy i książeczki obrazkowe",
      ""
    ],
    "21": [
      "Platforma SPARK i Classroom Presentation Tool",
      ""
    ],
    "22": [
      "Materiały manipulacyjne, gry i realia",
      ""
    ],
    "23": [
      "Materiały dla nauczyciela",
      ""
    ]
  },
  "II": {
    "16": [
      "Zeszyt ćwiczeń (Workbook)",
      ""
    ],
    "17": [
      "Karty pracy",
      ""
    ],
    "18": [
      "Materiały audiowizualne",
      ""
    ],
    "19": [
      "Komponent cyfrowy (platforma Spark)",
      ""
    ],
    "20": [
      "Flashcards",
      ""
    ],
    "21": [
      "Materiały wizualne i graficzne",
      ""
    ],
    "22": [
      "Materiały autentyczne",
      ""
    ],
    "23": [
      "Realia i materiały manipulacyjne",
      ""
    ],
    "24": [
      "Materiały projektowe i prezentacyjne",
      ""
    ],
    "25": [
      "Materiały dla nauczyciela",
      ""
    ]
  }
};

import { programDocument as program2024_13 } from './data/programData2024_13.js';
import { programDocument as program2026_13 } from './data/programData2026_13.js';
import { programDocument as program2024_48 } from './data/programData2024_48.js';
import { programDocument as program2026_48 } from './data/programData2026_48.js';

export const PROGRAM_DOCUMENTS = [
  program2024_13,
  program2026_13,
  program2024_48,
  program2026_48,
];

export const DOCUMENT_BY_KEY = Object.fromEntries(PROGRAM_DOCUMENTS.map((doc) => [doc.id, doc]));
