import {
    RegisterComponent,
    Component,
    System,
    Aspect,
    Has,
    World,
    EntityBuilder,
    Without,
    ParentHas,
    ParentWithout
} from '../src/index';
import { Mask } from '../src/mask';
import { Query } from '../src/query';

@RegisterComponent
class ATestComponent extends Component {}
@RegisterComponent
class BTestComponent extends Component {}

@RegisterComponent
class CTestComponent extends Component {}
class TestSystem extends System {
    declare testQuery: Query;

    public getEntities = () => {
        return Array.from(this.testQuery.entities.values());
    };

    public get includeMask() {
        return this.testQuery.includeMask.mask;
    }

    public get excludeMask() {
        return this.testQuery.excludeMask.mask;
    }

    public get parentIncludeMask() {
        return this.testQuery.parentIncludeMask.mask;
    }

    run(): void {
        // no-op
    }
}

const setupSystem = (aspects: Aspect[]): TestSystem => {
    class TSystem extends TestSystem {
        testQuery = this.query([...aspects]);
    }
    return new TSystem(undefined as unknown as World);
};

const setupSystemType = (aspects: Aspect[]): typeof TestSystem => {
    return class TSystem extends TestSystem {
        testQuery = this.query([...aspects]);
    } as any;
};

describe('Masking', () => {
    it('gets the correct system aspect mask', () => {
        const testSystem01 = setupSystem([Has(ATestComponent)]);
        const testSystem10 = setupSystem([Has(BTestComponent)]);
        const testSystem11 = setupSystem([
            Has(ATestComponent),
            Has(BTestComponent)
        ]);
        const expectedMask01 = new Mask();
        expectedMask01.flipOn(0);
        const expectedMask10 = new Mask();
        expectedMask10.flipOn(1);
        const expectedMask11 = new Mask();
        expectedMask11.flipOn(0);
        expectedMask11.flipOn(1);
        expect(testSystem01.includeMask).toEqual(expectedMask01.mask);
        expect(testSystem10.includeMask).toEqual(expectedMask10.mask);
        expect(testSystem11.includeMask).toEqual(expectedMask11.mask);
    });

    it('gets the correct system exclude mask', () => {
        const testSystem01 = setupSystem([
            Has(ATestComponent),
            Without(ATestComponent)
        ]);
        const testSystem10 = setupSystem([
            Has(ATestComponent),
            Without(BTestComponent)
        ]);
        const testSystem11 = setupSystem([
            Has(CTestComponent),
            Without(ATestComponent),
            Without(BTestComponent)
        ]);

        expect(testSystem01.excludeMask[0]).toEqual(
            0b11111111111111111111111111111110
        );
        expect(testSystem10.excludeMask[0]).toEqual(
            0b11111111111111111111111111111101
        );
        expect(testSystem11.excludeMask[0]).toEqual(
            0b11111111111111111111111111111100
        );
    });

    it('gets the correct system parent include mask', () => {
        const testSystem01 = setupSystem([ParentHas(ATestComponent)]);
        const testSystem10 = setupSystem([ParentHas(BTestComponent)]);
        const testSystem11 = setupSystem([
            ParentHas(ATestComponent),
            ParentHas(BTestComponent)
        ]);

        expect(testSystem01.parentIncludeMask[0]).toEqual(0b01);
        expect(testSystem10.parentIncludeMask[0]).toEqual(0b10);
        expect(testSystem11.parentIncludeMask[0]).toEqual(0b11);
    });

    it('gets entity if it has the same aspect mask', () => {
        const TestSystemA = setupSystemType([Has(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(
            testSystemInst.testQuery.entities
                .entries()
                .next()
                .value[1].equals(entity)
        ).toEqual(true);
    });

    it('gets entity if it has a different but matching aspect mask', () => {
        const TestSystemA = setupSystemType([Has(ATestComponent)]);

        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.testQuery.includeMask).not.toEqual(
            entity.componentMask
        );
        expect(testSystemInst.getEntities().length).toEqual(1);
        expect(testSystemInst.getEntities()[0].equals(entity)).toEqual(true);
    });

    it('does not get entity if it is excluded by exclusion mask by initial components', () => {
        const TestSystemA = setupSystemType([
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
        const TestSystemA = setupSystemType([
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
        const TestSystemA = setupSystemType([Has(ATestComponent)]);
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
        const TestSystemA = setupSystemType([
            Has(ATestComponent),
            Has(BTestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        const entity = EntityBuilder.create(world)
            .withComponent(new ATestComponent())
            .withComponent(new BTestComponent())
            .build();
        world.run();

        expect(entity.componentMask.maskString).toEqual('11');

        entity.destroy();

        world.run();

        expect(entity.componentMask.maskString).toEqual('0');

        const testSystemInst = world.getSystem(TestSystemA) as TestSystem;

        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('excludes entity with no components', () => {
        const TestSystemA = setupSystemType([
            Has(CTestComponent),
            Without(ATestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('exclude query does include entity with required component', () => {
        const TestSystemA = setupSystemType([
            Has(CTestComponent),
            Without(ATestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).withComponent(new CTestComponent()).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
    });

    it('include query does not include entity with no components', () => {
        const TestSystemA = setupSystemType([Has(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not include any entities if it has no aspects', () => {
        const TestSystemA = setupSystemType([]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).withComponent(new ATestComponent()).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('does not match entity by its parent mask directly', () => {
        const TestSystemA = setupSystemType([ParentHas(ATestComponent)]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world).withComponent(new ATestComponent()).build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('gets entity if its parent has same aspect mask', () => {
        const TestSystemA = setupSystemType([ParentHas(ATestComponent)]);
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
        const TestSystemA = setupSystemType([
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
        const TestSystemA = setupSystemType([
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
        const TestSystemA = setupSystemType([
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

    it('parent exclude query doesnt include entity if parent is missing component', () => {
        const TestSystemA = setupSystemType([
            Has(CTestComponent),
            ParentWithout(ATestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world, 'parent')
            .withComponent(new ATestComponent())
            .withChild(
                EntityBuilder.create(world, 'child')
                    .withComponent(new CTestComponent())
                    .build()
            )
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(0);
    });

    it('parent exclude query doesnt exclude entity if parent doesnt have component excluded in query', () => {
        const TestSystemA = setupSystemType([
            Has(CTestComponent),
            ParentWithout(ATestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        EntityBuilder.create(world, 'parent')
            .withChild(
                EntityBuilder.create(world, 'child')
                    .withComponent(new CTestComponent())
                    .build()
            )
            .build();
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
    });

    it('parent has query works with regular has query', () => {
        const TestSystemA = setupSystemType([
            Has(CTestComponent),
            Has(BTestComponent),
            ParentHas(ATestComponent)
        ]);
        const world = World.create().withSystem(TestSystemA).build();
        const parent = EntityBuilder.create(world, 'parent')
            .withChild(
                EntityBuilder.create(world, 'child')
                    .withComponent(new CTestComponent())
                    .withComponent(new BTestComponent())
                    .build()
            )
            .build();
        parent.addComponent(new ATestComponent());
        world.run();
        const testSystemInst = world.getSystem(TestSystemA);
        expect(testSystemInst.getEntities().length).toEqual(1);
    });
});

export {};
