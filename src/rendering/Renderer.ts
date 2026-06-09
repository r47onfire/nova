import { Color, COLOR_BLACK, M23_IDENTITY, M4_IDENTITY, Mat23, Mat23_copyFrom, Mat23_transformPointV_m, Mat4, Quad, Vec2, Vec2_set } from "@r47onfire/game-math";
import { from, last } from "lib0/array";
import { isNumber } from "lib0/function";
import { min } from "lib0/math";
import { deepEqual, SCRATCH_POINT } from "../utils";
import { FrameBuffer } from "./FrameBuffer";
import { Mesh } from "./Mesh";
import { BlendMode, createShaderFromDefaultTemplate, Shader, UniformType } from "./Shader";
import { Stencil } from "./stencil";
import { TexFilter, Texture, TexWrapMode } from "./Texture";
import { VertexParameter } from "./vertex";

/**
 * Options for setting up the renderer
 */
export interface RendererOptions {
    /**
     * The number of screen pixels for every CSS pixel. For best performance don't go over 2.
     *
     * @default min(window.devicePixelRatio, 2)
     */
    pixelDensity?: number;
    /**
     * The number of times to scale down the screen, for pixel art style rendering. This is applied on top of the pixel density, so a scale of 2 with a pixel density of 2 would make each CSS pixel equal to 4x4 screen pixels.
     *
     * @default 1
     */
    scale?: number;
    /**
     * The container to inject the `<canvas>` into. If it is the `<body>` some css is added to make it full-window.
     *
     * @default document.body
     */
    root?: HTMLElement;
    /**
     * Default filter to use for textures
     *
     * @default TexFilter.NEAREST
     */
    texFilter?: TexFilter;
    /**
     * Background color to clear to
     */
    background?: Color;
}

export enum StackKind {
    TEXTURE_2D,
    VAO,
    FRAME_BUFFER,
    RENDER_BUFFER,
    VIEWPORT,
    SHADER_PROGRAM,
}

const SCREEN_TEX = Symbol("screen texture") as any as string;

type StackElementType<T extends StackKind> = {
    [StackKind.TEXTURE_2D]: WebGLTexture;
    [StackKind.VAO]: WebGLVertexArrayObject;
    [StackKind.FRAME_BUFFER]: WebGLFramebuffer;
    [StackKind.RENDER_BUFFER]: WebGLRenderbuffer;
    [StackKind.VIEWPORT]: { x: number; y: number; w: number; h: number };
    [StackKind.SHADER_PROGRAM]: WebGLProgram;
}[T];

/**
 * Encompasses all of the gfx stuff as well as render batching
 */
