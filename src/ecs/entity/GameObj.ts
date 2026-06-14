import { Color, Mat23, Mat23_copyFrom, Mat23_getRotation, Mat23_getScale, Mat23_inverse, Mat23_rotateSelf, Mat23_scaleSelfV, Mat23_skewSelfV, Mat23_transformPointV_m, Mat23_translateSelfV, Vec2, Vec2_copy, Vec2_invScale, Vec2_scale_m } from "@r47onfire/game-math";
import { isArray, last } from "lib0/array";
import { stringify } from "lib0/json";
import Nova from "../..";
import { EventDispatcher, EventSubscriptionController } from "../../events";
import { Renderer } from "../../rendering/Renderer";
import { RenderModifiers } from "../../rendering/RenderModifiers";
import { BlendMode } from "../../rendering/Shader";
import { Stencil } from "../../rendering/stencil";
import { tsortComps } from "../../utils/tsort";
import { allCompKeys, AlreadyBoundComp, Comp, getPropertyDescriptor, isCompDescriptor, type CompID } from "../components/Comp";
import { type GameObjEvents } from "./GameObjEvents";
import { type GameObj } from "./GameObjType";
import { nextTransformVersion, nextTreeIndex, TRANSFORM_VERSION_MANAGER_SYMBOL, transformNeedsUpdate } from "./VersionManager";

export type Tag = `#${string}:${string}`;

var id = 1;

