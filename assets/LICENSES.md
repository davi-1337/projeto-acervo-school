# Licenças das imagens e das fontes

Todas as gravuras desta obra vêm de acervos de **domínio público** ou de licenças
abertas, e foram **reprocessadas** (escala de cinza, níveis, tinta, papel, dithering
ordenado) para integrar a peça. Cada arquivo em `assets/source/` corresponde a uma
linha abaixo. As versões usadas na obra têm no máximo 1100 px no lado maior,
reduzidas a partir dos originais.

| arquivo | obra | autor · ano | licença | fonte |
|---|---|---|---|---|
| `piranesi_torre.jpg` | Le Carceri d’Invenzione, prancha III — A Torre Redonda | Giovanni Battista Piranesi · 1761 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AGiovanni_Battista_Piranesi_-_Le_Carceri_d'Invenzione_-_Second_Edition_-_1761_-_03_-_The_Round_Tower.jpg) |
| `piranesi_arco.jpg` | Le Carceri d’Invenzione, prancha XIV — O Arco Gótico | Giovanni Battista Piranesi · 1761 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AGiovanni_Battista_Piranesi_-_Le_Carceri_d'Invenzione_-_Second_Edition_-_1761_-_14_-_The_Gothic_Arch.jpg) |
| `piranesi_poco.jpg` | Le Carceri d’Invenzione, prancha XIII — O Poço | Giovanni Battista Piranesi · 1761 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AGiovanni_Battista_Piranesi_-_Le_Carceri_d'Invenzione_-_Second_Edition_-_1761_-_13_-_The_Well.jpg) |
| `goya_cao.jpg` | O Cão (das Pinturas Negras) | Francisco de Goya · 1819–1823 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AGoya_Dog.jpg) |
| `goya_sono.jpg` | O sono da razão produz monstros — Los Caprichos, n.º 43 | Francisco de Goya · 1799 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AFrancisco_Jos%C3%A9_de_Goya_y_Lucientes_-_The_sleep_of_reason_produces_monsters_(No._43)%2C_from_Los_Caprichos_-_Google_Art_Project.jpg) |
| `dore_caronte.jpg` | Caronte — Inferno de Dante, Canto III | Gustave Doré · 1861 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AGustave_Dor%C3%A9_-_Dante_Alighieri_-_Inferno_-_Plate_9_(Canto_III_-_Charon).jpg) |
| `redon_olho.jpg` | O olho, como um balão bizarro, dirige-se ao infinito | Odilon Redon · 1882 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3ARedon_-_The_Eye%2C_Like_a_Strange_Balloon_Moves_Towards_Infinity%2C_plate_one_from_To_Edgar_Poe%2C_1920.1570.jpg) |
| `friedrich_monge.jpg` | O Monge à Beira-Mar | Caspar David Friedrich · c. 1808–1810 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3ADer_M%C3%B6nch_am_Meer_(Caspar_David_Friedrich)-WUS03182.jpg) |
| `bosch_inferno.jpg` | O Jardim das Delícias Terrenas — painel do inferno | Hieronymus Bosch · c. 1490–1510 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AHieronymus_Bosch_-_The_Garden_of_Earthly_Delights_-_Hell.jpg) |
| `vesalius_figura.jpg` | Figura muscular, De humani corporis fabrica | Andreas Vesalius · Wellcome Collection · 1543 | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File%3AVesalius_%22De_humani...%22%2C_1543%3B_figure_Wellcome_L0014416.jpg) |
| `agoty_anatomia.jpg` | Anatomie générale des viscères | Jacques-Fabien Gautier d’Agoty · Wellcome Collection · século XVIII | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File%3AJ.F._Gautier_D'Agoty%2C_Anatomie_generale_des_Wellcome_L0021128.jpg) |
| `durer_melancolia.jpg` | Melencolia I | Albrecht Dürer · 1514 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AAlbrecht_D%C3%BCrer_-_Melencolia_I_-_Google_Art_Project_(_AGDdr3EHmNGyA).jpg) |
| `atget_sala.jpg` | A Embaixada da Áustria, 57 Rue de Varenne | Eugène Atget · Getty Museum · c. 1900 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AEug%C3%A8ne_Atget%2C_The_Austrian_Embassy%2C_57_Rue_de_Varenne_-_Getty_Museum.jpg) |
| `vanitas.jpg` | Memento mori (da série de vanitas) | anônimo · Rijksmuseum · século XVII | CC0 | [Commons](https://commons.wikimedia.org/wiki/File%3AMemento_mori%2C_RP-P-OB-7581.jpg) |

## Fontes tipográficas

| família | uso na obra | licença |
|---|---|---|
| **Cormorant Garamond** (300, 600, 300 itálico) | títulos, voz, legendas | SIL Open Font License 1.1 |
| **JetBrains Mono** (200, 400, 700) | visor, fichas técnicas, etiquetas | SIL Open Font License 1.1 |

Baixadas de `fonts.googleapis.com` e servidas localmente em `assets/fonts/`
(com `assets/fonts/fonts.css` gerado por `tools/fetch-fonts.mjs`). A SIL OFL permite
uso, estudo, modificação e redistribuição, inclusive embutida em obras.

## Como este material foi obtido

```bash
node tools/fetch-assets.mjs search     # lista candidatos por consulta
node tools/fetch-assets.mjs download   # baixa os escolhidos para assets/source/
node tools/fetch-fonts.mjs             # baixa as duas famílias e gera o CSS local
node tools/manifest.mjs                # recompõe este arquivo a partir do Commons
```

O restante da obra — texto, som, imagem em movimento, interface — é autoral e não
depende de nenhum arquivo de terceiros.
