import { Color, Mat23, Mat4, Mat4_from_Mat23, Vec2, Vec3 } from "@r47onfire/game-math";
import fragTemplate from "./fragmentTemplate.glsl";
import { Renderer, StackKind } from "./Renderer";
import { VertexFormat } from "./vertex";
import vertTemplate from "./vertexTemplate.glsl";

export enum UniformType {
    FLOAT,
    FLOAT_ARRAY,
    INT,
    INT_ARRAY,
    VEC2,
    VEC2_ARRAY,
    VEC3,
    COLOR,
    COLOR_ARRAY,
    MAT23,
    MAT4,
    SAMPLER2D,
}

export enum BlendMode {
    NORMAL,
    ADD,
    MULTIPLY,
    SCREEN,
    OVERLAY,
}

type UniformValue<T extends UniformType> = {
    [UniformType.FLOAT]: [number],
    [UniformType.FLOAT_ARRAY]: [number[] | Float32Array],
    [UniformType.INT]: [number],
    [UniformType.INT_ARRAY]: [number[] | Int32Array],
    [UniformType.VEC2]: [Vec2],
    [UniformType.VEC2_ARRAY]: [Vec2[]],
    [UniformType.VEC3]: [Vec3],
    [UniformType.COLOR]: [Color],
    [UniformType.COLOR_ARRAY]: [Color[]],
    [UniformType.MAT23]: [Mat23],
    [UniformType.MAT4]: [Mat4],
    [UniformType.SAMPLER2D]: [textureName: string, topleftUVUniform?: string, sizeUVUniform?: string],
}[T]

export type UniformEntry = {
    [K in UniformType]: [type: K, ...value: UniformValue<K>]
}[UniformType];

export type Uniforms = Record<string, UniformEntry>;

/** Manages the shader program and vertex array object for the format */
export class Shader<T extends VertexFormat<any>> {
    #renderer: Renderer;
    #glProgram: WebGLProgram;
    #glVAO: WebGLVertexArrayObject;
    #glVBO: WebGLBuffer;
    #glIBO: WebGLBuffer;
    readonly stride: number;

