# osecs benchmarks

Scenarios from [abeimler/ecs_benchmark](https://github.com/abeimler/ecs_benchmark) ported to osecs.
Each row reports the **median** wall time of one operation at the given entity count, plus the per-entity cost. Lower is faster.

### Environment

- Date: `2026-05-03T18:09:29.302Z`
- Runtime: `node 24.3.0 / bun 1.3.11`
- Platform: `linux x64`
- CPU: AMD Ryzen 7 8700F (8-core)

Reproduce with `bun run benchmarks/bench.ts && bun run benchmarks/format.ts`.

## CreateEntities

Time to create N entities, each with 3 components (Position, Direction, Comflabulation).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 2.75us | 2.75us |
| 4 | 6.65us | 1.66us |
| 8 | 13.61us | 1.70us |
| 16 | 20.59us | 1.29us |
| 32 | 19.29us | 603ns |
| 64 | 38.35us | 599ns |
| 256 | 146.31us | 572ns |
| 1.0K | 682.56us | 667ns |
| 4.1K | 2.80ms | 682ns |
| 16.4K | 17.44ms | 1.06us |
| 65.5K | 108.21ms | 1.65us |

## DestroyEntities

Time to destroy N pre-created entities (includes graveyard processing on world.run).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 2.14us | 2.14us |
| 4 | 2.21us | 554ns |
| 8 | 2.91us | 364ns |
| 16 | 4.51us | 282ns |
| 32 | 8.43us | 263ns |
| 64 | 15.27us | 239ns |
| 256 | 56.15us | 219ns |
| 1.0K | 255.83us | 250ns |
| 4.1K | 1.05ms | 256ns |
| 16.4K | 4.82ms | 294ns |
| 65.5K | 25.97ms | 396ns |

## UnpackOneComponent

Iterate N entities once and read one component per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 390ns | 390ns |
| 4 | 260ns | 65ns |
| 8 | 310ns | 39ns |
| 16 | 470ns | 29ns |
| 32 | 820ns | 26ns |
| 64 | 1.39us | 22ns |
| 256 | 4.87us | 19ns |
| 1.0K | 19.74us | 19ns |
| 4.1K | 91.37us | 22ns |
| 16.4K | 795.47us | 49ns |
| 65.5K | 3.56ms | 54ns |

## UnpackTwoComponents

Iterate N entities once and read two components per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 270ns | 270ns |
| 4 | 270ns | 68ns |
| 8 | 370ns | 46ns |
| 16 | 560ns | 35ns |
| 32 | 930ns | 29ns |
| 64 | 1.65us | 26ns |
| 256 | 5.71us | 22ns |
| 1.0K | 28.80us | 28ns |
| 4.1K | 127.87us | 31ns |
| 16.4K | 1.51ms | 92ns |
| 65.5K | 7.59ms | 116ns |

## UnpackThreeComponents

Iterate N entities once and read three components per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 430ns | 430ns |
| 4 | 270ns | 68ns |
| 8 | 620ns | 78ns |
| 16 | 590ns | 37ns |
| 32 | 1.01us | 32ns |
| 64 | 1.77us | 28ns |
| 256 | 6.36us | 25ns |
| 1.0K | 29.07us | 28ns |
| 4.1K | 142.70us | 35ns |
| 16.4K | 2.05ms | 125ns |
| 65.5K | 6.26ms | 96ns |

## RemoveAddComponent

For each of N entities, remove and re-add a component (then flush via world.run).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 270ns | 270ns |
| 4 | 390ns | 98ns |
| 8 | 530ns | 66ns |
| 16 | 940ns | 59ns |
| 32 | 1.74us | 54ns |
| 64 | 3.57us | 56ns |
| 256 | 14.45us | 56ns |
| 1.0K | 57.62us | 56ns |
| 4.1K | 473.26us | 116ns |
| 16.4K | 1.96ms | 120ns |

## SystemsUpdate

One world.run with two systems (Movement + Data) on N homogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 380ns | 380ns |
| 4 | 380ns | 95ns |
| 8 | 530ns | 66ns |
| 16 | 780ns | 49ns |
| 32 | 1.44us | 45ns |
| 64 | 2.60us | 41ns |
| 256 | 9.48us | 37ns |
| 1.0K | 50.34us | 49ns |
| 4.1K | 220.85us | 54ns |
| 16.4K | 2.07ms | 126ns |
| 65.5K | 12.40ms | 189ns |

## SystemsUpdateMixedEntities

One world.run with two systems on N heterogeneous entities (mixed component sets).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 240ns | 240ns |
| 4 | 310ns | 78ns |
| 8 | 400ns | 50ns |
| 16 | 630ns | 39ns |
| 32 | 1.09us | 34ns |
| 64 | 1.99us | 31ns |
| 256 | 7.10us | 28ns |
| 1.0K | 37.06us | 36ns |
| 4.1K | 242.71us | 59ns |
| 16.4K | 3.84ms | 234ns |
| 65.5K | 17.38ms | 265ns |

## ComplexSystemsUpdate

One world.run with seven systems (Movement, Data, Health, Damage, Sprite, Lifetime, Collision) on N homogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 890ns | 890ns |
| 4 | 1.21us | 303ns |
| 8 | 1.81us | 226ns |
| 16 | 2.84us | 178ns |
| 32 | 5.28us | 165ns |
| 64 | 9.70us | 152ns |
| 256 | 37.04us | 145ns |
| 1.0K | 219.30us | 214ns |
| 4.1K | 1.58ms | 385ns |
| 16.4K | 11.54ms | 705ns |
| 65.5K | 45.86ms | 700ns |

## ComplexSystemsUpdateMixedEntities

One world.run with seven systems on N heterogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 740ns | 740ns |
| 4 | 720ns | 180ns |
| 8 | 950ns | 119ns |
| 16 | 1.39us | 87ns |
| 32 | 2.26us | 71ns |
| 64 | 3.97us | 62ns |
| 256 | 15.13us | 59ns |
| 1.0K | 82.86us | 81ns |
| 4.1K | 497.81us | 122ns |
| 16.4K | 5.00ms | 305ns |
| 65.5K | 35.36ms | 540ns |

