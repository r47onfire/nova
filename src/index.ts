import { COLOR_BLUE } from "@r47onfire/game-math";
import { GameObjEvents } from "./ecs/entity/GameObjEvents";
import { GameObj } from "./ecs/entity/GameObjType";
import { GameObjRaw } from "./ecs/entity/GameObj";
import { GameObjVersionManager, TRANSFORM_VERSION_MANAGER_SYMBOL } from "./ecs/entity/VersionManager";
import { EventDispatcher } from "./events";
import { InputEvents, InputManager, InputManagerOptions } from "./input/InputManager";
import { TimeController, TimeControllerOptions } from "./loop/TimeController";
import { Mesh } from "./rendering/Mesh";
import { Renderer, RendererOptions } from "./rendering/Renderer";
import { System } from "./ecs/systems/System";
export * from "@r47onfire/game-math";

export interface NovaOptions extends RendererOptions, InputManagerOptions, TimeControllerOptions {

}

type GlobalEvents = {
    loaded: void;
    loaderror: [resourceID: string, failure: any];
    loadprogress: [loaded: number, toLoad: number];
    error: Error;
    sceneLeave: string;
    sceneEnter: string;
    resize: void;
    beforeupdate: number;
    afterupdate: number;
    beforedraw: Renderer;
    afterdraw: Renderer;
    beforefixedtick: number;
    afterfixedtick: number;
} & WithObject<GameObjEvents> & InputEvents;

type WithObject<T> = { [K in keyof T]: T[K] extends void ? GameObj : [GameObj, T[K]] };

export default class Nova extends EventDispatcher<GlobalEvents> {
    readonly renderer: Renderer;
    #timeController: TimeController;
    #inputManager: InputManager;
    [TRANSFORM_VERSION_MANAGER_SYMBOL] = new GameObjVersionManager();
    #inputEventQueue: { [K in keyof GlobalEvents]: [K, GlobalEvents[K]] }[keyof GlobalEvents][] = [];
    #systems: [name: string, sys: System][] = [];
    root: GameObj<any>;
    constructor(options: NovaOptions) {
        super();
        this.renderer = new Renderer(
            options,
            () => this.#queueInputEvent("resize"),
        );
        this.#timeController = new TimeController(options);
        this.#inputManager = new InputManager(
            options,
            this.renderer.canvas,
            (name, arg) => this.#queueInputEvent(name, arg),
        );
        this.root = new GameObjRaw(this, null as any, 0, [], []);
        this.#timeController.start(
            dt => this.#fixedTick(dt),
            dt => this.#frameMain(dt),
        );
    }
    #queueInputEvent<N extends keyof GlobalEvents>(name: N & (GlobalEvents[N] extends void ? N : never)): void;
    #queueInputEvent<N extends keyof GlobalEvents>(name: N, arg: GlobalEvents[N]): void;
    #queueInputEvent(name: keyof GlobalEvents, arg?: any) {
        this.#inputEventQueue.push([name, arg] as any);
    }
    bluescreen(err: any): never {
        this.#timeController.shouldStop = true;
        this.renderer.backgroundColor = COLOR_BLUE;
        // TODO: draw bluescreen
        const error = err instanceof Error ? err : new Error(String(err));
        this.emit("error", error);
        throw error;
    }
    #frameMain(dt: number) {
        try {
            this.#drainInputEventQueue();
            // Update systems
            // Update root object
            this.emit("beforeupdate", dt);
            this.#systems.forEach(pair => pair[1].beforeUpdate(dt));
            this.root.update(dt);
            this.#systems.forEach(pair => pair[1].afterUpdate(dt));
            this.emit("afterupdate", dt);
            // Draw
            const r = this.renderer;
            r.doFrame(() => {
                this.emit("beforedraw", r);
                this.#systems.forEach(pair => pair[1].beforeDraw(r));
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
            this.bluescreen(e);
        }
    }
    #fixedTick(dt: number) {
        try {
            this.emit("beforefixedtick", dt);
            this.#systems.forEach(pair => pair[1].beforeFixedUpdate(dt));
            this.root.fixedUpdate(dt);
            this.#systems.forEach(pair => pair[1].afterFixedUpdate(dt));
            this.emit("afterfixedtick", dt);
        } catch (e) {
            this.bluescreen(e);
        }
    }
    #drainInputEventQueue() {
    }
}