    constructor(renderer: Renderer, public readonly vert: string, public readonly frag: string, public readonly vFmt: T, public maxVert: number, public maxIndex: number) {
        this.#renderer = renderer;
        renderer.addCleanup(() => this.free());
        const gl = this.#renderer.gl;
        const { MAX_VERTEX_ATTRIBS, VERTEX_SHADER, FRAGMENT_SHADER, LINK_STATUS, ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER, DYNAMIC_DRAW, FLOAT } = gl;
        if (vFmt.length > gl.getParameter(MAX_VERTEX_ATTRIBS)) {
            throw new Error("too many attributes");
        }
        const vertShader = gl.createShader(VERTEX_SHADER);
        const fragShader = gl.createShader(FRAGMENT_SHADER);
        const prog = gl.createProgram();

        if (!vertShader || !fragShader) {
            throw new Error("failed to create shader programs");
        }
        gl.shaderSource(vertShader, vert);
        gl.shaderSource(fragShader, frag);
        gl.compileShader(vertShader);
        gl.compileShader(fragShader);
        gl.attachShader(prog, vertShader);
        gl.attachShader(prog, fragShader);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, LINK_STATUS)) {
            const vertError = gl.getShaderInfoLog(vertShader);
            if (vertError) throw new Error("Vertex shader compile error: " + vertError);
            const fragError = gl.getShaderInfoLog(fragShader);
            if (fragError) throw new Error("Fragment shader compile error: " + fragError);
            const linkError = gl.getProgramInfoLog(prog);
            if (linkError) throw new Error("Shader compile error " + linkError);
            throw new Error("Unknown shader error (gl.LINK_STATUS was false)");
        }

        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);

        this.#glProgram = prog;

        const vao = this.#glVAO = gl.createVertexArray()!;
        const stride = this.stride = vFmt.reduce((acc, param) => acc + param.fields.length, 0); // our stride is in floats, not bytes
        this.#renderer.push(StackKind.VAO, vao);
        const vbo = this.#glVBO = gl.createBuffer();
        const ibo = this.#glIBO = gl.createBuffer();
        gl.bindBuffer(ARRAY_BUFFER, vbo);
        gl.bufferData(ARRAY_BUFFER, 4 * maxVert, DYNAMIC_DRAW);
        gl.bindBuffer(ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(ELEMENT_ARRAY_BUFFER, 4 * maxIndex, DYNAMIC_DRAW);
        var offset = 0;
        for (var i = 0; i < vFmt.length; i++) {
            // For VAO
            const { attr, fields } = vFmt[i]!;
            gl.enableVertexAttribArray(gl.getAttribLocation(prog, attr));
            gl.vertexAttribPointer(i, fields.length, FLOAT, false, stride * 4, offset * 4); // * 4 because WebGL stride is in bytes, not floats
            offset += fields.length;
            // For shader
            gl.bindAttribLocation(prog, i, attr);
        }

        this.#renderer.pop(StackKind.VAO);
    }

    bind() {
        this.#renderer.push(StackKind.VAO, this.#glVAO);
        this.#renderer.push(StackKind.SHADER_PROGRAM, this.#glProgram);
    }

    unbind() {
        this.#renderer.pop(StackKind.VAO);
        this.#renderer.pop(StackKind.SHADER_PROGRAM);
    }

    send(uniforms: Uniforms) {
        const gl = this.#renderer.gl;
        for (const name in uniforms) {
            const uniform = uniforms[name]!, type = uniform[0]
            const loc = gl.getUniformLocation(this.#glProgram, name);
            switch (type) {
                case UniformType.FLOAT: gl.uniform1f(loc, uniform[1]); break;
                case UniformType.FLOAT_ARRAY: gl.uniform1fv(loc, uniform[1]); break;
                case UniformType.INT: gl.uniform1i(loc, uniform[1]); break;
                case UniformType.INT_ARRAY: gl.uniform1iv(loc, uniform[1]); break;
                case UniformType.VEC2: var { x, y } = uniform[1]; gl.uniform2f(loc, x, y); break;
                case UniformType.VEC2_ARRAY: gl.uniform2fv(loc, uniform[1].flatMap(({ x, y }) => [x, y])); break;
                case UniformType.VEC3: var { x, y, z } = uniform[1]; gl.uniform3f(loc, x, y, z); break;
                case UniformType.COLOR: var { r, g, b } = uniform[1]; gl.uniform3f(loc, r / 255, g / 255, b / 255); break;
                case UniformType.COLOR_ARRAY: gl.uniform3fv(loc, uniform[1].flatMap(({ r, g, b }) => [r / 255, g / 255, b / 255, 1])); break;
                // WebGL wants it in column major order
                case UniformType.MAT23: gl.uniformMatrix4fv(loc, false, Mat4_from_Mat23(uniform[1]).m); break;
                case UniformType.MAT4: gl.uniformMatrix4fv(loc, false, uniform[1].m); break;
                case UniformType.SAMPLER2D:
                    const data = this.#renderer.textureNumber(uniform[1]), texNum = data[0], topleftUV = data[1], sizeUV = data[2];
                    if (texNum === -1) {
                        console.warn(`tried to set uniform sampler2D ${name} to texture ${uniform[1]} that doesn't exist`);
                        break;
                    }
                    gl.uniform1i(loc, texNum);
                    if (uniform[2]) this.send({ [uniform[2]]: [UniformType.VEC2, topleftUV!] });
                    if (uniform[3]) this.send({ [uniform[3]]: [UniformType.VEC2, sizeUV!] });
                    break;
                default:
                    (type) satisfies never;
                    throw new Error("unknown shader uniform value type");
            }
        }
    }

    free() {
        const gl = this.#renderer.gl;
        gl.deleteProgram(this.#glProgram);
        gl.deleteVertexArray(this.#glVAO);
        gl.deleteBuffer(this.#glVBO);
        gl.deleteBuffer(this.#glIBO);
    }
}

export const createShaderFromDefaultTemplate = (renderer: Renderer, userVert: string | null, userFrag: string | null, maxVertices: number, maxIndices: number): Shader<any> => {
    var vert = vertTemplate.default;
    var frag = fragTemplate.default;
    if (userVert) {
        vert = vert.replace(/vec4 vert\(.+?\)\s*\{.+?\}/, userVert);
    }
    if (userFrag) {
        frag = frag.replace(/vec4 frag\(.+?\)\s*\{.+?\}/, userFrag);
    }
    return new Shader(renderer, vert, frag, renderer.defaultVertexFormat, maxVertices, maxIndices);
}
