# osecs benchmarks

Scenarios from [abeimler/ecs_benchmark](https://github.com/abeimler/ecs_benchmark) ported to osecs.
Each row reports the **median** wall time of one operation at the given entity count, plus the per-entity cost. Lower is faster.

### Environment

- Date: `2026-05-03T19:24:58.794Z`
- Runtime: `node 24.3.0 / bun 1.3.11`
- Platform: `linux x64`
- CPU: AMD Ryzen 7 8700F (8-core)

Reproduce with `bun run benchmarks/bench.ts && bun run benchmarks/format.ts`.

## CreateEntities

Time to create N entities, each with 3 components (Position, Direction, Comflabulation).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 2.73us | 2.73us |
| 4 | 7.02us | 1.75us |
| 8 | 14.61us | 1.83us |
| 16 | 19.41us | 1.21us |
| 32 | 19.61us | 613ns |
| 64 | 39.05us | 610ns |
| 256 | 154.41us | 603ns |
| 1.0K | 642.89us | 628ns |
| 4.1K | 4.30ms | 1.05us |
| 16.4K | 17.65ms | 1.08us |
| 65.5K | 84.00ms | 1.28us |

## DestroyEntities

Time to destroy N pre-created entities (includes graveyard processing on world.run).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 1.82us | 1.82us |
| 4 | 1.63us | 408ns |
| 8 | 2.61us | 326ns |
| 16 | 6.68us | 418ns |
| 32 | 10.03us | 313ns |
| 64 | 13.53us | 211ns |
| 256 | 63.51us | 248ns |
| 1.0K | 261.14us | 255ns |
| 4.1K | 1.42ms | 346ns |
| 16.4K | 7.12ms | 435ns |
| 65.5K | 31.21ms | 476ns |

## UnpackOneComponent

Iterate N entities once and read one component per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 450ns | 450ns |
| 4 | 250ns | 63ns |
| 8 | 200ns | 25ns |
| 16 | 230ns | 14ns |
| 32 | 300ns | 9ns |
| 64 | 440ns | 7ns |
| 256 | 1.16us | 5ns |
| 1.0K | 2.90us | 3ns |
| 4.1K | 28.77us | 7ns |
| 16.4K | 201.20us | 12ns |
| 65.5K | 1.72ms | 26ns |

## UnpackTwoComponents

Iterate N entities once and read two components per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 180ns | 180ns |
| 4 | 170ns | 43ns |
| 8 | 200ns | 25ns |
| 16 | 250ns | 16ns |
| 32 | 350ns | 11ns |
| 64 | 550ns | 9ns |
| 256 | 1.78us | 7ns |
| 1.0K | 6.49us | 6ns |
| 4.1K | 27.90us | 7ns |
| 16.4K | 216.53us | 13ns |
| 65.5K | 1.01ms | 15ns |

## UnpackThreeComponents

Iterate N entities once and read three components per entity.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 280ns | 280ns |
| 4 | 290ns | 73ns |
| 8 | 250ns | 31ns |
| 16 | 300ns | 19ns |
| 32 | 405ns | 13ns |
| 64 | 550ns | 9ns |
| 256 | 1.80us | 7ns |
| 1.0K | 6.32us | 6ns |
| 4.1K | 49.26us | 12ns |
| 16.4K | 169.79us | 10ns |
| 65.5K | 1.44ms | 22ns |

## RemoveAddComponent

For each of N entities, remove and re-add a component (then flush via world.run).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 300ns | 300ns |
| 4 | 540ns | 135ns |
| 8 | 760ns | 95ns |
| 16 | 1.21us | 76ns |
| 32 | 2.13us | 67ns |
| 64 | 4.01us | 63ns |
| 256 | 16.25us | 63ns |
| 1.0K | 68.56us | 67ns |
| 4.1K | 473.63us | 116ns |
| 16.4K | 2.38ms | 146ns |

## SystemsUpdate

One world.run with two systems (Movement + Data) on N homogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 280ns | 280ns |
| 4 | 240ns | 60ns |
| 8 | 250ns | 31ns |
| 16 | 280ns | 18ns |
| 32 | 370ns | 12ns |
| 64 | 565ns | 9ns |
| 256 | 1.73us | 7ns |
| 1.0K | 6.00us | 6ns |
| 4.1K | 30.14us | 7ns |
| 16.4K | 225.12us | 14ns |
| 65.5K | 2.96ms | 45ns |

## SystemsUpdateMixedEntities

One world.run with two systems on N heterogeneous entities (mixed component sets).

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 200ns | 200ns |
| 4 | 210ns | 53ns |
| 8 | 220ns | 28ns |
| 16 | 270ns | 17ns |
| 32 | 340ns | 11ns |
| 64 | 490ns | 8ns |
| 256 | 1.46us | 6ns |
| 1.0K | 4.68us | 5ns |
| 4.1K | 25.62us | 6ns |
| 16.4K | 201.64us | 12ns |
| 65.5K | 2.52ms | 38ns |

## ComplexSystemsUpdate

One world.run with seven systems (Movement, Data, Health, Damage, Sprite, Lifetime, Collision) on N homogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 750ns | 750ns |
| 4 | 810ns | 203ns |
| 8 | 1.00us | 125ns |
| 16 | 1.38us | 86ns |
| 32 | 2.16us | 68ns |
| 64 | 3.70us | 58ns |
| 256 | 9.06us | 35ns |
| 1.0K | 20.52us | 20ns |
| 4.1K | 109.28us | 27ns |
| 16.4K | 1.20ms | 73ns |
| 65.5K | 7.46ms | 114ns |

## ComplexSystemsUpdateMixedEntities

One world.run with seven systems on N heterogeneous entities.

| Entities | osecs (total) | osecs (per entity) |
|---------:|--------------:|-------------------:|
| 1 | 520ns | 520ns |
| 4 | 510ns | 128ns |
| 8 | 560ns | 70ns |
| 16 | 610ns | 38ns |
| 32 | 770ns | 24ns |
| 64 | 1.04us | 16ns |
| 256 | 2.62us | 10ns |
| 1.0K | 9.22us | 9ns |
| 4.1K | 41.52us | 10ns |
| 16.4K | 345.77us | 21ns |
| 65.5K | 3.80ms | 58ns |

