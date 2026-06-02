import { COLOR_BLUE, COLOR_WHITE } from "@r47onfire/game-math";
import { GameObjEvents } from "./ecs/entity/GameObjEvents";
import { GameObj } from "./ecs/entity/GameObjType";
import { GameObjVersionManager, TRANSFORM_VERSION_MANAGER_SYMBOL } from "./ecs/entity/VersionManager";
import { EventDispatcher } from "./events";
import { InputEvents, InputManager, InputManagerOptions } from "./input/InputManager";
import { TimeController } from "./loop/TimeController";
import { Mesh } from "./rendering/Mesh";
import { Renderer, RendererOptions } from "./rendering/Renderer";
import { BlendMode } from "./rendering/Shader";
export * from "@r47onfire/game-math";

export interface NovaOptions extends RendererOptions, InputManagerOptions {

}

type GlobalEvents = {
    loaded: void;
    loadError: [resourceID: string, failure: any];
    loadProgress: [loaded: number, toLoad: number];
    error: Error;
    sceneLeave: string;
    sceneEnter: string;
    resize: void;
} & WithObject<GameObjEvents> & InputEvents;

type WithObject<T> = { [K in keyof T]: T[K] extends void ? GameObj : [GameObj, T[K]] };

export default class Nova extends EventDispatcher<GlobalEvents> {
    readonly renderer: Renderer;
    #timeController = new TimeController();
    #inputManager: InputManager;
    [TRANSFORM_VERSION_MANAGER_SYMBOL] = new GameObjVersionManager();
    #inputEventQueue: { [K in keyof GlobalEvents]: [K, GlobalEvents[K]] }[keyof GlobalEvents][] = [];
    constructor(options: NovaOptions) {
        super();
        this.renderer = new Renderer(options, () => this.#queueInputEvent("resize"));
        this.#inputManager = new InputManager(options, this.renderer.canvas, (name, arg) => this.#queueInputEvent(name, arg));
        this.#timeController.start(dt => this.#mainloop(dt));
    }
    #queueInputEvent<N extends keyof GlobalEvents>(name: N & (GlobalEvents[N] extends void ? N : never)): void;
    #queueInputEvent<N extends keyof GlobalEvents>(name: N, arg: GlobalEvents[N]): void;
    #queueInputEvent(name: keyof GlobalEvents, arg?: any) {
        this.#inputEventQueue.push([name, arg]);
    }
    bluescreen(err: any): never {
        this.#timeController.shouldStop = true;
        this.renderer.backgroundColor = COLOR_BLUE;
        // TODO: draw bluescreen
        const error = err instanceof Error ? err : new Error(String(err));
        this.emit("error", error);
        throw error;
    }
    #mainloop(dt: number) {
        // Update systems
        // Update root object
        // Draw
        this.renderer.doFrame(() => {
            this.renderer.drawMesh(new Mesh(
                this.renderer.defaultVertexFormat,
                [
                    { x: 100, y: 100, r: 255, g: 0, b: 0 }, // topleft
                    { x: 200, y: 100, r: 0, g: 255, b: 0 }, // topright
                    { x: 200, y: 200, r: 0, g: 0, b: 255 }, // bottomright
                    { x: 100, y: 200 }, // bottomleft
                ],
                [0, 1, 3, 1, 2, 3]
            ));
            this.renderer.drawMesh(new Mesh(
                this.renderer.defaultVertexFormat,
                [
                    { x: 300, y: 100, r: 255, g: 0, b: 0 }, // topleft
                    { x: 500, y: 100, r: 0, g: 255, b: 0 }, // topright
                    { x: 500, y: 200, r: 0, g: 0, b: 255 }, // bottomright
                    { x: 300, y: 300 }, // bottomleft
                ],
                [0, 1, 3, 1, 2, 3]
            ));
        });
    }
}
