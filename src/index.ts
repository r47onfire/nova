import { COLOR_BLUE } from "@r47onfire/game-math";
import { GameObjRaw } from "./ecs/entity/GameObj";
import { GameObjEvents } from "./ecs/entity/GameObjEvents";
import { GameObj } from "./ecs/entity/GameObjType";
import { GameObjVersionManager, TRANSFORM_VERSION_MANAGER_SYMBOL } from "./ecs/entity/VersionManager";
import { System } from "./ecs/systems/System";
import { EventDispatcher } from "./events";
import { InputEvents, InputManager, InputManagerOptions } from "./input/InputManager";
import { InputID } from "./input/types/bindingTypes";
import { TimeController, TimeControllerEvents, TimeControllerOptions } from "./loop/TimeController";
import { Mesh } from "./rendering/Mesh";
import { Renderer, RendererEvents, RendererOptions } from "./rendering/Renderer";
export * from "@r47onfire/game-math";

export interface NovaOptions<TButton extends InputID, TStick extends InputID, TPointer extends InputID> extends RendererOptions, InputManagerOptions<TButton, TStick, TPointer>, TimeControllerOptions {

}

export interface GlobalEvents<TButton extends InputID, TStick extends InputID, TPointer extends InputID> extends RendererEvents, TimeControllerEvents, WithObject<GameObjEvents>, InputEvents<TButton, TStick, TPointer> {
    loaded: void;
    loaderror: [resourceID: string, failure: any];
    loadprogress: [loaded: number, toLoad: number];
    error: Error;
    sceneLeave: string;
    sceneEnter: string;
    beforeupdate: number;
    afterupdate: number;
    beforedraw: Renderer;
    afterdraw: Renderer;
    beforefixedtick: number;
    afterfixedtick: number;
}

type WithObject<T> = { [K in keyof T]: [GameObj, T[K]] };

export default class Nova<TButton extends InputID = InputID, TStick extends InputID = InputID, TPointer extends InputID = InputID> extends EventDispatcher<GlobalEvents<TButton, TStick, TPointer>> {
    readonly gfx: Renderer;
    #timeController: TimeController;
    input: InputManager<TButton, TStick, TPointer>;
    [TRANSFORM_VERSION_MANAGER_SYMBOL] = new GameObjVersionManager();
    #systems: [name: string, sys: System][] = [];
    root: GameObj<any>;
    constructor(options: NovaOptions<TButton, TStick, TPointer>) {
        super();
        this.input = new InputManager(
            this,
            options,
            this.gfx = new Renderer(
                this,
                options,
            ),
        );
        this.root = new GameObjRaw(this, null as any, 0, [], []);
        (this.#timeController = new TimeController(this, options)).start(
            dt => this.#fixedTick(dt),
            dt => this.#frameMain(dt),
        );
    }
    quit() {
        this.#timeController.destroy();
        this.root.destroy();
        this.input.destroy();
        this.gfx.destroy();
    }
    fatalError(err: any): never {
        this.#timeController.shouldStop = true;
        this.gfx.backgroundColor = COLOR_BLUE;
        // TODO: draw bluescreen
        const error = err instanceof Error ? err : new Error(String(err));
        this.emit("error", error);
        throw error;
    }
    #frameMain(dt: number) {
        try {
            this.input.update();
            // Update root object
            this.emit("beforeupdate", dt);
            this.#systems.forEach(pair => pair[1].beforeUpdate(dt));
            this.root.update(dt);
            this.#systems.forEach(pair => pair[1].afterUpdate(dt));
            this.emit("afterupdate", dt);
            // Draw
            const r = this.gfx;
            r.doFrame(() => {
                this.emit("beforedraw", r);
                this.#systems.forEach(pair => pair[1].beforeDraw(r));
                // TODO: transform root, draw root
                r.drawMesh(new Mesh(
                    r.defaultVertexFormat,
                    [
                        { x: 100, y: 100, r: 255, g: 0, b: 0 }, // topleft
                        { x: 200, y: 100, r: 0, g: 255, b: 0 }, // topright
                        { x: 200, y: 200, r: 0, g: 0, b: 255 }, // bottomright
                        { x: 100, y: 200 }, // bottomleft
                    ],
                    [0, 1, 3, 1, 2, 3]
                ));
                r.drawMesh(new Mesh(
                    r.defaultVertexFormat,
                    [
                        { x: 300, y: 100, r: 255, g: 0, b: 0 }, // topleft
                        { x: 500, y: 100, r: 0, g: 255, b: 0 }, // topright
                        { x: 500, y: 200, r: 0, g: 0, b: 255 }, // bottomright
                        { x: 300, y: 300 }, // bottomleft
                    ],
                    [0, 1, 3, 1, 2, 3]
                ));
                this.#systems.forEach(pair => pair[1].afterDraw(r));
                this.emit("afterdraw", r);
            });
        } catch (e) {
            this.fatalError(e);
        }
    }
    #fixedTick(dt: number) {
        try {
            this.emit("beforefixedtick", dt);
            this.#systems.forEach(pair => pair[1].beforeFixedTick(dt));
            this.root.fixedTick(dt);
            this.#systems.forEach(pair => pair[1].afterFixedTick(dt));
            this.emit("afterfixedtick", dt);
        } catch (e) {
            this.fatalError(e);
        }
    }
    system(name: string, implementation: System) {

        const index = this.#systems.findIndex(i => i[0] === name);
        if (index < 0) this.#systems.push([name, implementation]);
        else this.#systems[index]![1] = implementation;
    }
}
