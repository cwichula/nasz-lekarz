# Strona internetowa NZOZ „Nasz-Lekarz”

Statyczna strona informacyjna przychodni podstawowej opieki zdrowotnej (POZ, NFZ)
w Jeleniej Górze, al. Wojska Polskiego 57 (I piętro). Adres docelowy: https://nasz-lekarz.info

- generator: [Eleventy 3](https://www.11ty.dev/) i szablony Nunjucks (`.njk`);
- wynik (gotowa strona) trafia do katalogu `_site/`;
- strona nie używa cookies, zewnętrznych czcionek, map ani skryptów śledzących;
- pełna specyfikacja (mapa strony, zasady prawne, zakaz reklamy): `docs/specyfikacja.md`.

Lista rzeczy do zrobienia: [TODO.md](TODO.md).

## Wymagania

- Node.js 20 lub nowszy (https://nodejs.org);
- do generowania obrazów (`npm run images`) i zrzutów ekranu: Google Chrome lub Microsoft Edge.

## Polecenia

| Polecenie | Co robi |
|---|---|
| `npm install` | instaluje zależności (raz, po pobraniu projektu) |
| `npm start` | podgląd na żywo pod adresem http://localhost:8080 (odświeża się po zapisaniu pliku) |
| `npm run build` | buduje gotową stronę do katalogu `_site/` |
| `npm test` | uruchamia testy (`tests/*.test.js`) |
| `npm run images` | generuje na nowo `src/assets/img/og-image.png` (1200×630) i `src/static/apple-touch-icon.png` (180×180) – np. po zmianie numeru rejestracji lub logo |

## Jak zmienić dane

Dane przychodni są w jednym miejscu – nie trzeba szukać ich w treści stron.
Po każdej zmianie: `npm run build` i ponowne wysłanie `_site/` na serwer.

| Plik | Co zawiera |
|---|---|
| `src/_data/clinic.json` | nazwa, adres, telefony (`display` – jak wyświetlać, `e164` – do linku, np. `+48756422550`), godziny przychodni, rejestracji i pobrań, dane rejestrowe (NIP, REGON, RPWDL), nocna pomoc |
| `src/_data/team.json` | lekarze i pielęgniarki: tytuł, imię i nazwisko, specjalizacja, nr PWZ, godziny przyjęć (`days`: 1 = poniedziałek … 5 = piątek), zdjęcie (tylko za pisemną zgodą) |
| `src/_data/faq/*.json` | pytania i odpowiedzi – jeden plik na temat (`krew`, `zapisy`, `recepty`, `ogolne` …). Każde pytanie: `id`, `q` (pytanie), `a` (odpowiedź), opcjonalnie `link` |
| `src/_data/nav.json` | pozycje menu |

Wskazówki:
- nie wpisuj numerów telefonów ani godzin bezpośrednio w treść stron – szablony pobierają je z `clinic.json`;
- nowy plik w `src/_data/faq/` pojawi się automatycznie na stronie `/pytania/`
  (nazwę nagłówka tematu dopisz w `topicNames` w `src/pytania/index.njk`);
- logo: `src/_includes/partials/logo.njk` i `src/static/favicon.svg`; po zmianie uruchom `npm run images`;
- zdjęcia przychodni: wgraj do `src/assets/img/` (format WebP lub JPG, szerokość do 1600 px).

## Do uzupełnienia przed publikacją

Miejsca do uzupełnienia są oznaczone w plikach. Aktualną listę pokaże polecenie:

```
grep -rn "DO UZUPEŁNIENIA\|DO POTWIERDZENIA\|\"verified\": false" src
```

a fakty prawne do sprawdzenia: `grep -rn "DO WERYFIKACJI" src`.

Najważniejsze (stan w chwili przygotowania projektu):
- **dane rejestrowe** w `clinic.json` → `registry` (forma prawna, NIP, REGON, nr księgi RPWDL, KRS) i pełna nazwa podmiotu (`legalName`);
- **inspektor ochrony danych** (`dpo`) i adres e-mail przychodni (`email`);
- **numery PWZ lekarzy** i docelowy grafik w `team.json` (obecny grafik jest tymczasowy); imiona i nazwiska pielęgniarek;
- godziny pracy biura (`[DO POTWIERDZENIA]`), godziny pobrań krwi (wstępne), godziny szczepień i EKG;
- zasady wizyt domowych (`homeVisits.verified: false`) i lista obsługiwanych miejscowości;
- punkt nocnej i świątecznej opieki zdrowotnej dla Jeleniej Góry (`nightCare`, `verified: false`) – sprawdzić w wyszukiwarce NFZ;
- współrzędne geograficzne (`geo`), dojazd, parking, dostępność budynku (winda, podjazd);
- czy przychodnia przyjmuje dzieci (FAQ „Ogólne”, strona „Jak się zapisać”);
- **dwie dodatkowe domeny** – przekierowania w `src/static/.htaccess` (zakomentowane);
- **logo** – obecne jest tymczasowe (dawne logo miało formę krzyża); **zdjęcia przychodni**;
- rejestracja internetowa – osobny, późniejszy etap (`onlineRegistrationUrl`);
- dokumenty PDF do pobrania (`src/pliki/`): deklaracje, upoważnienie, standardy ochrony małoletnich.

## Publikacja na OVHcloud (FTP/SFTP)

1. Zbuduj stronę: `npm run build`.
2. Dane do FTP znajdziesz w panelu OVHcloud: *Web Cloud → Hosting → (Twój hosting) → FTP-SSH*
   (serwer, login; hasło można tam ustawić na nowo).
3. W programie FileZilla połącz się z serwerem (najlepiej protokołem SFTP, jeśli Twój plan go obejmuje; inaczej FTP z TLS).
4. Włącz pokazywanie plików ukrytych: *Serwer → Wymuś pokazywanie ukrytych plików*.
   Plik `.htaccess` zaczyna się kropką i bez tej opcji łatwo go pominąć.
5. Skopiuj **zawartość** katalogu `_site/` (nie sam katalog) do katalogu `www/` na serwerze. Nadpisz stare pliki.
6. W panelu OVHcloud sprawdź, że certyfikat SSL (Let's Encrypt) jest włączony dla `nasz-lekarz.info` i `www.nasz-lekarz.info`.
7. Sprawdź w przeglądarce: `http://nasz-lekarz.info`, `http://www.nasz-lekarz.info` i `https://www.nasz-lekarz.info`
   powinny przekierować na `https://nasz-lekarz.info/`; nieistniejący adres powinien pokazać stronę „Nie ma takiej strony”.

Plik `src/static/.htaccess` ustawia: przekierowania 301 (https, adres bez www), stronę błędu 404,
nagłówki bezpieczeństwa (CSP, HSTS i inne), cache i kompresję.
Plik `src/static/_headers` to odpowiednik dla hostingu Netlify / Cloudflare Pages (alternatywa).

## SEO poza stroną

- **Profil Firmy w Google (Google Business Profile)**: kategoria główna „Przychodnia lekarska”;
  godziny przychodni; główny numer = rejestracja; link do strony; prawdziwe zdjęcia; atrybuty dostępności.
  Opinie zbieramy tylko tam i odpowiadamy na nie rzeczowo – nie przenosimy ich na stronę (zakaz reklamy).
- **NAP** (nazwa, adres, telefon) wszędzie zapisany identycznie jak na stronie:
  NZOZ „Nasz-Lekarz”, al. Wojska Polskiego 57, 58-500 Jelenia Góra, tel. rejestracji z `clinic.json`.
- **Google Search Console**: dodać domenę, zgłosić mapę strony `https://nasz-lekarz.info/sitemap.xml`.
- **Bing Webmaster Tools** i **Bing Places**, **Apple Business Connect** (Mapy Apple).
- Katalogi i rejestry: wyszukiwarka placówek NFZ, RPWDL, Znany Lekarz, Panorama Firm, pkt.pl, Facebook –
  te same dane NAP.
- Po 4–8 tygodniach: przegląd zapytań w Search Console.

## Przegląd roczny

Raz w roku (oraz po każdej zmianie przepisów lub personelu) sprawdź:
- telefony, godziny, grafik lekarzy i skład zespołu;
- miejsca oznaczone `DO WERYFIKACJI` (zasady NFZ, szczepienia – np. link do Programu Szczepień Ochronnych na nowy rok, leki bezpłatne);
- punkt nocnej i świątecznej opieki zdrowotnej;
- aktualność dokumentów PDF, polityki prywatności, deklaracji dostępności i standardów ochrony małoletnich (data przeglądu);
- profil Google i wpisy w katalogach – czy dane są zgodne ze stroną;
- odnowienie domen i hostingu (najlepiej z autoodnowieniem).
