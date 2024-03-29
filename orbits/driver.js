
/**
 * Compiles two shaders, links them together, looks up their uniform locations,
 * and returns the result. Reports any shader errors to the console.
 *
 * @param {string} vs_source - the source code of the vertex shader
 * @param {string} fs_source - the source code of the fragment shader
 * @return {WebGLProgram} the compiled and linked program
 */
function compile(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
    
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

/**
 * Runs the animation using requestAnimationFrame. This is like a loop that
 * runs once per screen refresh, but a loop won't work because we need to let
 * the browser do other things between ticks. Instead, we have a function that
 * requests itself be queued to be run again as its last step.
 * 
 * @param {Number} milliseconds - milliseconds since web page loaded; 
 *        automatically provided by the browser when invoked with
 *        requestAnimationFrame
 */
function tick(milliseconds) {
    const seconds = milliseconds / 1000
    draw(seconds)
    requestAnimationFrame(tick) // <- only call this here, nowhere else
}

const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])

function setupGeometry(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let i=0; i<geom.attributes.length; i+=1) {
        let buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        let f32 = new Float32Array(geom.attributes[i].flat())
        gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW)
        
        gl.vertexAttribPointer(i, geom.attributes[i][0].length, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(i)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}

/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT) 
    gl.useProgram(program)
    
    gl.bindVertexArray(octahedron.vao)

    // View
    let v = m4view([0, 6, 2], [0, 0, 0], [0, 0, 1])

    // Perspective
    gl.uniformMatrix4fv(program.uniforms.p, false, p)

    // Sun
    let sun = m4rotZ(seconds * Math.PI)
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, sun))
    gl.drawElements(octahedron.mode, octahedron.count, octahedron.type, 0)

    // Earth [orbit speed around sun, translation from sun, scale Earth, Earth spin, 2 times a second]
    let earth = m4mul(m4rotZ(seconds * Math.PI / 4), m4trans(2.5,0,0), m4scale(0.35, 0.35, 0.35), m4rotZ(seconds * 4 * Math.PI))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, earth))
    gl.drawElements(octahedron.mode, octahedron.count, octahedron.type, 0)

    // Mars 
    let mars = m4mul(m4rotZ(seconds * Math.PI / (4 * 1.9)), m4trans(2.5 * 1.6,0,0), m4scale(0.25, 0.25, 0.25), m4rotZ((seconds * 4 * Math.PI) / 2.2))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, mars))
    gl.drawElements(octahedron.mode, octahedron.count, octahedron.type, 0)

    gl.bindVertexArray(tetrahedron.vao)
    // Moon 
    let moon = m4mul(m4rotZ(seconds * Math.PI / 4), m4trans(2.5, 0, 0), m4rotZ(seconds * Math.PI), m4trans(0.5,0,0), m4scale(0.1, 0.1, 0.1))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, moon))
    gl.drawElements(tetrahedron.mode, tetrahedron.count, tetrahedron.type, 0)

    // Phobos
    let phobos = m4mul(m4rotZ(seconds * Math.PI / (4 * 1.9)), m4trans(2.5 * 1.6, 0, 0), m4rotZ(((seconds * 4 * Math.PI) / 2.2) * 4), m4trans(0.35, 0, 0), m4scale(0.1, 0.1, 0.1))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, phobos))
    gl.drawElements(tetrahedron.mode, tetrahedron.count, tetrahedron.type, 0)

    // Deimos
    let deimos = m4mul(m4rotZ(seconds * Math.PI / (4 * 1.9)), m4trans(2.5 * 1.6, 0, 0), m4rotZ(seconds * 4 * Math.PI / 1.4), m4trans(0.35 * 2, 0, 0), m4scale(0.05, 0.05, 0.05))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, deimos))
    console.log(tetrahedron.mode)
    gl.drawElements(tetrahedron.mode, tetrahedron.count, tetrahedron.type, 0)
    

}

/** Resizes the canvas to completely fill the screen */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0, canvas.width, canvas.height)
        window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
    }
}

/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    const vs = await fetch('vs.glsl').then(res => res.text())
    const fs = await fetch('fs.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    gl.enable(gl.DEPTH_TEST)
    const octahedron = await fetch('octahedron.json').then(r=>r.json())
    window.octahedron = setupGeometry(octahedron)
    const tetrahedron = await fetch('tetrahedron.json').then(r=>r.json())
    window.tetrahedron = setupGeometry(tetrahedron)
    fillScreen()
    window.addEventListener('resize', fillScreen)
    requestAnimationFrame(tick) // <- ensure this function is called only once, at the end of setup
}

window.addEventListener('load', setup)
