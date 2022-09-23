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
});
