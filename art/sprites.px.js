// Персонажи. Референсы в ref/ — вырезанные из присланных артов спрайты (фон убран,
// слегка сглажены медианным фильтром); здесь они переводятся в общую палитру игры.
include("palette.px.js")

const S = {
  kras: [56, 52], raya: [60, 32], afonya: [26, 56], strazh: [30, 58], nazar: [36, 58],
  obrada: [38, 50], yar: [27, 60], suri: [48, 50], r: [28, 46], k: [29, 46],
}
for (const [name, [w, h]] of Object.entries(S))
  sprite(name, { w, h, selout: "k", crop: true }, image(`ref/${name}.png`, 0, 0, { w, h, alpha: 150, palette: "kKwWebBnNcCypPgGoOdrRmaAi" }))
