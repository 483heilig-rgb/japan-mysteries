# Lafcadio Hearn — Between Worlds

A Russian-language, mobile-friendly introduction to Lafcadio Hearn for the Japan Mysteries travel project.

## Content and provenance

- Museum sources establish the biography, 443 days in Matsue, approximately five months in the surviving residence, the 1891 family relationship and formal marriage in 1896, and Setsu's literary assistance.
- Institutional sources supplement the American writings and Kumamoto/Kobe chronology.
- Primary works anchor the book summaries and Kwaidan retellings. Every factual component has source links; the complete source list is in `data.js` and on the page.
- Story summaries are original short Russian retellings; interpretive comments are marked as editorial interpretation. They are not quotations from Hearn.
- Jonathan Cott's *Wandering Ghost*, Kodansha International, 1992, and Paul Murray's *A Fantastic Journey*, 1993, are listed as further reading. Their complete texts were not available during preparation, and the page does not claim to have consulted them.
- The generated cover evokes a literary atmosphere; it is not a reconstruction of the surviving house. Historical photographs are identified separately and credited in the page.

## Implementation

Buildless HTML/CSS/JavaScript. No external JavaScript, analytics, accounts, or paid APIs at runtime. Bookmarks remain in browser local storage. MP3 narrations are bundled and identical for visitors. `audio-transcripts.json` contains the spoken scripts. The voice is a neural narration, not Hearn's voice.

`sw.js` caches this section only, using a `hearn-album-` cache namespace. The optional download control also caches the six audio tracks and three existing Atlas assets used by this section. External source pages still require internet. HTTP range requests are supported for cached audio.

## Visual assets

New generated assets: `assets/matsue-dusk.webp`, `assets/hoichi.webp`. Built-in ImageGen was used. Prompts are recorded in `image-prompts.md`.

Historical photos: Hearn (Frederick Gutekunst, 1889), Koizumi Setsu (unknown photographer, circa 1888), and the former residence in Matsue (irisgazer, 2019). Their Wikimedia Commons file pages are linked in the image credits. Files are locally bundled.

## Biography expansion

Life-stage and Japanese-city cards include optional expanded paragraphs. Research context and citations include Anastasia N. Salnikova’s journalism (2022) and Russia (2021) articles. The antique-motifs (2022) note uses the published abstract only. New copy is a short adapted summary, not a quotation. Existing audio remains a brief overview. Cache namespace advanced to v4.
