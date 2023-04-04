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
                .with(BTestComponent, { value })
                .build();
            EntityBuilder.create(this.world)
                .with(BTestComponent, { value })
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
        const world = World.create()
            .withSystem(SpawnB)
            .withSystem(KillB)
            .build();

        for (let i = 0; i < 1; i++) {
            EntityBuilder.create(world)
                .with(ATestComponent, { value: i })
                .build();
        }

        for (let i = 0; i < 5; i++) {
            world.run(1);
        }

        const testSystemInst = world.getSystem(KillB);

        expect(testSystemInst.getEntities().length).toEqual(0);
    });
});