export class GameObjRaw extends EventDispatcher<GameObjEvents> {
    /**
     * The unique id of the game object. Will be null if the object is destroyed
     * (e.g. {@link destroy()} has been called).
     */
    id: number | null;
    readonly GAME: Nova;
    name: string | undefined;
    constructor(
        game: Nova<any, any, any>,
        parent: GameObj,
        id: number,
        comps: Comp[],
        tags: Tag[],
    ) {
        super();
        this.GAME = game;
        this.id = id;
        this.parent = parent;
        this.emit("add");
        for (const comp of tsortComps(comps, c => c.id, c => c.require)) {
            this.use(comp);
        }
        for (const tag of tags) {
            this.tag(tag);
        }
    }
    #parent!: GameObj | null;
    #children: GameObj[] = [];
    /**
     * Get all children game objects.
     */
    get children(): readonly GameObj[] { return this.#children; }
    /**
     * Get or set the parent game object.
     */
    set parent(newParent: GameObj) {
        if (this.id === null) this.GAME.fatalError("can't re-parent destroyed object");
        if (this.#parent === newParent) return; // noop
        if (this.#parent) {
            const c: GameObj[] = this.#parent.#children;
            const i = c.indexOf(this);
            if (i >= 0) c.splice(i, 1);
        }
        if (newParent) {
            const oldPaused = this.isPaused();
            const oldHidden = this.isHidden();
            (this.#parent = newParent).#children.push(this);
            this.#dirtyTransform();
            this.#pausedChanged(oldPaused, this.isPaused());
            this.#hiddenChanged(oldHidden, this.isHidden());
        }
    }
    /**
     * Set the parent game obj with options to keep transformations.
     */
    setParent(newParent: GameObj, keepPosition = false, keepAngle = false, keepScale = false) {
        if (this.#parent === newParent) return;
        const oldTransform = this.#parent!.#transformMatrix;
        const newTransform = newParent.#transformMatrix;
        if (keepPosition) {
            const p = this.pos;
            Mat23_transformPointV_m(oldTransform, p, p);
            Mat23_transformPointV_m(Mat23_inverse(newTransform), p, p);
        }
        if (keepAngle) {
            this.angle += Mat23_getRotation(newTransform) - Mat23_getRotation(oldTransform);
        }
        if (keepScale) {
            const s = this.scale;
            Vec2_scale_m(s, Vec2_invScale(Mat23_getScale(oldTransform), Mat23_getScale(newTransform)), s);
        }
        this.parent = newParent;
    }
    get parent() { return this.#parent!; }
    #paused = false;
    #hidden = false;
    /**
     * If the game object should update itself or its children.
     */
    get paused() { return this.#paused; }
    set paused(value) { const old = this.#paused; this.#pausedChanged(old, this.#paused = value); }
    /**
     * If the game object should draw itself or its children.
     */
    get hidden() { return this.#hidden; }
    set hidden(value) { const old = this.#hidden; this.#hiddenChanged(old, this.#hidden = value); }
    #pausedChanged(oldValue: boolean, newValue: boolean) {
        if (oldValue === newValue) return;
        const eventName = newValue ? "pause" : "unpause";
        const recurse = (obj: GameObj, first = false) => {
            obj.emit(eventName);
            if (obj.paused && !first) return;
            obj.children.forEach(c => recurse(c));
        };
        recurse(this, true);
    }
    #hiddenChanged(oldValue: boolean, newValue: boolean) {
        if (oldValue === newValue) return;
        const eventName = newValue ? "hide" : "show";
        const recurse = (obj: GameObj, first = false) => {
            obj.emit(eventName);
            if (obj.hidden && !first) return;
            obj.children.forEach(c => recurse(c));
        };
        recurse(this, true);
    }
    isPaused(): boolean {
        return this.#paused || (this.#parent?.isPaused() ?? false);
    }
    isHidden(): boolean {
        return this.#hidden || (this.#parent?.isHidden() ?? false);
    }
    /**
     * Add a child.
     *
     * @param comps - The components to add.
     * @param tags - The tags to add.
     *
     * @returns The added game object.
     */
    add<T extends Comp[]>(comps: [...T], tags: Tag[]): GameObj<T> {
        if (this.id === null) this.GAME.fatalError("can't add child to destroyed object");
        return new GameObjRaw(this.GAME, this, id++, comps, tags) as GameObj<T>;
    }
    /**
     * Remove and re-add the game obj, without triggering add / destroy events.
     *
     * @returns The re-added game object.
     * @since v3000.0
     */
    readd<T extends GameObj<any>>(obj: T): T {
        const c = this.#children;
        const idx = c.indexOf(obj);
        if (idx >= 0) {
            c.splice(idx, 1);
            c.push(obj);
        }
        return obj;
    }
    /**
     * Remove this game obj from the scene graph and mark it as permanently destroyed.
     */
    destroy() {
        this.parent = null as any;
        this.id = null;
        while (this.#children.length) this.#children.pop()!.destroy();
        [...this.#compStates.keys()].forEach(c => this.#removeComp(c));
        this.emit("destroy");
    }
    /**
     * Remove and {@link destroy} all children.
     * 
     * If tag is provided, only the children with that tag will be destroyed.
     */
    removeAll(tag?: Tag) {
        (tag ? this.get(tag) : this.#children.slice()).forEach(c => c.destroy());
    }
    /**
     * If game obj is attached to the scene graph.
     */
    exists() {
        return this.id !== null && this.#parent !== null;
    }
    /**
     * Check if is an ancestor (recursive parent) of another game object
     */
    isAncestorOf(obj: GameObj): boolean {
        const parent = obj.parent;
        return parent ? (parent === this || this.isAncestorOf(parent)) : false;
    }
    /**
     * Get a list of all game objs with certain tag.
     *
     * @param tag - The tag to get.
     * @param recurse - Whether to recurse into children.
     */
    get(tag: Tag, recurse = false): GameObj[] {
        return this.#children.flatMap(c => {
            const children = recurse ? c.get(tag, recurse) : [];
            return c.is(tag) ? [c, ...children] : children;
        });
    }
    #drawLayerIndex!: number;
    #layerIndex!: number;
    /**
     * Update this game object and all children game objects.
     *
     * @param dt - the time delta since the last update
     */
    update(dt: number) {
        if (this.paused) return;
        this.emit("update", dt);
        this.#drawLayerIndex = this.#layerIndex ?? (this.#parent ? this.#parent.#drawLayerIndex : /*this.GAME.layers.defaultIndex*/0);
        this.#children.slice().forEach(c => c.update(dt));
        this.#compStates.forEach(c => c.update(dt));
        // TODO: sync appearance to meshes
    }
    fixedTick(dt: number) {
        if (this.paused) return;
        this.emit("fixedupdate", dt);
        this.#children.slice().forEach(c => c.fixedTick(dt));
        this.#compStates.forEach(c => c.fixedTick(dt));
    }
    /**
     * Draw this game object only using the components and the draw handlers,
     * don't recurse into children
     */
    drawSelf(renderer: Renderer) {
        this.#compStates.forEach(c => c.draw(renderer));
        this.emit("draw", renderer);
    }
    /**
     * Draw this game object and all children, and sort on layer and z-index
     */
    drawTree(renderer: Renderer) {
        if (this.hidden) return;
        const objects: GameObj[] = [];
        this.#children.forEach(c => {
            if (!c.hidden) c.#collect(objects);
        });
        objects.sort((o1, o2) => {
            return (o1.#drawLayerIndex - o2.#drawLayerIndex) || (o1.zIndex ?? 0) - (o2.zIndex ?? 0);
        });
        const stencil = this.stencil;
        if (stencil !== Stencil.NONE) {
            renderer.drawStenciled(stencil, () => {
                renderer.pushMatrix(this.#transformMatrix);
                this.drawSelf(renderer);
                renderer.popTransform();
            }, () => {
                renderer.pushTransform();
                objects.forEach(o => {
                    renderer.transform = o.#transformMatrix;
                    o.drawSelf(renderer);
                });
                renderer.popTransform();
            });
        } else {
            renderer.pushMatrix(this.#transformMatrix);
            this.drawSelf(renderer);
            // TODO: handle layers here
            objects.forEach(obj => {
                if (obj.stencil !== Stencil.NONE) {
                    renderer.transform = obj.#parent!.#transformMatrix;
                    obj.drawTree(renderer);
                } else {
                    renderer.transform = obj.#transformMatrix;
                    obj.drawSelf(renderer);
                }
            });
            renderer.popTransform();
        }
    }
    #transformMatrix = new Mat23();
    get transform(): Readonly<Mat23> { return this.#transformMatrix; }
    set transform(m: Mat23) { Mat23_copyFrom(this.#transformMatrix, m); }
    /**
     * Gather debug info of all comps and tags
     */
    inspect(): string[] {
        const lines: string[] = [];
        for (const { 0: id, 1: comp } of this.#compStates) {
            const c = comp.inspect();
            if (c) {
                lines.push(`${id}: ${c}`);
            } else {
                lines.push(id);
            }
        }
        lines.push("");
        lines.push(...this.#tags);
        return lines;
    }
    /**
     * Draw debug info in inspect mode
     */
    drawInspect(renderer: Renderer) {
        if (this.hidden) return;
        this.#children.forEach(c => c.drawInspect(renderer));
        this.emit("drawinspect", renderer);
    }
    #transformVersion = 0;
    #treeIndex = 0;
    #dirtyTransform() {
        this.#transformVersion = nextTransformVersion(this.GAME[TRANSFORM_VERSION_MANAGER_SYMBOL]);
    }
    #transformTree(renderer: Renderer, parentUpdated: boolean) {
        const tvm = this.GAME[TRANSFORM_VERSION_MANAGER_SYMBOL];
        const selfOutOfDate = transformNeedsUpdate(tvm, this.#transformVersion);
        const updateNeeded = parentUpdated || selfOutOfDate;
        renderer.pushTransform();
        if (updateNeeded) {
            const t = renderer.transform;
            Mat23_translateSelfV(t, this.#pos);
            Mat23_rotateSelf(t, this.#angle);
            Mat23_scaleSelfV(t, this.#scale);
            Mat23_skewSelfV(t, this.#skew);
            Mat23_copyFrom(this.#transformMatrix, t);
            if (parentUpdated && !selfOutOfDate) this.#dirtyTransform();
        } else {
            renderer.transform = this.#transformMatrix;
        }
        this.#treeIndex = nextTreeIndex(tvm);
        this.#children.forEach(c => c.#transformTree(renderer, updateNeeded));
        renderer.popTransform();
    }
    #collect(objects: GameObj[]) {
        objects.push(this);
        if (this.stencil !== Stencil.NONE) return;
        this.#children.forEach(c => {
            if (!c.hidden) c.#collect(objects);
        });
    }
    #compIDs = new Set<CompID>();
    #compStates = new Map<CompID, AlreadyBoundComp>();
    #cleanups: Record<CompID, (() => void)[]> = {};
    #onCurrentCompCleanups: ((gc: (() => void)) => void)[] = [];
    #addComp(comp: AlreadyBoundComp) {
        const compID = comp.id;
        this.#compIDs.add(compID);
        this.#compStates.set(compID, comp);
        const gc: (() => any)[] = this.#cleanups[compID] = [];
        for (const name of allCompKeys(comp)) {
            const property = getPropertyDescriptor(comp, name);
            if (!property) continue;
            if (typeof property.value === "function") {
                // Bind methods to this, not the comp
                // @ts-expect-error
                comp[name] = comp[name].bind(this);
                // this is what turns Comp --> AlreadyBoundComp
            }
            if (property.get) {
                Object.defineProperty(comp, name, {
                    get: property.get.bind(this),
                });
            }
            if (property.set) {
                Object.defineProperty(comp, name, {
                    set: property.set.bind(this),
                });
            }
            if (isCompDescriptor(name)) {
                // do nothing, we already exist
            } else {
                // @ts-expect-error
                if (this[name] !== undefined) {
                    const originalComp = this.#compStates.values().find(c => name in c)?.id;
                    this.GAME.fatalError(
                        originalComp
                            ? `while adding comp ${stringify(compID)}: duplicate property ${stringify(name)} originally added by comp ${stringify(originalComp)}`
                            : `illegal property ${stringify(name)} on comp ${stringify(compID)}`);
                }
                // Assign comp fields to this
                Object.defineProperty(this, name, {
                    // @ts-ignore
                    get: () => comp[name],
                    // @ts-ignore
                    set: (val) => comp[name] = val,
                    configurable: true,
                    enumerable: property.enumerable,
                });
                gc.push(() => delete this[name as keyof this]);
            }
        }
        this.#onCurrentCompCleanups.push((e: any) => gc.push(e));
        comp.init();
        this.#onCurrentCompCleanups.pop();
        gc.push(comp.cleanup);
        this.emit("use", compID);
    }
    #removeComp(id: CompID) {
        this.#compIDs.delete(id);
        this.#compStates.delete(id);
        this.emit("unuse", id);
        if (this.#cleanups[id]) {
            this.#cleanups[id].forEach(c => c());
            delete this.#cleanups[id];
        }
    }
    #checkDependencies(newlyAddedComp: Comp) {
        for (var required of newlyAddedComp.require) {
            if (!this.#compIDs.has(required)) {
                // TODO: auto-add if it's allowed?
                this.GAME.fatalError(`can't add ${stringify(newlyAddedComp.id)}: ${stringify(required)} is required but not yet added`);
            }
        }
    }
    #checkDependents(id: CompID) {
        for (var comp of this.#compStates.values()) {
            if (comp.require && comp.require.includes(id)) {
                this.GAME.fatalError(`can't remove ${stringify(id)}}: it is required by ${stringify(comp.id)}`);
            }
        }
    }
    /**
     * Add a component.
     *
     * @example
     * ```js
     * const obj = game.root.add([
     *    sprite("bean"),
     * ]);
     *
     * // Add opacity
     * obj.use(opacity(0.5));
     * ```
     */
    use<T extends Comp>(comp: T): asserts this is GameObj<T> {
        if (!comp || typeof comp !== "object") {
            this.GAME.fatalError(`invalid comp type "${typeof comp}"`);
        }
        if (comp.id && this.has(comp.id)) {
            this.#removeComp(comp.id);
        }
        this.#checkDependencies(comp);
        this.#addComp(comp);
    }
    /**
     * Remove a component by id.
     *
     * @example
     * ```js
     * // Remove sprite component
     * obj.unuse("nova:sprite");
     * ```
     */
    unuse(id: CompID) {
        if (!this.has(id)) return;
        this.#checkDependents(id);
        this.#removeComp(id);
    }
    /**
     * Check if game object has a certain component.
     *
     * @param compList - The component id(s) to check.
     * @param all - whether to return true if the object has all the components (true, the default), or if the object has any of the components (false).
     *
     * @example
     * ```js
     * // Check if game object has the nova:sprite component
     * if (obj.has("nova:sprite")) {
     *     game.debug.log("has nova:sprite component");
     * }
     *
     * // Check if game object has tags
     * obj.has(["nova:sprite", "nova:area"]); // true if obj has both components, false otherwise
     * obj.has(["nova:sprite", "nova:area"], false); // false if obj has neither component, true otherwise
     * ```
     */
    has(compList: CompID | CompID[], all = true): boolean {
        if (isArray(compList)) {
            return compList[all ? "every" : "some"](c => this.has(c));
        }
        return this.#compStates.has(compList);
    }
    /**
     * Get state for a specific comp.
     *
     * @param id - The component id.
     */
    c(id: CompID): Comp | null {
        return this.#compStates.get(id) ?? null;
    }
    #tags = new Set<Tag>();
    /**
     * Get the tags of a game object. To update it, use {@link tag()} and {@link untag()}.
     */
    get tags(): ReadonlySet<Tag> { return this.#tags; }
    /**
     * Add a tag(s) to the game obj.
     *
     * @param tag - The tag(s) to add.
     *
     * @example
     * ```js
     * // add enemy tag
     * obj.tag("#game:enemy");
     *
     * // add multiple tags
     * obj.tag(["#game:enemy", "#game:boss"]);
     * ```
     */
    tag(tag: Tag | Tag[]) {
        if (isArray(tag)) {
            tag.forEach(t => this.tag(t));
            return;
        }
        this.#tags.add(tag);
        this.emit("tag", tag);
    }
    /**
     * Remove a tag(s) from the game obj.
     *
     * @param tag - The tag(s) to remove.
     *
     * @example
     * ```js
     * // remove enemy tag
     * obj.untag("#game:enemy");
     *
     * // remove multiple tags
     * obj.untag(["#game:enemy", "#game:boss"]);
     * ```
     */
    untag(tag: Tag | Tag[]) {
        if (isArray(tag)) {
            tag.forEach(t => this.untag(t));
            return;
        }
        this.#tags.delete(tag);
        this.emit("untag", tag);
    }
    /**
     * If there's certain tag(s) on the game obj.
     *
     * @param tag - The tag(s) for checking.
     * @param all - whether to return true if the object has all the tags (true, the default), or if the object has any of the tags (false).
     */
    is(tag: Tag | Tag[], all = true): boolean {
        if (isArray(tag)) {
            return tag[all ? "every" : "some"](t => this.is(t));
        }
        return this.#tags.has(tag);
    }
    /**
     * Register an event handler.
     *
     * @param event - The event name.
     * @param action - The action to run when event is triggered.
     */
    on<N extends keyof GameObjEvents>(name: N, action: (arg: GameObjEvents[N]) => void): EventSubscriptionController {
        const c = super.on(name, action.bind(this));
        last(this.#onCurrentCompCleanups)?.(c.stop);
        return c;
    }
    emit<N extends keyof GameObjEvents>(name: N & (GameObjEvents[N] extends void ? N : never)): void;
    emit<N extends keyof GameObjEvents>(name: N, arg: GameObjEvents[N]): void;
    emit(name: string, arg?: any): void {
        super.emit(name as any, arg);
        this.GAME.emit(name as any, [this, arg]);
    }

    mod: Omit<RenderModifiers, "tex"> = {
        color: new Color(255, 255, 255),
        opacity: 1,
        shader: undefined,
        blend: BlendMode.NORMAL,
        uniforms: {},
        fixed: false,
    };
    stencil = Stencil.NONE;
    #pos = new Vec2(0);
    get pos() { return this.#pos; }
    set pos(p) { Vec2_copy(p, this.#pos); this.#dirtyTransform(); }
    zIndex = 0;
    #scale = new Vec2(1);
    get scale() { return this.#scale; }
    set scale(s) { Vec2_copy(s, this.#scale); this.#dirtyTransform(); }
    #angle = 0;
    get angle() { return this.#angle; }
    set angle(a) { this.#angle = a; this.#dirtyTransform(); }
    #skew = new Vec2(0);
    get skew() { return this.#skew; }
    set skew(s) { Vec2_copy(s, this.#skew); this.#dirtyTransform(); }
}
