# Dům u Slunce a Vína – web

Statický web (HTML + CSS + JS), funguje na jakémkoli hostingu bez databáze.

## Co nahrát na hosting
Vše kromě složky `img/orig/` (to jsou původní velké fotky, web je nepoužívá).

```
index.html
ochrana-osobnich-udaju.html
css/  js/  fonts/  img/  (bez img/orig)
```

## Úprava obsazenosti – `js/obsazenost.js`
Každá rezervace je jeden řádek:

```js
{ od: '2026-11-06', do: '2026-11-09' },
```

`od` = den příjezdu, `do` = den odjezdu. **Ukázkové řádky před spuštěním smažte.**

## Ceny, sezóny, kontakty – `js/config.js`
- `hlavniSezona` – termíny a týdenní cena léta (každý rok přidat řádek)
- `mimoSezonu` – cena za noc ve všední den / o víkendu a týdenní cena
- `vikendovaObdobi` – prázdniny účtované víkendovou cenou (státní svátky se počítají samy)
- `poplatky` – kauce, úklid, pes, energie

## Odesílání rezervací
Bez nastavení se po odeslání formuláře hostovi otevře předvyplněný e-mail nebo WhatsApp.

Aby poptávky chodily rovnou do schránky:
1. Na https://web3forms.com zadejte `olbramovicerelax@gmail.com` a získejte Access Key (zdarma).
2. Vložte ho do `js/config.js` do `web3formsKey: '...'`.

## Mapa výletů
Souřadnice domu i výletů jsou v `js/main.js` (konstanty `HOME` a `trips`).
Mapa používá knihovnu Leaflet (uloženou ve `vendor/leaflet/`) a podklady OpenStreetMap.
