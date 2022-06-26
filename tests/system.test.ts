// import {
//     Component,
//     EntityBuilder,
//     RegisterComponent,
//     System,
//     World
// } from '../src/index';

// @RegisterComponent
// class ATestComponent extends Component {
//     declare value: number;

//     override init(args: { value: number }) {
//         this.value = args.value;
//     }
// }
// @RegisterComponent
// class BTestComponent extends Component {
//     declare value: number;

//     override init(args: { value: number }) {
//         this.value = args.value;
//     }
// }

// class SpawnB extends System {
//     aspects() {
//         return [ATestComponent];
//     }
//     excludes() {
//         return [];
//     }

//     run() {
//         this.entities.forEach((e) => {
//             const value = e.getComponent(ATestComponent).value;
//             EntityBuilder.create(this.world)
//                 .withComponent(new BTestComponent(), { value })
//                 .build();
//             EntityBuilder.create(this.world)
//                 .withComponent(new BTestComponent(), { value })
//                 .build();
//         });
//     }
// }

// class KillB extends System {
//     aspects() {
//         return [BTestComponent];
//     }
//     excludes() {
//         return [];
//     }

//     run() {
//         this.entities.forEach((entity) => {
//             entity.queueDestroy();
//         });
//     }

//     public getEntities = () => {
//         return Array.from(this.entities.values());
//     };
// }

// describe('System', () => {
//     it('can remove an entity in a system that affects a different system', () => {
//         const world = World.create().withSystems([SpawnB, KillB]).build();

//         for (let i = 0; i < 5; i++) {
//             EntityBuilder.create(world)
//                 .withComponent(new ATestComponent(), { value: i })
//                 .build();
//         }

//         for (let i = 0; i < 5; i++) {
//             world.run(1);
//         }

//         const testSystemInst = world.getSystem(KillB);

//         // We have 5 entities creating 2 each per run, and they'll destroy themselves on the next run
//         // so we end up with 10 entities and no more
//         expect(testSystemInst.getEntities().length).toEqual(10);
//     });
// });

export {};