export class Renderer {
    readonly canvas: HTMLCanvasElement;
    readonly gl: WebGL2RenderingContext;
    #pixelDensity: number;
    #scale: number;
    #cleanups: (() => void)[] = [];
    readonly defTexFilter: TexFilter;
    #stacks: Partial<{ [k in StackKind]: StackElementType<k>[] }> = {};
    #setFuncs: { [k in StackKind]: (el: StackElementType<k> | null) => void };
    #defaultShader: Shader<typeof this["defaultVertexFormat"]>;
    #camMatrix: Mat4 = M4_IDENTITY;
    #namedShaders = new Map<string, Shader<any>>();
    #namedTextures = new Map<string, [tex: Texture, q: Quad]>();
    #frameBuffer!: FrameBuffer;
    #width = -1;
    #height = -1;
    #canvasScaleX = -1;
    #canvasScaleY = -1;
    #resizeObserver: ResizeObserver;
    backgroundColor: Color;
    readonly defaultVertexFormat = [
        new VertexParameter(
            "a_pos",
            ["x", "y", "z"],
            0,
            data => {
                Vec2_set(SCRATCH_POINT, data[0], data[1]);
                Mat23_transformPointV_m(this.transform, SCRATCH_POINT, SCRATCH_POINT);
                data[0] = SCRATCH_POINT.x;
                data[1] = SCRATCH_POINT.y;
            }
        ),
        new VertexParameter(
            "a_uv",
            ["u", "v"],
            Infinity, // inf == OOB, for primitives that don't set uv
            (data, _mod, quad) => {
                data[0] = quad.x + data[0] * quad.w;
                data[1] = quad.y + data[1] * quad.h;
            },
        ),
        new VertexParameter(
            "a_color",
            ["r", "g", "b", "a"],
            [255, 255, 255, 1],
            (data, { color, opacity }) => {
                if (color) {
                    // Multiply the two
                    data[0] *= color.r / 255;
                    data[1] *= color.g / 255;
                    data[2] *= color.b / 255;
                }
                // and then normalize to 0-1
                data[0] /= 255;
                data[1] /= 255;
                data[2] /= 255;
                // Opacity is already normalized to 0-1
                if (opacity !== undefined) data[3] *= opacity;
            }
        ),
    ] as const;
    constructor(options: RendererOptions, onResizedCallback: () => void) {
        this.#pixelDensity = options.pixelDensity ?? min(devicePixelRatio, 2);
        this.#scale = options.scale ?? 1;
        this.defTexFilter = options.texFilter ?? TexFilter.NEAREST;
        const root = options.root ?? document.body;

        if (root === document.body) {
            root.style.cssText = "width:100%;height:100%;margin:0";
            document.documentElement.style.cssText = "width:100%;height:100%";
        }

        const canvas = this.canvas = document.createElement("canvas");
        root.append(canvas);

        // Crisp: chrome only supports pixelated and firefox only supports crisp-edges
        canvas.style.cssText = "outline:none;cursor:default;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges";

        // Makes canvas focusable
        canvas.tabIndex = 0;

        // Get context
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            depth: true,
            stencil: true,
            alpha: true,
            preserveDrawingBuffer: true,
        });
        if (!gl) {
            throw new Error("WebGL 2 not supported (what?!)");
        }
        this.gl = gl;
        const { TEXTURE_2D, FRAMEBUFFER, RENDERBUFFER, DITHER } = gl;
        gl.enable(DITHER);

        this.#setFuncs = {
            [StackKind.TEXTURE_2D](tex) {
                gl.bindTexture(TEXTURE_2D, tex);
            },
            [StackKind.VAO](vao) {
                gl.bindVertexArray(vao);
            },
            [StackKind.FRAME_BUFFER](fb) {
                gl.bindFramebuffer(FRAMEBUFFER, fb);
            },
            [StackKind.RENDER_BUFFER](rb) {
                gl.bindRenderbuffer(RENDERBUFFER, rb);
            },
            [StackKind.VIEWPORT](vp) {
                if (!vp) return;
                const { x, y, w, h } = vp;
                gl.viewport(x, y, w, h);
            },
            [StackKind.SHADER_PROGRAM](sh) {
                gl.useProgram(sh);
            }
        };

        this.#defaultShader = createShaderFromDefaultTemplate(this, null, null, 2048 * 8, 2048 * 6);

        const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;

        this.push(StackKind.VIEWPORT, { x: 0, y: 0, w, h });

        var { offsetWidth: lastWidth, offsetHeight: lastHeight } = canvas;
        (this.#resizeObserver = new ResizeObserver(_ => {
            if (lastWidth === canvas.offsetWidth && lastHeight === canvas.offsetHeight) return;
            lastWidth = canvas.offsetWidth;
            lastHeight = canvas.offsetHeight;
            this.#resizeFrameBuffer();
            onResizedCallback();
        })).observe(canvas);

        this.backgroundColor = options.background ?? COLOR_BLACK;

        this.#resizeFrameBuffer();

    }
    #resizeFrameBuffer() {
        const canvas = this.canvas, pixelDensity = this.#pixelDensity, scale = this.#scale;
        canvas.width = canvas.offsetWidth * pixelDensity;
        canvas.height = canvas.offsetHeight * pixelDensity;
        this.#canvasScaleX = canvas.width / pixelDensity / canvas.offsetWidth;
        this.#canvasScaleY = canvas.height / pixelDensity / canvas.offsetHeight;
        const { drawingBufferWidth: w, drawingBufferHeight: h } = this.gl;
        this.#frameBuffer?.free();
        const fbTex = new Texture(this, w, h, TexFilter.NEAREST, TexWrapMode.CLAMP);
        this.#namedTextures.set(SCREEN_TEX, [fbTex, new Quad(0, 0, 1, 1)]);
        this.#frameBuffer = new FrameBuffer(this, fbTex);
        this.#width = canvas.offsetWidth / scale;
        this.#height = canvas.offsetHeight / scale;
    }
    push<K extends StackKind>(kind: K, entry: StackElementType<K>) {
        (this.#stacks[kind] ??= [] as any[]).push(entry);
        this.#setFuncs[kind](entry);
    }
    pop<K extends StackKind>(kind: K) {
        const stack = (this.#stacks[kind] ??= [] as any[]);
        stack.pop();
        this.#setFuncs[kind](last(stack) ?? null);
    }
    get<K extends StackKind>(kind: K): StackElementType<K> {
        const s = this.#stacks[kind];
        if (!s || !s.length) throw new Error("stack " + StackKind[kind] + " is empty");
        return last(s);
    }
    // Private counter
    #drawCalls = 0;
    // Public mirror
    lastDrawCalls = 0;
    #transformStack = from({ length: 32 }, () => new Mat23);
    #transformStackIndex = 0;
    #transform = new Mat23;
    get transform(): Mat23 {
        return this.#transform;
    }
    set transform(m: Mat23) {
        Mat23_copyFrom(this.#transform, m);
    }
    #startFrame() {
        const gl = this.gl;
        const { r, g, b } = this.backgroundColor;
        gl.clearColor(r, g, b, 1);
        // clear screen
        gl.clear(gl.COLOR_BUFFER_BIT);
        // clear framebuffer
        this.#frameBuffer.bind();
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.#drawCalls = 0;
        // Clear active transform
        this.#transformStackIndex = 0;
        this.transform = M23_IDENTITY;
    }
    #endFrame() {
        this.#flush();
        this.lastDrawCalls = this.#drawCalls;
        this.#frameBuffer.unbind();
        const gl = this.gl;
        const { drawingBufferWidth, drawingBufferHeight } = gl;
        gl.viewport(0, 0, drawingBufferWidth, drawingBufferHeight);
        // Draw post effect shader(s)
        const w = this.#width, h = this.#height;
        this.drawMesh(new Mesh(
            this.defaultVertexFormat,
            [
                { x: 0, y: 0, u: 0, v: 1 }, // topleft
                { x: w, y: 0, u: 1, v: 1 }, // topright
                { x: w, y: h, u: 1, v: 0 }, // bottomright
                { x: 0, y: h, u: 0, v: 0 }, // bottomleft
            ],
            [0, 1, 3, 1, 2, 3],
            {
                tex: SCREEN_TEX,
                // TODO: put postEffect shader in here
                fixed: true,
            }
        ));
        this.#flush();
    }
    doFrame(frameCb: () => void) {
        this.#startFrame();
        try { frameCb(); }
        finally { this.#endFrame(); }
    }
    #sameGPUTexture(a: string | undefined, b: string | undefined) {
        const ta = this.#namedTextures.get(a!);
        const tb = this.#namedTextures.get(b!);
        if (!ta || !tb) return ta === tb;
        return ta[0] === tb[0];
    }
    #sameMeshFormat(a: Mesh<any>, b: Mesh<any>) {
        const am = a.mod, bm = b.mod;
        return (am === bm
            || (
                am.fixed === bm.fixed
                && am.shader === bm.shader
                && am.blend === bm.blend
                && this.#sameGPUTexture(am.tex, bm.tex)
                && deepEqual(am.uniforms, bm.uniforms)))
            && deepEqual(a.format, b.format);
    }
    #currentMeshForFormat: Mesh<any> | null = null;
    #vertexDataQueue: number[] = [];
    #indexQueue: number[] = [];
    #chunkLengthsQueue: [vertices: number, indices: number][] = [];
    drawMesh(mesh: Mesh<any>) {
        const { vertices, indices, format, mod } = mesh;
        if (!(vertices.length && indices.length)) return;
        // If it's the same everything, just append to the current queue
        // Otherwise, flush and start a new one
        if (this.#currentMeshForFormat && !this.#sameMeshFormat(mesh, this.#currentMeshForFormat)) this.#flush();
        this.#currentMeshForFormat = mesh;
        const texQuad = this.#namedTextures.get(mod.tex!)?.[1] ?? new Quad(0, 0, 1, 1);
        const startVLength = this.#vertexDataQueue.length;
        const data: number[] = [];
        for (var v = 0; v < vertices.length; v++) {
            const vertex = vertices[v]!;
            for (var p = 0; p < format.length; p++) {
                const { fields, fill, transform } = format[p]!;
                for (var i = 0; i < fields.length; i++) {
                    const field = fields[i]!;
                    data.push(vertex[field] ?? (isNumber(fill) ? fill : fill?.[i] ?? 0));
                }
                transform?.(data, mod, texQuad);
                for (var i = 0; i < data.length; i++) this.#vertexDataQueue.push(data[i]!);
                data.length = 0;
            }
        }
        this.#indexQueue.push(...indices);
        this.#chunkLengthsQueue.push([this.#vertexDataQueue.length - startVLength, indices.length]);
    }
    #flush() {
        if (!this.#currentMeshForFormat) return;
        if (!this.#indexQueue.length || !this.#vertexDataQueue.length) return;
        const gl = this.gl;
        const { ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER, TRIANGLES, UNSIGNED_SHORT } = gl;
        const { shader, tex, fixed, uniforms, blend } = this.#currentMeshForFormat.mod;
        const theShader = this.#namedShaders.get(shader!) ?? this.#defaultShader;
        const theTexture = this.#namedTextures.get(tex!)?.[0];
        theShader.bind();
        if (uniforms) theShader.send(uniforms);
        theShader.send({
            screensize: [UniformType.VEC2, new Vec2(this.#width, this.#height)],
            camera: [UniformType.MAT4, fixed ? M4_IDENTITY : this.#camMatrix],
            transform: [UniformType.MAT4, M4_IDENTITY],
            view: [UniformType.MAT4, M4_IDENTITY],
            u_tex: [UniformType.INT, 0],
        });
        theTexture?.bind();
        this.#setBlend(blend ?? BlendMode.NORMAL);
        const { maxVert: maxVertices, maxIndex: maxIndices } = theShader;
        const chunkLengths = this.#chunkLengthsQueue;
        const allVertices = this.#vertexDataQueue;
        const allIndices = this.#indexQueue;
        const verticesChunk: number[] = [];
        const indicesChunk: number[] = [];
        var lengthsIndex = 0, verticesIndex = 0, indicesIndex = 0;
        for (; lengthsIndex < chunkLengths.length;) {
            // get chunks until we're about to be longer than the max allowed by the shader
            for (; lengthsIndex < chunkLengths.length; lengthsIndex++) {
                const ls = chunkLengths[lengthsIndex]!, vLen = ls[0], iLen = ls[1];
                if (verticesChunk.length + vLen > maxVertices || indicesChunk.length + iLen > maxIndices) break;
                const offset = verticesChunk.length / theShader.stride;
                for (var i = 0; i < vLen; i++) {
                    verticesChunk.push(allVertices[i + verticesIndex]!);
                }
                for (var i = 0; i < iLen; i++) {
                    indicesChunk.push(allIndices[i + indicesIndex]! + offset);
                }
                verticesIndex += vLen;
                indicesIndex += iLen;
            }
            gl.bufferSubData(ARRAY_BUFFER, 0, new Float32Array(verticesChunk));
            gl.bufferSubData(ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(indicesChunk));
            gl.drawElements(TRIANGLES, indicesChunk.length, UNSIGNED_SHORT, 0);
            this.#drawCalls++;
            verticesChunk.length = indicesChunk.length = 0;
        }
        chunkLengths.length = allVertices.length = allIndices.length = 0;
        theTexture?.unbind();
        theShader.unbind();
        this.#currentMeshForFormat = null;
    }
    #setBlend(blend: BlendMode) {
        const gl = this.gl;
        const { ZERO, ONE, ONE_MINUS_DST_COLOR, ONE_MINUS_SRC_ALPHA, DST_COLOR } = gl;
        const bf = ({
            [BlendMode.NORMAL]: [ONE, ONE_MINUS_SRC_ALPHA, ONE, ONE_MINUS_SRC_ALPHA],
            [BlendMode.ADD]: [ONE, ONE, ONE, ONE_MINUS_SRC_ALPHA],
            [BlendMode.MULTIPLY]: [DST_COLOR, ZERO, ONE, ONE_MINUS_SRC_ALPHA],
            [BlendMode.SCREEN]: [ONE_MINUS_DST_COLOR, ONE, ONE, ONE_MINUS_SRC_ALPHA],
            [BlendMode.OVERLAY]: [DST_COLOR, ONE_MINUS_SRC_ALPHA, ONE, ONE_MINUS_SRC_ALPHA],
        } satisfies Record<BlendMode, Parameters<WebGL2RenderingContext["blendFuncSeparate"]>>)[blend];
        gl.blendFuncSeparate(bf[0], bf[1], bf[2], bf[3]);
    }
    destroy() {
        this.#cleanups.forEach(cleanup => cleanup());
        this.gl.getExtension("WEBGL_lose_context")?.loseContext();
        this.#resizeObserver.disconnect();
        // Cause an error if it tries to be used again
        (this as any).gl = null;
        this.#cleanups.length = 0;
    }
    /**
     * @private
     */
    addCleanup(cleanup: () => void) {
        this.#cleanups.push(cleanup);
    }
    #textureNumberMap = new Map<Texture, number>;
    #textureNumberCounter = 1;
    /**
     * @private
     */
    textureNumber(texName: string): [number, Vec2 | null, Vec2 | null] {
        const texInfo = this.#namedTextures.get(texName);
        if (!texInfo) return [-1, null, null];
        const tex = texInfo[0], quad = texInfo[1];
        var n = this.#textureNumberMap.get(tex);

        if (n === undefined) {
            // Assign new unit
            n = this.#textureNumberCounter++;

            // Check if this unit is actually available
            const gl = this.gl;
            if (gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) < n) {
                throw new Error("too many textures as uniforms");
            }

            // Assign texture to unit
            gl.activeTexture(gl.TEXTURE0 + n);
            gl.bindTexture(gl.TEXTURE_2D, tex.glTex);
            gl.activeTexture(gl.TEXTURE0);

            // Remember location
            this.#textureNumberMap.set(tex, n);
        }

        return [n, new Vec2(quad.x, quad.y), new Vec2(quad.w, quad.h)];
    }
    drawStenciled(stencil: Stencil, mask: () => void, content: () => void) {
        this.#flush();

        const gl = this.gl;
        const { STENCIL_BUFFER_BIT, STENCIL_TEST, NEVER, NOTEQUAL, EQUAL, REPLACE, KEEP } = gl;

        gl.clear(STENCIL_BUFFER_BIT);
        gl.enable(STENCIL_TEST);

        // don't perform test, pure write
        gl.stencilFunc(NEVER, 1, 255);

        // always replace since we're writing to the buffer
        gl.stencilOp(REPLACE, REPLACE, REPLACE);

        mask();
        this.#flush();

        // perform test
        gl.stencilFunc(
            stencil === Stencil.SUBTRACT ? NOTEQUAL
                : stencil === Stencil.INTERSECT ? EQUAL : NEVER,
            1,
            255);

        // don't write since we're only testing
        gl.stencilOp(KEEP, KEEP, KEEP);

        content();
        this.#flush();
        gl.disable(STENCIL_TEST);
    }

    pushTransform() {
        Mat23_copyFrom(this.#transformStack[++this.#transformStackIndex] ??= new Mat23, this.#transform);
    }
    popTransform() {
        if (this.#transformStackIndex >= 0) {
            Mat23_copyFrom(this.#transform, this.#transformStack[this.#transformStackIndex--]!);
        }
    }
    pushMatrix(m: Mat23) {
        this.pushTransform();
        Mat23_copyFrom(this.#transform, m);
    }
}
