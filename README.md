# FOCUS OS

Osobisty system operacyjny: plan dnia, nauka do matury, Aiven, trening, sen i kontrola grania.
Aplikacja działa w przeglądarce i jako aplikacja na telefonie (PWA) — bez konta i bez serwera.

## Uruchomienie

```bash
npm install
npm run dev        # http://localhost:3000
```

Sprawdzenie jakości: `npm run typecheck`, `npm run lint`, `npm run build`.

## Wdrożenie (Vercel)

1. Zaimportuj repozytorium na vercel.com → **Add New… → Project**.
2. Ustawienia domyślne (Next.js) wystarczą — brak zmiennych środowiskowych.
3. Po wdrożeniu otwórz adres na telefonie i dodaj aplikację do ekranu głównego:
   - **iPhone (Safari):** Udostępnij → „Do ekranu początkowego”.
   - **Android (Chrome):** menu ⋮ → „Zainstaluj aplikację”.

PWA (instalacja, tryb offline, powiadomienia systemowe) wymaga HTTPS, więc działa po wdrożeniu,
a lokalnie tylko na `localhost`.

## Dane

- Wszystko zapisuje się lokalnie w przeglądarce (`localStorage`) — automatycznie, po każdej zmianie.
- Telefon i komputer mają **osobne** dane. Przenosisz je przez **Settings → Eksport / Import JSON**.
- Raz dziennie tworzona jest kopia w przeglądarce (trzy ostatnie), do przywrócenia w Settings.
- Wyczyszczenie danych przeglądarki usuwa dane aplikacji — rób eksport.

## Architektura

```
src/
  app/                 strony (Today, Planner, Tasks, Study, Aiven, Training, Gaming, Progress, Settings)
  components/
    ui/kit.tsx         komponenty bazowe (Button, Modal/bottom sheet, pola formularzy, paski postępu)
    shell/             nawigacja, alter ego, powiadomienia, providers
    focus/             timer sesji skupienia (pełny ekran)
    plan/ today/ tasks/
  lib/
    schema.ts          model danych w Zod — jedno źródło prawdy dla typów i walidacji importu
    defaults.ts        domyślny szablon tygodnia i lista tematów
    storage.ts         StorageAdapter + wersjonowanie, migracje, kopie
    store.ts           stan (Zustand + Immer), automatyczny zapis
    actions.ts         wszystkie zmiany danych i zasady XP
    logic.ts           czyste funkcje: plan dnia, przesuwanie bloków, limity, raport tygodnia
    reminders.ts       przypomnienia w aplikacji i powiadomienia systemowe
public/sw.js           service worker (offline + instalacja)
```

Podmiana `localStorage` na bazę danych wymaga tylko nowej implementacji `StorageAdapter`
w `src/lib/storage.ts`. Zmiana struktury danych: podbij `CURRENT_VERSION` i dodaj krok w `migrations`.

## Ograniczenia tej wersji

- Brak synchronizacji między urządzeniami (dane są lokalne).
- Przypomnienia działają, gdy aplikacja jest otwarta lub w tle; przy zamkniętej aplikacji
  potrzebny byłby serwer push.
- Czas grania jest liczony z ręcznego timera i dziennika — aplikacja nie wykrywa gier i niczego nie blokuje.
