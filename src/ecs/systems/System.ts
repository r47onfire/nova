import Nova from "../..";
import { EventSubscriptionController } from "../../events";
import { Renderer } from "../../rendering/Renderer";
import { CompID } from "../components/Comp";
import { GameObj } from "../entity/GameObjType";

export abstract class System {
    abstract init(game: Nova): void;
    abstract destroy(): void;
    beforeUpdate(dt: number) {}
    afterUpdate(dt: number) {}
    beforeDraw(renderer: Renderer) {}
    afterDraw(renderer: Renderer) {}
    beforeFixedUpdate(dt: number) {}
    afterFixedUpdate(dt: number) {}
};

export class ComponentSystem<T> extends System {
    #compID: CompID;
    #eventHandlers: EventSubscriptionController[] = [];
    protected objects = new Set<GameObj<T>>();
    constructor(component: CompID) {
        super();
        this.#compID = component;
    }
    init(game: Nova) {
        this.#eventHandlers.push(game.on("use", pair => {
            if (pair[1] === this.#compID) {
                this.objects.add(pair[0] as any);
            }
        }));
        this.#eventHandlers.push(game.on("unuse", pair => {
            if (pair[1] === this.#compID) {
                this.objects.delete(pair[0] as any);
            }
        }));
    }
    destroy() {
        while (this.#eventHandlers.length) this.#eventHandlers.pop()!.stop();
    }
};
