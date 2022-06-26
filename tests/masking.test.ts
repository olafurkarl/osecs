import {
    RegisterComponent,
    Component,
    System,
    Aspect,
    Has,
    World,
    EntityBuilder,
    Without,
    ParentHas
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

const setupSystem = (aspects: Aspect[]): any => {
    return class TSystem extends TestSystem {
        run(): void {
            // no-op
        }
        aspects() {
            return [...aspects];
        }
    };
};

describe('Masking', () => {
    it('gets the correct system aspect mask', () => {
        const testSystem01 = new (setupSystem([Has(ATestComponent)]))();
        const testSystem10 = new (setupSystem([Has(BTestComponent)]))();
        const testSystem11 = new (setupSystem([
            Has(ATestComponent),
            Has(BTestComponent)
        ]))();

        expect(testSystem01.getIncludeMask()).toEqual(0b01);
        expect(testSystem10.getIncludeMask()).toEqual(0b10);
        expect(testSystem11.getIncludeMask()).toEqual(0b11);
    });

    it('gets the correct system exclude mask', () => {
        const testSystem01 = new (setupSystem([Without(ATestComponent)]))();
        const testSystem10 = new (setupSystem([Without(BTestComponent)]))();
        const testSystem11 = new (setupSystem([
            Without(ATestComponent),
            Without(BTestComponent)
        ]))();

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

    it('gets the correct system parent include mask', () => {
        const testSystem01 = new (setupSystem([ParentHas(ATestComponent)]))();
        const testSystem10 = new (setupSystem([ParentHas(BTestComponent)]))();
        const testSystem11 = new (setupSystem([
            ParentHas(ATestComponent),
            ParentHas(BTestComponent)
        ]))();

        expect(testSystem01.getParentIncludeMask()).toEqual(0b01);
        expect(testSystem10.getParentIncludeMask()).toEqual(0b10);
        expect(testSystem11.getParentIncludeMask()).toEqual(0b11);
    });

    it('gets entity if it has the same aspect mask', () => {
        const TestSystemA = setupSystem([Has(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(testSystemInst.getEntities()[0].equals(entity)).toEqual(true);
    });

    it('gets entity if it has a different but matching aspect mask', () => {
        const TestSystemA = setupSystem([Has(ATestComponent)]);

        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getIncludeMask()).not.toEqual(
            entity.getComponentMask()
        );
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(testSystemInst.getEntities()[0].equals(entity)).toEqual(true);
    });

    it('does not get entity if it is excluded by exclusion mask by initial components', () => {
        const TestSystemA = setupSystem([
            Has(ATestComponent),
            Without(BTestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);

        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not get entity if it is excluded by exclusion mask, via having an excluded component added later', () => {
        const TestSystemA = setupSystem([
            Has(ATestComponent),
            Without(BTestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.run();

        entity.addComponent(new BTestComponent());

        world.run();

        const testSystemInst = world.getSystem(TestSystemA);

        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not get entity if its aspect component removed later', () => {
        const TestSystemA = setupSystem([Has(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA) as TestSystem;

        expect(testSystemInst.getEntities().length).toEqual(1);

        entity.removeComponent(ATestComponent);

        world.run();

        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('masks out an entity completely when it is destroyed', () => {
        const TestSystemA = setupSystem([
            Has(ATestComponent),
            Has(BTestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.run();

        expect(entity.getComponentMask()).toEqual(0b11);

        entity.destroy();

        world.run();

        expect(entity.getComponentMask()).toEqual(0b00);

        const testSystemInst = world.getSystem(TestSystemA) as TestSystem;

        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('excludes entity with no components', () => {
        const TestSystemA = setupSystem([Without(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not include entity with no components', () => {
        const TestSystemA = setupSystem([Has(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not include any entities if it has no aspects', () => {
        const TestSystemA = setupSystem([]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).withComponent(new ATestComponent()).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not match entity by its parent mask directly', () => {
        const TestSystemA = setupSystem([ParentHas(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).withComponent(new ATestComponent()).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('gets entity if its parent has same aspect mask', () => {
        const TestSystemA = setupSystem([ParentHas(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withChild(EntityBuilder.create(world).build())
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(testSystemInst.getEntities()[0].equals(entity)).toEqual(false);
    });

    it('gets entity if its parent has the right mask and child has the right aspect mask', () => {
        const TestSystemA = setupSystem([
            Has(ATestComponent),
            ParentHas(BTestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new BTestComponent())
            .withChild(
                EntityBuilder.create(world)
                    .withComponent(new ATestComponent())
                    .build()
            )
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(testSystemInst.getEntities()[0].equals(entity)).toEqual(false);
    });

    it('gets entity if its parent has the right mask and child has the right aspect mask, even if child is added later', () => {
        const TestSystemA = setupSystem([
            Has(ATestComponent),
            ParentHas(BTestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new BTestComponent())
            .build();
        const child = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        entity.addChild(child);
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(testSystemInst.getEntities()[0].equals(entity)).toEqual(false);
    });

    it('does not get entity if its parent has the right mask and child has the wrong aspect mask', () => {
        const TestSystemA = setupSystem([
            Has(ATestComponent),
            ParentHas(BTestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world)
            .withComponent(new BTestComponent())
            .withChild(EntityBuilder.create(world).build())
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });
});

export {};
