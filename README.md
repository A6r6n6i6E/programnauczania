# Kreator programu nauczania języka angielskiego

Wersja rozszerzona obsługuje cztery niezależne podprogramy źródłowe:

- `src/data/programData2024_13.js` — podstawa 2024, klasy 1–3,
- `src/data/programData2026_13.js` — podstawa 2026, klasy 1–3,
- `src/data/programData2024_48.js` — podstawa 2024, klasy 4–8,
- `src/data/programData2026_48.js` — podstawa 2026, klasy 4–8.

Dzięki temu każdy dokument zachowuje własną strukturę, własne zakresy wariantów i własną numerację fragmentów. Plik `src/programData.js` pełni rolę indeksu oraz przechowuje etykiety wyborów widoczne w formularzu.

## Logika kreatora

1. Krok 1: dane programu oraz wybór zakresu klas: `1–3` albo `4–8`. Podgląd pokazuje wtedy tylko stronę tytułową.
2. Krok 2: wybór podstawy programowej: `2024` albo `2026`. Dla klas `4–8` i podstawy `2026` pojawia się dodatkowo wybór poziomu `A2` / `B1`.
3. Kolejne kroki wybierają serię, metody uzupełniające, materiały dydaktyczne oraz sekcję egzaminacyjną, jeśli dotyczy.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

## Build produkcyjny

```bash
npm run build
```

## Cloudflare Pages

Zalecane ustawienia:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: aktualna wersja LTS

## Uwagi implementacyjne

W dokumentach klas 1–3 marker `#9` jest używany w dwóch różnych kontekstach: jako seria `Trailblazer` oraz jako metoda oparta na dociekaniu. Kreator rozdziela te konteksty na poziomie logiki wyboru, żeby wybranie jednej opcji nie włączało przypadkowo drugiej.

## Zmiany w wersji 1.0.3

- poprawiono przewijanie podglądu po wyborze klas 4–8 i podstawy 2024 — krok podstawy otwiera początek treści dokumentu, przy sekcji informacji ogólnych;
- dodano logo Nowa Era po lewej stronie kreatora; logo jest elementem interfejsu i nie trafia do podglądu ani do PDF;
- dodano automatyczne renumerowanie opcjonalnych podrozdziałów metod uzupełniających i materiałów dydaktycznych w dokumentach klas 4–8;
- dodano kontrolki powiększania i pomniejszania podglądu dokumentu.
