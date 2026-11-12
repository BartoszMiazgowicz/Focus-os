export const EGO_IDS = ["closer", "builder", "observer"] as const;
export type EgoId = (typeof EGO_IDS)[number];

export interface Ego {
  id: EgoId;
  name: string;
  tagline: string;
  when: string;
  /** Short prompts shown on Today and in the briefing. */
  lines: string[];
  /** Used after a finished focus session / in summaries. */
  done: string[];
  /** Calm line for a day that did not go to plan. */
  reset: string;
}

export const EGOS: Record<EgoId, Ego> = {
  closer: {
    id: "closer",
    name: "The Closer",
    tagline: "Decyzja. Standard. Domknięcie.",
    when: "Sprzedaż, klienci, negocjacje, ważne decyzje",
    lines: [
      "Przygotuj argumenty. Potem wejdź do rozmowy.",
      "Nie potrzebujesz idealnego momentu. Potrzebujesz konkretnej decyzji.",
      "Najpierw dowieź wartość. Potem rozmawiaj o cenie.",
      "Jeden follow-up dziś jest wart więcej niż plan na dziesięć.",
      "Wiesz, co jest następnym ruchem. Wykonaj go.",
      "Klient kupuje pewność. Zacznij od własnej.",
    ],
    done: ["Domknięte. Następna sprawa.", "Zrobione na poziomie. Tak ma być.", "Ruch wykonany. Pozycja lepsza niż rano."],
    reset: "Słabszy dzień nie zmienia standardu. Jeden konkretny ruch i wracasz do gry.",
  },
  builder: {
    id: "builder",
    name: "The Builder",
    tagline: "Prototyp ponad teorię.",
    when: "Kod, AI, projekty, nauka technologii, eksperymenty",
    lines: [
      "Mniej teorii. Zbuduj działający prototyp.",
      "Błąd to informacja. Sprawdź hipotezę.",
      "Dzisiaj tworzysz coś, czego wczoraj nie umiałeś.",
      "Najmniejsza działająca wersja. Reszta to iteracje.",
      "Nie wiesz, czy zadziała? Świetnie — uruchom i zobacz.",
      "Dokumentacja poczeka. Kompilator powie prawdę szybciej.",
    ],
    done: ["Działa. Albo wiesz, czemu nie — też postęp.", "Kolejna iteracja za Tobą.", "Zbudowane. Teraz można to ulepszać."],
    reset: "Build się wysypał, nic nowego. Znajdź jedną rzecz do naprawy i ją napraw.",
  },
  observer: {
    id: "observer",
    name: "The Observer",
    tagline: "Najpierw zauważ. Potem działaj.",
    when: "Analiza, planowanie, nauka, refleksja",
    lines: [
      "Zanim zareagujesz, zauważ, co naprawdę się dzieje.",
      "Znajdź wzorzec. Nie zgaduj.",
      "Pięć minut obserwacji może oszczędzić godzinę chaosu.",
      "Które zadanie udajesz, że nie istnieje? Zacznij od niego.",
      "Błąd w zadaniu to wskazówka. Zapisz ją.",
      "Spokojnie. Jedno zadanie, pełna uwaga.",
    ],
    done: ["Zauważ, co zadziałało. Powtórz to jutro.", "Sesja zamknięta. Wzorzec coraz wyraźniejszy.", "Dobrze. Zapisz jedną obserwację, zanim uleci."],
    reset: "Ciekawe — co dokładnie dziś przeszkodziło? Jedna obserwacja, jedna korekta.",
  },
};

/** Deterministic pick so a line stays stable within a day instead of flickering on re-render. */
export const pickLine = (lines: string[], seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return lines[h % lines.length];
};
