import type { CategoryId } from "./categories";
import type { Block, Data, SubjectId, Topic } from "./schema";
import { dataSchema } from "./schema";

type Row = [start: string, end: string, category: CategoryId, title: string];

const MORNING = "Poranna rutyna";
const EVENING = "Rutyna wieczorna";

const WEEK: Record<number, Row[]> = {
  // Tuesday
  2: [
    ["07:00", "08:00", "routine", MORNING],
    ["08:00", "09:30", "math", "Matematyka"],
    ["09:30", "09:45", "break", "Przerwa"],
    ["09:45", "11:00", "code", "Programowanie / AI"],
    ["11:00", "12:00", "aiven", "Aiven / biznes"],
    ["12:00", "13:00", "meal", "Obiad i odpoczynek"],
    ["13:00", "15:00", "gym", "Siłownia"],
    ["15:00", "16:00", "recovery", "Regeneracja"],
    ["16:00", "16:30", "english", "Angielski"],
    ["16:30", "17:30", "career", "Kariera / CV / oferty"],
    ["17:30", "19:00", "free", "Czas wolny"],
    ["19:00", "21:00", "gaming", "Gry"],
    ["21:00", "22:00", "meal", "Kolacja i spokojny czas"],
    ["22:00", "23:00", "routine", EVENING],
  ],
  // Wednesday
  3: [
    ["07:00", "08:00", "routine", MORNING],
    ["08:00", "09:30", "math", "Matematyka"],
    ["09:30", "10:00", "english", "Angielski"],
    ["10:00", "11:30", "code", "Programowanie / AI"],
    ["11:30", "12:00", "break", "Przerwa"],
    ["12:00", "13:00", "aiven", "Aiven"],
    ["13:00", "14:00", "meal", "Obiad"],
    ["14:00", "15:00", "career", "Szukanie pracy / portfolio"],
    ["15:00", "17:00", "free", "Spacer / odpoczynek / sprawy prywatne"],
    ["17:00", "18:00", "code", "Projekt praktyczny"],
    ["18:00", "19:00", "meal", "Kolacja"],
    ["19:00", "21:00", "gaming", "Gry"],
    ["21:00", "22:00", "free", "Spokojny czas"],
    ["22:00", "23:00", "routine", EVENING],
  ],
  // Thursday
  4: [
    ["07:00", "08:00", "routine", MORNING],
    ["08:00", "09:30", "math", "Matematyka"],
    ["09:30", "09:45", "break", "Przerwa"],
    ["09:45", "11:15", "code", "Programowanie / AI"],
    ["11:15", "12:15", "aiven", "Aiven"],
    ["12:15", "13:00", "meal", "Obiad"],
    ["13:00", "15:00", "gym", "Siłownia"],
    ["15:00", "16:00", "recovery", "Regeneracja"],
    ["16:00", "16:30", "english", "Angielski"],
    ["16:30", "18:00", "aiven", "Portfolio / Aiven"],
    ["18:00", "19:00", "meal", "Kolacja i odpoczynek"],
    ["19:00", "21:00", "gaming", "Gry"],
    ["21:00", "22:00", "free", "Spokojny czas"],
    ["22:00", "23:00", "routine", EVENING],
  ],
  // Friday
  5: [
    ["07:00", "08:00", "routine", MORNING],
    ["08:00", "09:30", "math", "Matematyka"],
    ["09:30", "10:00", "english", "Angielski"],
    ["10:00", "11:30", "code", "Programowanie / AI"],
    ["11:30", "12:30", "aiven", "Aiven / klienci"],
    ["12:30", "13:30", "meal", "Obiad"],
    ["13:30", "15:30", "gym", "Siłownia"],
    ["15:30", "16:30", "recovery", "Regeneracja"],
    ["16:30", "18:00", "aiven", "Biznes / portfolio / projekt"],
    ["18:00", "19:00", "meal", "Kolacja"],
    ["19:00", "21:00", "gaming", "Gry"],
    ["21:00", "22:00", "free", "Spokojny czas"],
    ["22:00", "23:00", "routine", EVENING],
  ],
  // Saturday
  6: [
    ["07:00", "08:00", "routine", MORNING],
    ["08:00", "09:30", "math", "Matematyka"],
    ["09:30", "10:00", "english", "Angielski"],
    ["10:00", "11:30", "code", "Projekt praktyczny / AI"],
    ["11:30", "12:30", "free", "Czas wolny"],
    ["12:30", "13:30", "meal", "Obiad"],
    ["13:30", "15:30", "gym", "Siłownia"],
    ["15:30", "17:00", "recovery", "Regeneracja"],
    ["17:00", "18:30", "free", "Wolne / znajomi / hobby"],
    ["18:30", "19:00", "meal", "Kolacja"],
    ["19:00", "21:00", "gaming", "Gry"],
    ["21:00", "22:00", "free", "Spokojny czas"],
    ["22:00", "23:00", "routine", EVENING],
  ],
  // Sunday — Wrocław
  0: [
    ["07:30", "08:30", "routine", MORNING],
    ["08:30", "09:00", "meal", "Śniadanie"],
    ["09:00", "10:00", "free", "Spacer / kawa"],
    ["10:00", "13:00", "relationship", "Czas z dziewczyną"],
    ["13:00", "14:00", "meal", "Obiad"],
    ["14:00", "18:00", "relationship", "Wspólne wyjście / odpoczynek"],
    ["18:00", "19:00", "meal", "Kolacja"],
    ["19:00", "21:30", "relationship", "Czas razem"],
    ["21:30", "22:00", "life", "Przygotowanie do kolejnego dnia / powrót"],
    ["22:00", "23:00", "routine", EVENING],
  ],
  // Monday — Wrocław
  1: [
    ["07:00", "08:00", "routine", MORNING],
    ["08:00", "08:30", "meal", "Śniadanie"],
    ["08:30", "10:30", "gym", "Siłownia"],
    ["10:30", "11:30", "recovery", "Regeneracja"],
    ["11:30", "12:15", "math", "Matematyka — powtórka"],
    ["12:15", "13:00", "english", "Angielski"],
    ["13:00", "14:00", "meal", "Obiad"],
    ["14:00", "19:00", "relationship", "Czas z dziewczyną"],
    ["19:00", "20:00", "meal", "Kolacja"],
    ["20:00", "21:30", "relationship", "Czas razem / powrót"],
    ["21:30", "22:00", "life", "Przygotowanie do kolejnego dnia"],
    ["22:00", "23:00", "routine", EVENING],
  ],
};

