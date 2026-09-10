# Roadmap — Cops&Robbers

Aggiornata il 10 settembre 2026.

## 1. UI: plancia CCTV e rifiniture

La scena del minigioco è approvata come base. Il prossimo intervento riguarda l’interfaccia che la accompagna.

- Migliorare gerarchia e leggibilità di saldo, puntata, moltiplicatore raggiunto e prossimo obiettivo.
- Rifinire feedback e gerarchia dei comandi Corri! e Incassa durante le animazioni.
- Ridurre l’ingombro degli overlay sulla scena, soprattutto su mobile.
- Rifinire percorso, storico e riepiloghi di vittoria/perdita con spaziature e tipografia coerenti.
- Verificare touch, tastiera, contrasto, movimento ridotto e assenza di sovrapposizioni su desktop/mobile.

Primo intervento UI completato: logo grafico, presentazione iniziale con barra, puntata centrata e rimozione delle informazioni sul tratto. Aggiunti i temi Distretto 87 e Neon Tokyo, alternati per corsa senza mescolare tile.

La preparazione tecnica è completata: CSS consolidato per breakpoint, scala tipografica, rendering UI suddiviso e lookup DOM memorizzati, gestione HMR e risorse corretta, formatter e controlli CI configurati. Implementato il primo redesign CCTV dalla reference: monitor di sorveglianza, schede CAM collegate, puntata su display, allerta a semaforo, probabilità segmentata e comando Corri!. Prossimo intervento: rifinire la plancia con feedback reali, soprattutto proporzioni e interazione mobile. La revisione dell’elicottero resta separata.

## 2. Da revisionare: fuga in elicottero

Stato: sospesa nel prodotto, da riprogettare. Nessun modello, ramo di animazione, parametro bonus o indicatore UI inattivo rimane nel codice distribuito.

La versione precedente permetteva l’estrazione dal quinto incrocio: arrivo del complice, discesa della corda, recupero del ladro e decollo; al dodicesimo partiva automaticamente. Un bonus dichiarato dell’8% sul valore base era già incluso nel totale pagabile, senza aumentarlo ulteriormente.

Ora ogni incasso usa il vicolo, incluso quello automatico al dodicesimo. Probabilità, moltiplicatori, saldi e RTP restano identici.

Prima di reintrodurre la funzione:

- Definire se deve essere una variante visiva della fuga o una meccanica con una scelta del giocatore.
- Rivalutare soglia di accesso, ruolo del complice, durata e leggibilità dell’estrazione nella scena isometrica.
- Decidere se abbia senso un bonus: evitare vantaggi presentati come aggiuntivi quando sono già inclusi nel totale. Qualsiasi modifica economica richiede formule, UI e test coerenti.
- Integrare l’animazione nella UI rivista, con percorso accessibile a movimento ridotto e reset completo.
- Verificare incasso singolo, ultimo incrocio, riavvio e assenza di modifiche involontarie all’RTP.

Questa descrizione conserva l’intento della funzione per la revisione futura, senza mantenere codice dormiente.

## 3. Profilazione sul dispositivo reale

Misurare frame time e compilazione degli shader sulla UHD Graphics, soprattutto quando le tile entrano/escono. I materiali stabili ora evitano aggiornamenti ripetuti e `alphaHash` è attivo solo durante la dissolvenza della base. I controlli automatici WebGL usano SwiftShader e non quantificano il guadagno sulla GPU fisica.
