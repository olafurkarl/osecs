import {
    Component,
    EntityBuilder,
    RegisterComponent,
    System,
    World
} from '../src/index';

@RegisterComponent
class ATestComponent extends Component {}
@RegisterComponent
class BTestComponent extends Component {}

abstract class TestSystem extends System {
    public getEntities = () => {
        return this.entities;
    };
}

const setupSystem = (aspects: unknown[], excludes: unknown[]): TestSystem => {
    return new (class TSystem extends TestSystem {
        run(): void {
            // no-op
        }
        aspects(): unknown[] {
            return [...aspects];
        }
        excludes(): unknown[] {
            return [...excludes];
        }
    })();
};

describe('Masking', () => {
    it('gets the correct aspect mask', () => {
        const testSystem01 = setupSystem([ATestComponent], []);
        const testSystem10 = setupSystem([BTestComponent], []);
        const testSystem11 = setupSystem([ATestComponent, BTestComponent], []);

        expect(testSystem01.getAspectMask()).toEqual(0b01);
        expect(testSystem10.getAspectMask()).toEqual(0b10);
        expect(testSystem11.getAspectMask()).toEqual(0b11);
    });

    it('gets the correct exclude mask', () => {
        const testSystem01 = setupSystem([], [ATestComponent]);
        const testSystem10 = setupSystem([], [BTestComponent]);
        const testSystem11 = setupSystem([], [ATestComponent, BTestComponent]);

        expect(testSystem01.getExcludeMask()).toEqual(
            0b11111111111111111111111111111110
        );
        expect(testSystem10.getExcludeMask()).toEqual(
            0b11111111111111111111111111111101
        );
        expect(testSystem11.getExcludeMask()).toEqual(
            0b11111111111111111111111111111100
        );
    });

    it('gets entity if it has the same aspect mask', () => {
        const testSystem = setupSystem([ATestComponent], []);
        const world = World.create().withSystem(testSystem).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.sync();
        expect(testSystem.getEntities().length).toEqual(1);
        expect(testSystem.getEntities()[0].equals(entity)).toEqual(true);
    });

    it('gets entity if it has a different but matching aspect mask', () => {
        const testSystem = setupSystem([ATestComponent], []);
        const world = World.create().withSystem(testSystem).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.sync();

        expect(testSystem.getAspectMask).not.toEqual(entity.getComponentMask());
        expect(testSystem.getEntities().length).toEqual(1);
        expect(testSystem.getEntities()[0].equals(entity)).toEqual(true);
    });

    it('does not get entity if it is excluded by exclusion mask by initial components', () => {
        const testSystem = setupSystem([ATestComponent], [BTestComponent]);
        const world = World.create().withSystem(testSystem).build();
        EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.sync();

        expect(testSystem.getEntities().length).toEqual(0);
    });

    it('does not get entity if it is excluded by exclusion mask, via having an excluded component added later', () => {
        const testSystem = setupSystem([ATestComponent], [BTestComponent]);
        const world = World.create().withSystem(testSystem).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.sync();

        entity.addComponent(new BTestComponent());

        world.sync();

        expect(testSystem.getEntities().length).toEqual(0);
    });
});
