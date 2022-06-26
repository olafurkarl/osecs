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
        return Array.from(this.entities.values());
    };
}

const setupSystem = (
    aspects: typeof Component[],
    excludes: typeof Component[]
): any => {
    return class TSystem extends TestSystem {
        run(): void {
            // no-op
        }
        aspects(): typeof Component[] {
            return [...aspects];
        }
        excludes(): typeof Component[] {
            return [...excludes];
        }
    };
};

describe('Masking', () => {
    it('gets the correct aspect mask', () => {
        const testSystem01 = new (setupSystem([ATestComponent], []))();
        const testSystem10 = new (setupSystem([BTestComponent], []))();
        const testSystem11 = new (setupSystem(
            [ATestComponent, BTestComponent],
            []
        ))();

        expect(testSystem01.getAspectMask()).toEqual(0b01);
        expect(testSystem10.getAspectMask()).toEqual(0b10);
        expect(testSystem11.getAspectMask()).toEqual(0b11);
    });

    it('gets the correct exclude mask', () => {
        const testSystem01 = new (setupSystem([], [ATestComponent]))();
        const testSystem10 = new (setupSystem([], [BTestComponent]))();
        const testSystem11 = new (setupSystem(
            [],
            [ATestComponent, BTestComponent]
        ))();

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
        const TestSystemA = setupSystem([ATestComponent], []);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.run(1);
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(testSystemInst.getEntities()[0].equals(entity)).toEqual(true);
    });

    it('gets entity if it has a different but matching aspect mask', () => {
        const TestSystemA = setupSystem([ATestComponent], []);

        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.run(1);
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getAspectMask()).not.toEqual(
            entity.getComponentMask()
        );
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(testSystemInst.getEntities()[0].equals(entity)).toEqual(true);
    });

    it('does not get entity if it is excluded by exclusion mask by initial components', () => {
        const TestSystemA = setupSystem([ATestComponent], [BTestComponent]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.run(1);
        const testSystemInst = world.getSystem(TestSystemA);

        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not get entity if it is excluded by exclusion mask, via having an excluded component added later', () => {
        const TestSystemA = setupSystem([ATestComponent], [BTestComponent]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.run(1);

        entity.addComponent(new BTestComponent());

        world.run(1);

        const testSystemInst = world.getSystem(TestSystemA);

        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not get entity if its aspect component removed later', () => {
        const TestSystemA = setupSystem([ATestComponent], []);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.run(1);
        const testSystemInst = world.getSystem(TestSystemA) as TestSystem;

        expect(testSystemInst.getEntities().length).toEqual(1);

        entity.removeComponent(ATestComponent);

        world.run(1);

        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('masks out an entity completely when it is destroyed', () => {
        const TestSystemA = setupSystem([ATestComponent, BTestComponent], []);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.run(1);

        expect(entity.getComponentMask()).toEqual(0b11);

        entity.destroy();

        world.run(1);

        expect(entity.getComponentMask()).toEqual(0b00);

        const testSystemInst = world.getSystem(TestSystemA) as TestSystem;

        expect(testSystemInst.getEntities().length).toEqual(0);
    });
});

export {};
