import {
    Component,
    Entity,
    EntityBuilder,
    Has,
    RegisterComponent,
    System,
    World
} from '../src/index';

@RegisterComponent
class ATestComponent extends Component {
    declare value: number;

    override setValues(args: { value: number }) {
        this.value = args.value;
    }
}
@RegisterComponent
class BTestComponent extends Component {
    declare value: number;

    override setValues(args: { value: number }) {
        this.value = args.value;
    }
}

class SpawnB extends System {
    private ents = this.query([Has(ATestComponent)]);

    run() {
        this.ents.forEach((e: Entity) => {
            const value = e.getComponent(ATestComponent).value;
            EntityBuilder.create(this.world)
                .withComponent(BTestComponent, { value })
                .build();
            EntityBuilder.create(this.world)
                .withComponent(BTestComponent, { value })
                .build();
        });
    }
}

class KillB extends System {
    private ents = this.query([Has(BTestComponent)]);

    run() {
        this.ents.forEach((entity) => {
            entity.destroy();
        });
    }

    public getEntities = () => {
        return Array.from(this.ents.entities.values());
    };
}

describe('System', () => {
    it('can remove an entity in a system that affects a different system', () => {
        const world = World.create().withSystems([SpawnB, KillB]).build();

        for (let i = 0; i < 5; i++) {
            EntityBuilder.create(world)
                .withComponent(ATestComponent, { value: i })
                .build();
        }

        for (let i = 0; i < 5; i++) {
            world.run(1);
        }

        const testSystemInst = world.getSystem(KillB);

        expect(testSystemInst.getEntities().length).toEqual(0);
    });
});
