/* =========================================================
   NASTAVENÍ WEBU – tady se mění ceny, sezóny a kontakty.
   Po úpravě stačí soubor uložit a nahrát na hosting.
   ========================================================= */
window.CONFIG = {
  kontakt: {
    telefon: '+420 608 965 498',
    email: 'olbramovicerelax@gmail.com',
    whatsapp: '420608965498' // bez + a mezer
  },

  /* Odesílání rezervací e-mailem bez vlastního serveru:
     1) Na https://web3forms.com zadejte e-mail olbramovicerelax@gmail.com
     2) Přijde vám "Access Key" – vložte ho sem mezi uvozovky.
     Dokud je prázdný, formulář otevře předvyplněný e-mail v poště hosta. */
  web3formsKey: '',

  kapacita: {
    maxHoste: 6,      // dospělí + děti od 3 let
    maxMiminka: 1,    // děti do 3 let (postýlka)
    maxPsi: 2
  },

  prijezd: '15:00 – 18:00',
  odjezd: 'do 10:00',
  minNoci: 3,

  /* Hlavní sezóna: jen týdenní pobyty sobota – sobota.
     od = první sobota příjezdu, do = poslední sobota odjezdu */
  hlavniSezona: [
    { od: '2026-06-27', do: '2026-09-05', tyden: 19950 },
    { od: '2027-06-26', do: '2027-09-04', tyden: 19950 }
  ],

  /* Mimo sezónu */
  mimoSezonu: {
    tyden: 18200,         // 7 nocí
    nocVikend: 3000,      // noc z pátku, soboty, neděle, svátky, prázdniny
    nocVsedni: 2900       // noc z pondělí – čtvrtku
  },

  /* Období účtovaná víkendovou cenou (prázdniny). Svátky se počítají samy. */
  vikendovaObdobi: [
    { od: '2026-12-23', do: '2027-01-03', nazev: 'Vánoční prázdniny' },
    { od: '2027-12-23', do: '2028-01-02', nazev: 'Vánoční prázdniny' }
  ],

  poplatky: {
    zalohaProcent: 50,
    kauce: 3000,
    uklid: 1000,
    pesNoc: 125,
    elektrinaKwh: 12,
    plynKwh: 35
  }
};
