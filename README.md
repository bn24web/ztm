# 152 — tabliczka przystankowa

Dwa niezależne widoki: `wyjazd/` (110401) i `powrot/` (148602). Nazwa i kierunek są odczytywane z GTFS. Pełna tabela dzienna, wyróżnienie najbliższego planowego odjazdu, odliczanie i kalendarz. Wszystko w strefie Europe/Warsaw. Bez klucza API, GPS i dodatkowego serwera.

## Instalacja
1. Utwórz publiczne repozytorium `ztm` na GitHub z gałęzią `main`.
2. Wgraj **zawartość** tego katalogu, w tym ukryty katalog `.github`. Możesz użyć GitHub Desktop lub terminala: `git add .`, `git commit -m "Rozklad 152"`, `git push`.
3. W repozytorium wybierz **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Otwórz **Actions → Aktualizacja rozkładu i publikacja → Run workflow** na `main`. Pierwsza publikacja powinna nastąpić po udanym wykonaniu obu zadań.
5. Docelowo dla konta bn24web: `https://bn24web.github.io/ztm/wyjazd/` i `https://bn24web.github.io/ztm/powrot/`.

Harmonogram GitHub Actions: co 6 godzin (UTC), z możliwymi opóźnieniami; w nieaktywnych publicznych repozytoriach GitHub może wyłączyć harmonogram po 60 dniach. W razie błędu pobierania poprzednia opublikowana wersja pozostaje dostępna; ostrzeżenie po 36 h. Rozkłady są generowane maksymalnie na 11 dni, tylko w granicach dostępnego kalendarza GTFS. Nie są to prognozy GPS ani informacje o doraźnych odwołaniach. Po ostatnim odjeździe strona domyślnie wybiera kolejny dzień z kursami.

## Źródło danych
Miasto Stołeczne Warszawa (https://api.um.warszawa.pl/), przetworzone przez WarsawGTFS: https://mkuran.pl/gtfs/warsaw.zip. Data pobrania jest pokazywana w stopce. Kod filtruje dokładnie identyfikatory słupków z podanych linków WTP oraz linię 152; nie narzuca nazwy krańcówki, by nie ukrywać wariantów kursów.

## Lokalne uruchomienie
Python 3.11+: `python scripts/build.py` (opcjonalnie ścieżka do lokalnego pliku GTFS ZIP), następnie `python -m http.server 8000 --directory site` i http://localhost:8000/wyjazd/.

Test jednostkowy na syntetycznym GTFS: `python scripts/test_build.py`. Pakiet nie zawiera rzeczywistych godzin — zostaną pobrane podczas uruchomienia workflow.
