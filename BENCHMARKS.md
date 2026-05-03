# osecs benchmarks

Scenarios from [abeimler/ecs_benchmark](https://github.com/abeimler/ecs_benchmark) ported to osecs.
Each row reports the **median** wall time of one operation at the given entity count, plus the per-entity cost. Lower is faster.

### Environment

- Date: `2026-05-03T18:41:00.044Z`
- Runtime: `node 24.3.0 / bun 1.3.11`
- Platform: `linux x64`
- CPU: AMD Ryzen 7 8700F (8-core)

Reproduce with `bun run benchmarks/bench.ts && bun run benchmarks/format.ts`.

## CreateEntities

Time to create N entities, each with 3 components (Position, Direction, Comflabulation).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 2.69us | 2.69us |
| 4 | 7.06us | 1.76us |
| 8 | 13.76us | 1.72us |
| 16 | 19.06us | 1.19us |
| 32 | 19.02us | 595ns |
| 64 | 37.97us | 593ns |
| 256 | 151.95us | 594ns |
| 1.0K | 642.05us | 627ns |
| 4.1K | 4.94ms | 1.21us |
| 16.4K | 16.38ms | 1000ns |
| 65.5K | 110.06ms | 1.68us |

## DestroyEntities

Time to destroy N pre-created entities (includes graveyard processing on world.run).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 1.65us | 1.65us |
| 4 | 1.66us | 415ns |
| 8 | 2.93us | 366ns |
| 16 | 4.80us | 300ns |
| 32 | 9.04us | 283ns |
| 64 | 16.04us | 251ns |
| 256 | 84.38us | 330ns |
| 1.0K | 308.59us | 301ns |
| 4.1K | 1.50ms | 366ns |
| 16.4K | 6.27ms | 383ns |
| 65.5K | 26.36ms | 402ns |

## UnpackOneComponent

Iterate N entities once and read one component per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 400ns | 400ns |
| 4 | 270ns | 68ns |
| 8 | 235ns | 29ns |
| 16 | 220ns | 14ns |
| 32 | 300ns | 9ns |
| 64 | 450ns | 7ns |
| 256 | 1.06us | 4ns |
| 1.0K | 2.99us | 3ns |
| 4.1K | 16.94us | 4ns |
| 16.4K | 148.55us | 9ns |
| 65.5K | 1.23ms | 19ns |

## UnpackTwoComponents

Iterate N entities once and read two components per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 220ns | 220ns |
| 4 | 180ns | 45ns |
| 8 | 210ns | 26ns |
| 16 | 250ns | 16ns |
| 32 | 360ns | 11ns |
| 64 | 550ns | 9ns |
| 256 | 1.77us | 7ns |
| 1.0K | 6.29us | 6ns |
| 4.1K | 20.56us | 5ns |
| 16.4K | 77.95us | 5ns |
| 65.5K | 982.50us | 15ns |

## UnpackThreeComponents

Iterate N entities once and read three components per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 260ns | 260ns |
| 4 | 180ns | 45ns |
| 8 | 210ns | 26ns |
| 16 | 240ns | 15ns |
| 32 | 330ns | 10ns |
| 64 | 520ns | 8ns |
| 256 | 1.77us | 7ns |
| 1.0K | 6.26us | 6ns |
| 4.1K | 37.77us | 9ns |
| 16.4K | 155.26us | 9ns |
| 65.5K | 1.09ms | 17ns |

## RemoveAddComponent

For each of N entities, remove and re-add a component (then flush via world.run).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 270ns | 270ns |
| 4 | 410ns | 103ns |
| 8 | 620ns | 78ns |
| 16 | 1.11us | 69ns |
| 32 | 2.06us | 64ns |
| 64 | 3.96us | 62ns |
| 256 | 16.92us | 66ns |
| 1.0K | 84.28us | 82ns |
| 4.1K | 400.32us | 98ns |
| 16.4K | 2.38ms | 145ns |

## SystemsUpdate

One world.run with two systems (Movement + Data) on N homogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 270ns | 270ns |
| 4 | 245ns | 61ns |
| 8 | 230ns | 29ns |
| 16 | 280ns | 18ns |
| 32 | 380ns | 12ns |
| 64 | 585ns | 9ns |
| 256 | 1.75us | 7ns |
| 1.0K | 6.03us | 6ns |
| 4.1K | 30.28us | 7ns |
| 16.4K | 145.04us | 9ns |
| 65.5K | 2.34ms | 36ns |

## SystemsUpdateMixedEntities

One world.run with two systems on N heterogeneous entities (mixed component sets).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 190ns | 190ns |
| 4 | 200ns | 50ns |
| 8 | 220ns | 28ns |
| 16 | 250ns | 16ns |
| 32 | 350ns | 11ns |
| 64 | 540ns | 8ns |
| 256 | 1.44us | 6ns |
| 1.0K | 4.46us | 4ns |
| 4.1K | 24.11us | 6ns |
| 16.4K | 124.13us | 8ns |
| 65.5K | 1.44ms | 22ns |

## ComplexSystemsUpdate

One world.run with seven systems (Movement, Data, Health, Damage, Sprite, Lifetime, Collision) on N homogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 690ns | 690ns |
| 4 | 740ns | 185ns |
| 8 | 920ns | 115ns |
| 16 | 1.29us | 81ns |
| 32 | 2.09us | 65ns |
| 64 | 3.64us | 57ns |
| 256 | 6.07us | 24ns |
| 1.0K | 19.96us | 19ns |
| 4.1K | 94.61us | 23ns |
| 16.4K | 688.24us | 42ns |
| 65.5K | 7.67ms | 117ns |

## ComplexSystemsUpdateMixedEntities

One world.run with seven systems on N heterogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 560ns | 560ns |
| 4 | 510ns | 128ns |
| 8 | 540ns | 68ns |
| 16 | 600ns | 38ns |
| 32 | 740ns | 23ns |
| 64 | 1.02us | 16ns |
| 256 | 2.51us | 10ns |
| 1.0K | 8.52us | 8ns |
| 4.1K | 38.40us | 9ns |
| 16.4K | 261.98us | 16ns |
| 65.5K | 2.35ms | 36ns |

