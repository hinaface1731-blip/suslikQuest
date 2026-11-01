// Персонажи. Референсы в ref/ готовит prep_refs.py: вырезает сусликов из присланных
// артов и уменьшает их, не теряя глаз; здесь они переводятся в общую палитру игры.
include("palette.px.js")

const S = {
  kras: [60, 56], raya: [64, 34], afonya: [27, 60], strazh: [32, 62], nazar: [39, 62],
  obrada: [41, 54], yar: [29, 64], suri: [50, 52], kr: [70, 54],
}
for (const [name, [w, h]] of Object.entries(S))
  sprite(name, { w, h, selout: "k", crop: true }, image(`ref/${name}.png`, 0, 0, { w, h, alpha: 128, palette: "KwWbBnNcCypPgGoOdrRmaAi" }))
