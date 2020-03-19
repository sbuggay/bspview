import { m4 } from "./m4";


export function main(vertices: number[]) {


    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl');


    // Create an empty buffer object to store the vertex buffer
    var vertex_buffer = gl.createBuffer();

    //Bind appropriate array buffer to it
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

    // Pass the vertex data to the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Unbind the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    /*=========================Shaders========================*/

    // vertex shader source code
    var vertCode =
        'attribute vec3 coordinates;' +

        'void main(void) {' +
        ' gl_Position = vec4(coordinates, 1.0);' +
        'gl_PointSize = 10.0;' +
        '}';

    // Create a vertex shader object
    var vertShader = gl.createShader(gl.VERTEX_SHADER);

    // Attach vertex shader source code
    gl.shaderSource(vertShader, vertCode);

    // Compile the vertex shader
    gl.compileShader(vertShader);

    // fragment shader source code
    var fragCode =
        'void main(void) {' +
        ' gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);' +
        '}';

    // Create fragment shader object
    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    // Attach fragment shader source code
    gl.shaderSource(fragShader, fragCode);

    // Compile the fragmentt shader
    gl.compileShader(fragShader);

    // Create a shader program object to store
    // the combined shader program
    var shaderProgram = gl.createProgram();

    // Attach a vertex shader
    gl.attachShader(shaderProgram, vertShader);

    // Attach a fragment shader
    gl.attachShader(shaderProgram, fragShader);

    // Link both programs
    gl.linkProgram(shaderProgram);

    // Use the combined shader program object
    gl.useProgram(shaderProgram);

    /*======== Associating shaders to buffer objects ========*/

    // Bind vertex buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

    // Get the attribute location
    var coord = gl.getAttribLocation(shaderProgram, "coordinates");

    var matrixLocation = gl.getUniformLocation(shaderProgram, "u_matrix");

    // Point an attribute to the currently bound VBO
    gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);

    // Enable the attribute
    gl.enableVertexAttribArray(coord);

    /*============= Drawing the primitive ===============*/

    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable the depth test
    gl.enable(gl.DEPTH_TEST);

    // Clear the color buffer bit
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set the view port
    gl.viewport(0, 0, canvas.width, canvas.height);

    var aspect = gl.canvas.width / gl.canvas.height;
    var zNear = 1;
    var zFar = 2000;
    var projectionMatrix = m4.perspective(1.5708, aspect, zNear, zFar);
    var radius = 500;

    // Compute a matrix for the camera
    var cameraMatrix = m4.yRotation(1);
    cameraMatrix = m4.translate(cameraMatrix, 0, 0, radius * 1.5);
    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);
    // Compute a view projection matrix
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    // starting with the view projection matrix
    // compute a matrix for the F
    var matrix = m4.translate(viewProjectionMatrix, 0, 0, 0);


    // Set the matrix.
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    console.log(vertices);

    // Draw the triangle
    gl.drawArrays(gl.POINTS, 0, vertices.length / 3);




}