
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
    
    gl.bindVertexArray(terrain.vao)

    // View
    let v = m4view([0, 6, 2], [0, 0, 0], [0, 0, 1])

    // Perspective
    gl.uniformMatrix4fv(program.uniforms.p, false, p)

    
    if (gridsize != 2 && faults != 0) {
        gl.drawElements(terrain.mode, terrain.count, terrain.type, 0)
    }
    
    

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

function createTerrain(gridsize, faults) {
    terrain = {
        "triangles":
        [],
        "attributes":
        [ // Position
            []
        , // Color
            []
        ]
    }
    for (let i = 0; i < (gridsize - 1) * (gridsize-1) * 2; i+= 1) {
        terrain.triangles.push(i * 3, i * 3 + 1, i * 3 + 2)

        g.attributes[0].push(i, i+1, i+gridsize)

        g.attributes[1].push(0.8, 0.6, 0.4)
    }

    return terrain
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
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    document.querySelector('#submit').addEventListener('click', event => {
        const gridsize = Number(document.querySelector('#gridsize').value) || 2
        const faults = Number(document.querySelector('#faults').value) || 0
        // TO DO: generate a new gridsize-by-gridsize grid here, then apply faults to it
        grid = new Array(gridsize).fill(new Array(gridsize).fill(0))
        grid_normals = new Array(gridsize).fill(new Array(gridsize).fill(0))
    
        // Apply faults
        for (let fault = 0; fault < faults; fault += 1) {
            let x = Math.random() * gridsize
            let y = Math.random() * gridsize
            let p = new Float32Array(x, y)
            let theta = Math.random() * Math.PI * 2
            let normal = new Float32Array(Math.cos(theta), Math.sin(theta), 0)
            for (let i = 0; i < gridsize; i += 1) {
                for (let j = 0; j < gridsize; j += 1) {
                    let vertex = new Int32Array(x, y)
    
                    let val = dot(sub(vertex, p), normal)
    
                    if (val < 0) {
                        grid[i][j] -= 0.01
                    }
                    else if (val > 0) {
                        grid[i][j] += 0.01
                    }
                }
            }
        }
    
        // Normalize heights
        var maxRow = grid.map(function(row) { return Math.max.apply(Math, row)}) 
        var max = Math.max.apply(null, maxRow)
    
        var minRow = grid.map(function(row) { return Math.min.apply(Math, row)}) 
        var min = Math.min.apply(null, maxRow)
    
        for (let i = 0; i < gridsize; i += 1) {
            for (let j = 0; j < gridsize; j += 1) {
                grid[i][j] = (grid[i][j] - ((max + min) / 2)) / (max - min)
            }
        }
        
        // Compute grid-based normals
        for (let i = 0; i < gridsize; i += 1) {
            for (let j = 0; j < gridsize; j += 1) {
                n = -1
                s = -1
                e = -1
                w = -1
    
                if (i == 0) {
                    n = gridsize[i][j]
                    s = gridsize[i+1][j]
                } else if (i == gridsize - 1) {
                    n = gridsize[i-1][j]
                    s = gridsize[i][j]
                } else {
                    n = gridsize[i+1][j]
                    s = gridsize[i+1][j]
                }
    
                if (j == 0) {
                    w = gridsize[i][j]
                    e = gridsize[i][j+1]
                } else if (j == gridsize - 1) {
                    e = gridsize[i][j]
                    w = gridsize[i][j-1]
                } else {
                    w = gridsize[i][j-1]
                    e = gridsize[i][j+1]
                }
                grid_normals[i][j] = (n - s) * (w - e)
            }
        }
        
    })
    const terrain = setupGeometry(createTerrain(gridsize, faults))
    fillScreen()
    window.addEventListener('resize', fillScreen)
    requestAnimationFrame(tick) // <- ensure this function is called only once, at the end of setup
}

window.addEventListener('load', setup)