export const defaultTemplate = (): Record<string, Block[]> =>
  Object.fromEntries(
    Object.entries(WEEK).map(([day, rows]) => [
      day,
      rows.map(([start, end, category, title], i) => ({ id: `d${day}-${i}`, start, end, category, title })),
    ]),
  );

/** Days spent in Wrocław (day-of-week indexes). Purely a label in the planner. */
export const WROCLAW_DAYS = [0, 1];

export const MORNING_STEPS = ["Pobudka", "Woda", "Higiena", "Światło dzienne", "Pościelone łóżko", "5–10 min mobilizacji", "Śniadanie", "Bez scrollowania i gier"];
export const EVENING_STEPS = ["Koniec gier i pracy", "Higiena / prysznic", "Ubrania na jutro", "3 priorytety na jutro", "Książka lub spokojne czytanie", "Sen o 23:00"];

/** Syllabus outline — a starting structure the user can edit, not a statement of what was learned. */
const SYLLABUS: Record<SubjectId, Record<string, string[]>> = {
  math: {
    "Liczby i wyrażenia": ["Logarytmy i potęgi", "Wartość bezwzględna", "Wielomiany — dzielenie, tw. Bézouta", "Wyrażenia wymierne", "Dowody algebraiczne"],
    "Równania i nierówności": ["Równania wielomianowe", "Równania i nierówności z parametrem", "Wzory Viète'a", "Nierówności wymierne", "Układy równań"],
    Funkcje: ["Własności i przekształcenia wykresów", "Funkcja kwadratowa z parametrem", "Funkcja wykładnicza i logarytmiczna"],
    Ciągi: ["Ciąg arytmetyczny i geometryczny", "Granica ciągu", "Szereg geometryczny"],
    Trygonometria: ["Tożsamości i wzory redukcyjne", "Równania trygonometryczne", "Nierówności trygonometryczne", "Tw. sinusów i cosinusów"],
    Planimetria: ["Trójkąty i czworokąty", "Okręgi — kąty, styczne", "Dowody geometryczne"],
    "Geometria analityczna": ["Prosta i odległości", "Równanie okręgu", "Wektory"],
    Stereometria: ["Graniastosłupy i ostrosłupy", "Bryły obrotowe", "Przekroje"],
    "Kombinatoryka i prawdopodobieństwo": ["Kombinatoryka", "Prawdopodobieństwo warunkowe i całkowite", "Schemat Bernoulliego"],
    "Rachunek różniczkowy": ["Granica i ciągłość funkcji", "Pochodna i styczna", "Monotoniczność i ekstrema", "Zadania optymalizacyjne"],
  },
  english: {
    Słuchanie: ["Rozumienie ze słuchu — wybór wielokrotny", "Dobieranie wypowiedzi"],
    Czytanie: ["Tekst z lukami", "Wybór wielokrotny", "Dobieranie nagłówków i zdań"],
    "Środki językowe": ["Transformacje zdań", "Słowotwórstwo", "Tłumaczenie fragmentów zdań", "Test luk"],
    Gramatyka: ["Czasy — przegląd", "Tryby warunkowe", "Strona bierna", "Mowa zależna", "Inwersja i emfaza", "Czasowniki modalne"],
    Pisanie: ["Rozprawka", "Artykuł", "List formalny"],
    Słownictwo: ["Słownictwo tematyczne B2", "Kolokacje i phrasal verbs"],
  },
  inf04: {
    "Aplikacja konsolowa": ["Algorytmy sortowania i wyszukiwania", "Programowanie obiektowe — klasy, dziedziczenie", "Praca na tablicach i kolekcjach"],
    "Aplikacja desktopowa": ["Formularze i kontrolki", "Zdarzenia i walidacja danych"],
    "Aplikacja mobilna": ["Układ interfejsu", "Obsługa zdarzeń"],
    "Dokumentacja i testy": ["Komentarze i dokumentacja kodu", "Zrzuty ekranu i opis rozwiązania", "Testowanie aplikacji"],
    "Organizacja egzaminu": ["Praca z arkuszem pod presją czasu", "Pełny próbny arkusz na czas"],
  },
};

export const defaultTopics = (): Topic[] =>
  (Object.entries(SYLLABUS) as [SubjectId, Record<string, string[]>][]).flatMap(([subject, sections]) =>
    Object.entries(sections).flatMap(([section, titles], si) =>
      titles.map((title, ti) => ({
        id: `${subject}-${si}-${ti}`,
        subject,
        section,
        title,
        mastery: 0,
        status: "new" as const,
        tasksDone: 0,
        notes: "",
        mistakes: "",
        reviewStage: 0,
      })),
    ),
  );

export const defaultData = (): Data => dataSchema.parse({ settings: {}, template: defaultTemplate(), topics: defaultTopics() });
