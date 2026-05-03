# osecs benchmarks

Scenarios from [abeimler/ecs_benchmark](https://github.com/abeimler/ecs_benchmark) ported to osecs.
Each row reports the **median** wall time of one operation at the given entity count, plus the per-entity cost. Lower is faster.

### Environment

- Date: `2026-05-03T18:35:12.210Z`
- Runtime: `node 24.3.0 / bun 1.3.11`
- Platform: `linux x64`
- CPU: AMD Ryzen 7 8700F (8-core)

Reproduce with `bun run benchmarks/bench.ts && bun run benchmarks/format.ts`.

## CreateEntities

Time to create N entities, each with 3 components (Position, Direction, Comflabulation).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 2.93us | 2.93us |
| 4 | 7.36us | 1.84us |
| 8 | 14.74us | 1.84us |
| 16 | 19.95us | 1.25us |
| 32 | 19.96us | 624ns |
| 64 | 38.26us | 598ns |
| 256 | 162.24us | 634ns |
| 1.0K | 634.53us | 620ns |
| 4.1K | 5.37ms | 1.31us |
| 16.4K | 18.46ms | 1.13us |
| 65.5K | 88.42ms | 1.35us |

## DestroyEntities

Time to destroy N pre-created entities (includes graveyard processing on world.run).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 2.19us | 2.19us |
| 4 | 2.25us | 563ns |
| 8 | 2.80us | 350ns |
| 16 | 4.26us | 267ns |
| 32 | 9.77us | 305ns |
| 64 | 16.11us | 252ns |
| 256 | 57.53us | 225ns |
| 1.0K | 245.93us | 240ns |
| 4.1K | 1.38ms | 336ns |
| 16.4K | 6.67ms | 407ns |
| 65.5K | 31.79ms | 485ns |

## UnpackOneComponent

Iterate N entities once and read one component per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 450ns | 450ns |
| 4 | 230ns | 58ns |
| 8 | 260ns | 33ns |
| 16 | 360ns | 23ns |
| 32 | 480ns | 15ns |
| 64 | 760ns | 12ns |
| 256 | 2.47us | 10ns |
| 1.0K | 10.71us | 10ns |
| 4.1K | 57.65us | 14ns |
| 16.4K | 766.58us | 47ns |
| 65.5K | 3.54ms | 54ns |

## UnpackTwoComponents

Iterate N entities once and read two components per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 200ns | 200ns |
| 4 | 210ns | 53ns |
| 8 | 260ns | 33ns |
| 16 | 350ns | 22ns |
| 32 | 570ns | 18ns |
| 64 | 1.01us | 16ns |
| 256 | 3.47us | 14ns |
| 1.0K | 14.47us | 14ns |
| 4.1K | 74.75us | 18ns |
| 16.4K | 1.23ms | 75ns |
| 65.5K | 5.19ms | 79ns |

## UnpackThreeComponents

Iterate N entities once and read three components per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 240ns | 240ns |
| 4 | 250ns | 63ns |
| 8 | 340ns | 43ns |
| 16 | 480ns | 30ns |
| 32 | 700ns | 22ns |
| 64 | 1.20us | 19ns |
| 256 | 3.98us | 16ns |
| 1.0K | 15.94us | 16ns |
| 4.1K | 67.65us | 17ns |
| 16.4K | 781.35us | 48ns |
| 65.5K | 4.43ms | 68ns |

## RemoveAddComponent

For each of N entities, remove and re-add a component (then flush via world.run).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 280ns | 280ns |
| 4 | 420ns | 105ns |
| 8 | 630ns | 79ns |
| 16 | 1.14us | 71ns |
| 32 | 2.12us | 66ns |
| 64 | 4.03us | 63ns |
| 256 | 18.36us | 72ns |
| 1.0K | 83.93us | 82ns |
| 4.1K | 502.22us | 123ns |
| 16.4K | 2.53ms | 154ns |

## SystemsUpdate

One world.run with two systems (Movement + Data) on N homogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 480ns | 480ns |
| 4 | 320ns | 80ns |
| 8 | 370ns | 46ns |
| 16 | 510ns | 32ns |
| 32 | 870ns | 27ns |
| 64 | 1.56us | 24ns |
| 256 | 5.56us | 22ns |
| 1.0K | 25.03us | 24ns |
| 4.1K | 124.50us | 30ns |
| 16.4K | 1.59ms | 97ns |
| 65.5K | 9.38ms | 143ns |

## SystemsUpdateMixedEntities

One world.run with two systems on N heterogeneous entities (mixed component sets).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 200ns | 200ns |
| 4 | 250ns | 63ns |
| 8 | 310ns | 39ns |
| 16 | 440ns | 28ns |
| 32 | 780ns | 24ns |
| 64 | 1.35us | 21ns |
| 256 | 4.58us | 18ns |
| 1.0K | 23.28us | 23ns |
| 4.1K | 173.21us | 42ns |
| 16.4K | 2.18ms | 133ns |
| 65.5K | 14.82ms | 226ns |

## ComplexSystemsUpdate

One world.run with seven systems (Movement, Data, Health, Damage, Sprite, Lifetime, Collision) on N homogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 805ns | 805ns |
| 4 | 940ns | 235ns |
| 8 | 1.16us | 145ns |
| 16 | 1.65us | 103ns |
| 32 | 2.48us | 78ns |
| 64 | 4.42us | 69ns |
| 256 | 16.18us | 63ns |
| 1.0K | 160.69us | 157ns |
| 4.1K | 1.42ms | 348ns |
| 16.4K | 8.57ms | 523ns |
| 65.5K | 33.80ms | 516ns |

## ComplexSystemsUpdateMixedEntities

One world.run with seven systems on N heterogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 540ns | 540ns |
| 4 | 580ns | 145ns |
| 8 | 710ns | 89ns |
| 16 | 920ns | 58ns |
| 32 | 1.39us | 43ns |
| 64 | 2.32us | 36ns |
| 256 | 8.24us | 32ns |
| 1.0K | 39.69us | 39ns |
| 4.1K | 314.94us | 77ns |
| 16.4K | 2.40ms | 146ns |
| 65.5K | 19.98ms | 305ns |

