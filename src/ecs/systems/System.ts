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
    beforeFixedTick(dt: number) {}
    afterFixedTick(dt: number) {}
};

export abstract class ComponentSystem<T> extends System {
    #compID: CompID;
    #eventHandlers: EventSubscriptionController[] = [];
    constructor(component: CompID) {
        super();
        this.#compID = component;
    }
    init(game: Nova) {
        this.#eventHandlers.push(game.on("use", pair => {
            if (pair[1] === this.#compID) {
                this.add(pair[0] as GameObj<T>);
            }
        }));
        this.#eventHandlers.push(game.on("unuse", pair => {
            if (pair[1] === this.#compID) {
                this.remove(pair[0] as GameObj<T>);
            }
        }));
    }
    destroy() {
        while (this.#eventHandlers.length) this.#eventHandlers.pop()!.stop();
    }
    abstract add(obj: GameObj<T>): void;
    abstract remove(obj: GameObj<T>): void;
};
