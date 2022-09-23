import { RegisterComponent, Component, System, Has } from '../src';
import { EntityBuilder } from '../src/entity';
import { World } from '../src/world';

@RegisterComponent
class ATestComponent extends Component {}

class TestSystem extends System {
    public ents = this.query([Has(ATestComponent)]);

    public lastAddedCount = -1;
    public lastRemovedCount = -1;
    run() {
        this.lastAddedCount = this.ents.added.length;
        this.lastRemovedCount = this.ents.removed.length;
    }
}

describe('Query', () => {
    it('adding an entity to a query returns it in the current query immediately', () => {
        class TestSystemCheckingComponents extends System {
            public ents = this.query([Has(ATestComponent)]);

            public currentHadComponent = false;
            run() {
                this.currentHadComponent = this.ents.current.every((e) =>
                    e.hasComponent(ATestComponent)
                );
            }
        }
        const world = World.create()
            .withSystems([TestSystemCheckingComponents])
            .build();
        const inst = world.getSystem(TestSystemCheckingComponents);

        EntityBuilder.create(world).withComponent(ATestComponent).build();

        world.run();

        expect(inst.currentHadComponent).toEqual(true);
    });
    it('gets newly matching entities in added query result on the next frame', () => {
        const world = World.create().withSystems([TestSystem]).build();
        const inst = world.getSystem(TestSystem);

        EntityBuilder.create(world).withComponent(ATestComponent).build();

        expect(inst.ents.added.length).toEqual(0);

        world.run();

        expect(inst.lastAddedCount).toEqual(1);
    });

    it('does not keep added entities beyond the next frame', () => {
        const world = World.create().withSystems([TestSystem]).build();
        const inst = world.getSystem(TestSystem);

        EntityBuilder.create(world).withComponent(ATestComponent).build();

        world.run();
        world.run();

        expect(inst.lastAddedCount).toEqual(0);
    });

    it('added entities has the requisite components', () => {
        class TestSystemCheckingComponents extends System {
            public ents = this.query([Has(ATestComponent)]);

            public addedHadComponent = false;
            run() {
                this.addedHadComponent = this.ents.added.every((e) =>
                    e.hasComponent(ATestComponent)
                );
            }
        }
        const world = World.create()
            .withSystems([TestSystemCheckingComponents])
            .build();
        const inst = world.getSystem(TestSystemCheckingComponents);

        EntityBuilder.create(world).withComponent(ATestComponent).build();

        world.run();

        expect(inst.addedHadComponent).toEqual(true);
    });

    it('gets newly non-matching entities in removed query result on the next frame', () => {
        const world = World.create().withSystems([TestSystem]).build();
        const inst = world.getSystem(TestSystem);

        const entity = EntityBuilder.create(world)
            .withComponent(ATestComponent)
            .build();

        entity.removeComponent(ATestComponent);

        world.run();

        expect(inst.lastRemovedCount).toEqual(1);
    });

    it('does not keep removed query result beyond the next frame', () => {
        const world = World.create().withSystems([TestSystem]).build();
        const inst = world.getSystem(TestSystem);

        const entity = EntityBuilder.create(world)
            .withComponent(ATestComponent)
            .build();

        entity.removeComponent(ATestComponent);

        world.run();
        world.run();

        expect(inst.lastRemovedCount).toEqual(0);
    });

    it('shows entity in removed query if it is deleted', () => {
        const world = World.create().withSystems([TestSystem]).build();
        const inst = world.getSystem(TestSystem);

        const entity = EntityBuilder.create(world)
            .withComponent(ATestComponent)
            .build();

        entity.destroy();

        world.run();

        expect(inst.lastRemovedCount).toEqual(1);
    });

    it('shows entity in removed query if it is deleted', () => {
        class TestSystemCheckingComponents extends System {
            public ents = this.query([Has(ATestComponent)]);

            public removedHadComponent = false;
            run() {
                this.removedHadComponent = this.ents.removed.every((e) =>
                    e.hasComponent(ATestComponent)
                );
            }
        }
        const world = World.create()
            .withSystems([TestSystemCheckingComponents])
            .build();
        const inst = world.getSystem(TestSystemCheckingComponents);

        const entity = EntityBuilder.create(world)
            .withComponent(ATestComponent)
            .build();

        entity.destroy();

        world.run();

        expect(inst.removedHadComponent).toEqual(true);
    });
});
