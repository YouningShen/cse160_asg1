// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    // gl_PointSize = 10.0;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor; 
  void main() {
    gl_FragColor = u_FragColor;
  }`


// Global Vars
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let canvasColor = true;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDraeingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

}

function connectVariablesToGLSL() {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
      console.log('Failed to intialize shaders.');
      return;
    }
  
    // // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
      console.log('Failed to get the storage location of a_Position');
      return;
    }
  
    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
      console.log('Failed to get the storage location of u_FragColor');
      return;
    }

    // Get the storage location of u_Size
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if (!u_Size) {
      console.log('Failed to get the storage location of u_Size');
      return;
    }
  
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;
const BRUSH = 3;

// Globals related UI elements
let g_selectedColor=[1.0, 1.0, 1.0, 1.0];
let g_selectedSize=5;
let g_selectedType=POINT;
let g_selectedSegments=10;

// Set up action for the HTML UI elements
function addActionForHtmlUI() {

  // Button Events (Shape Type)
  document.getElementById('green').onclick = function () {
    g_selectedColor = [0.0, 1.0, 0.0, 1.0];
  
    // Reset sliders
    document.getElementById('redSlide').value = 0;
    document.getElementById('greenSlide').value = 100;
    document.getElementById('blueSlide').value = 0;
  }; 
  document.getElementById('red').onclick = function () {
    g_selectedColor = [1.0, 0.0, 0.0, 1.0];
  
    // Reset sliders
    document.getElementById('redSlide').value = 100;
    document.getElementById('greenSlide').value = 0;
    document.getElementById('blueSlide').value = 0;
  }; 
  document.getElementById('resetColor').onclick = function () {
    g_selectedColor = [1.0, 1.0, 1.0, 1.0];
  
    // Reset sliders
    document.getElementById('redSlide').value = 100;
    document.getElementById('greenSlide').value = 100;
    document.getElementById('blueSlide').value = 100;
  };  
  document.getElementById('clearButton').onclick   = function() {g_shapeList=[]; renderAllShapes(); };
  document.getElementById('drawPicture').onclick   = function() {drawPicture(); };
  document.getElementById('canvasColor').onclick = function () { changeCanvasColor(); };  

  document.getElementById('pointButton').onclick   = function() {g_selectedType=POINT};
  document.getElementById('triButton').onclick   = function() {g_selectedType=TRIANGLE};
  document.getElementById('circleButton').onclick   = function() {g_selectedType=CIRCLE};
  document.getElementById('brushButton').onclick   = function() {g_selectedType=BRUSH};

  // Color Slider Events
  document.getElementById('redSlide').addEventListener('mouseup',   function() {g_selectedColor[0] = this.value/100; });
  document.getElementById('greenSlide').addEventListener('mouseup', function() {g_selectedColor[1] = this.value/100; });
  document.getElementById('blueSlide').addEventListener('mouseup',  function() {g_selectedColor[2] = this.value/100; });

  // Size Slider Events
  document.getElementById('sizeSlide').addEventListener('mouseup',   function() {g_selectedSize = this.value; });

  // Circle Segments Slider Events
  document.getElementById('segmentSlide').addEventListener('mouseup',   function() {g_selectedSegments = this.value; });

}

function main() {

  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  // Set up action for the HTML UI elements
  addActionForHtmlUI();
  
  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  // canvas.onmousemove = click;
  canvas.onmousemove = function(ev) { if(ev.buttons == 1) { click(ev) } };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}


var g_shapeList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = [];  // The array to store the size of a point

function click(ev) {
  
  // Extract the event click and return it in WebGL coordinates
  let [x,y] = convertCoordinatesEventToGL(ev);

  // Create and store new point
  let point;
  if (g_selectedType==POINT) {
    point = new Point();
  } else if (g_selectedType==TRIANGLE) {
    point = new Triangle();
  } else if (g_selectedType==CIRCLE) {
    point = new Circle();
    point.segments = g_selectedSegments;
  } else{
    point = new Brush();
    point.segments = g_selectedSegments;
  }
  point.position=[x,y];
  point.color=g_selectedColor.slice();
  point.size=g_selectedSize;
  g_shapeList.push(point);

  // Draw every shape that is supposed to be in the canvas
  renderAllShapes();

}

// Extract the event click and return it in WebGL coordinates
function convertCoordinatesEventToGL(ev) { 
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}


// Draw every shape that is supposed to be in the canvas
function renderAllShapes() {

  // Check the time at the start of this function
  var startTime = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw each shape in the list
  var len = g_shapeList.length;
  for(var i = 0; i < len; i++) {
    g_shapeList[i].render();
  }

  // Check the time at the end of the function, and show on web page
  // var duration = performance.now() - startTime;
  // sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

// Set the text of a HTML element
function sendTextToHTML(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + "from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function changeCanvasColor() {
  canvasColor = !canvasColor;

  if (canvasColor) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // black
  } else {
    gl.clearColor(1.0, 1.0, 1.0, 1.0); // white
  }

  renderAllShapes();
}

class ManualTriangle {
  constructor(x1, y1, x2, y2, x3, y3, color) {
    this.vertices = [x1, y1, x2, y2, x3, y3];
    this.color = color;
  }

  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    drawTriangle(this.vertices);
  }
}

function drawPicture() {
  // Do NOT clear canvas or change canvas color

  // Color presets
  const ORANGE = [1.0, 0.6, 0.2, 0.9];
  const YELLOW = [0.8, 0.7, 0.1, 0.6];
  const WHITE = [1.0, 1.0, 1.0, 1.0];
  const BLUE = [0.0, 0.2, 0.9, 0.7];
  const PINK = [1.0, 0.4, 0.5, 0.9];

  function addManualTri(x1, y1, x2, y2, x3, y3, color) {
    g_shapeList.push(new ManualTriangle(x1, y1, x2, y2, x3, y3, color));
  }

  //face layer 1
  addManualTri(-0.8, 0.2, -0.6, 0.4, -0.6, 0.2, ORANGE);
  addManualTri(-0.6, 0.4, -0.6, 0.2, -0.4, 0.4, ORANGE);
  addManualTri(-0.6, 0.2, -0.4, 0.2, -0.4, 0.4, ORANGE);
  addManualTri(-0.4, 0.4, -0.4, 0.2, -0.2, 0.4, ORANGE);
  addManualTri(-0.4, 0.2, -0.2, 0.2, -0.2, 0.4, ORANGE);
  addManualTri(-0.2, 0.4, -0.2, 0.2, 0.0, 0.4, ORANGE);
  addManualTri(-0.2, 0.2, 0.0, 0.2, 0.0, 0.4, ORANGE);
  addManualTri(0.0, 0.4, 0.0, 0.2, 0.2, 0.4, ORANGE);
  addManualTri(0.0, 0.2, 0.2, 0.2, 0.2, 0.4, ORANGE);
  addManualTri(0.2, 0.4, 0.2, 0.2, 0.4, 0.4, ORANGE);
  addManualTri(0.2, 0.2, 0.4, 0.2, 0.4, 0.4, ORANGE);
  addManualTri(0.4, 0.4, 0.4, 0.2, 0.6, 0.4, ORANGE);
  addManualTri(0.4, 0.2, 0.6, 0.2, 0.6, 0.4, ORANGE);
  addManualTri(0.6, 0.2, 0.6, 0.3, 0.7, 0.2, ORANGE);
  addManualTri(0.7, 0.3, 0.6, 0.3, 0.7, 0.2, ORANGE);
  addManualTri(0.7, 0.2, 0.7, 0.3, 0.8, 0.2, ORANGE);
  addManualTri(0.8, 0.3, 0.7, 0.3, 0.8, 0.2, ORANGE);
  addManualTri(0.6, 0.3, 0.6, 0.4, 0.7, 0.3, ORANGE);
  addManualTri(0.7, 0.4, 0.6, 0.4, 0.7, 0.3, ORANGE);
  addManualTri(0.7, 0.4, 0.7, 0.3, 0.8, 0.3, ORANGE);
  

  //face layer 2
  addManualTri(-0.8, 0.2, -0.8, 0.0, -0.6, 0.2, ORANGE);
  addManualTri(-0.8, 0.0, -0.6, 0.0, -0.6, 0.2, ORANGE);
  addManualTri(-0.6, 0.2, -0.6, 0.0, -0.4, 0.2, ORANGE);
  addManualTri(-0.6, 0.0, -0.4, 0.0, -0.4, 0.2, ORANGE);
  addManualTri(-0.4, 0.2, -0.4, 0.0, -0.2, 0.2, ORANGE);
  addManualTri(-0.4, 0.0, -0.2, 0.0, -0.2, 0.2, ORANGE);
  addManualTri(-0.2, 0.2, -0.2, 0.0, 0.0, 0.2, ORANGE);
  addManualTri(-0.2, 0.0, 0.0, 0.0, 0.0, 0.2, ORANGE);
  addManualTri(0.0, 0.2, 0.0, 0.0, 0.2, 0.2, ORANGE);
  addManualTri(0.0, 0.0, 0.2, 0.0, 0.2, 0.2, ORANGE);
  addManualTri(0.2, 0.2, 0.2, 0.0, 0.4, 0.2, ORANGE);
  addManualTri(0.2, 0.0, 0.4, 0.0, 0.4, 0.2, ORANGE);
  addManualTri(0.4, 0.2, 0.4, 0.0, 0.6, 0.2, ORANGE);
  addManualTri(0.4, 0.0, 0.6, 0.0, 0.6, 0.2, ORANGE);
  addManualTri(0.6, 0.2, 0.6, 0.0, 0.8, 0.2, ORANGE);
  addManualTri(0.6, 0.0, 0.8, 0.0, 0.8, 0.2, ORANGE);
  addManualTri(-0.8, -0.2, -0.8, 0.0, -0.6, -0.2, ORANGE);
  addManualTri(-0.8, 0.0, -0.6, 0.0, -0.6, -0.2, ORANGE);
  addManualTri(-0.6, -0.2, -0.6, 0.0, -0.4, -0.2, ORANGE);
  addManualTri(-0.6, 0.0, -0.4, 0.0, -0.4, -0.2, ORANGE);
  addManualTri(-0.4, -0.2, -0.4, 0.0, -0.2, -0.2, ORANGE);
  addManualTri(-0.4, 0.0, -0.2, 0.0, -0.2, -0.2, ORANGE);
  addManualTri(-0.2, -0.2, -0.2, 0.0, 0.0, -0.2, ORANGE);
  addManualTri(-0.2, 0.0, 0.0, 0.0, 0.0, -0.2, ORANGE);
  addManualTri(0.0, -0.2, 0.0, 0.0, 0.2, -0.2, ORANGE);
  addManualTri(0.0, 0.0, 0.2, 0.0, 0.2, -0.2, ORANGE);
  addManualTri(0.2, -0.2, 0.2, 0.0, 0.4, -0.2, ORANGE);
  addManualTri(0.2, 0.0, 0.4, 0.0, 0.4, -0.2, ORANGE);
  addManualTri(0.4, -0.2, 0.4, 0.0, 0.6, -0.2, ORANGE);
  addManualTri(0.4, 0.0, 0.6, 0.0, 0.6, -0.2, ORANGE);
  addManualTri(0.6, -0.2, 0.6, 0.0, 0.8, -0.2, ORANGE);
  addManualTri(0.6, 0.0, 0.8, 0.0, 0.8, -0.2, ORANGE);

  //face layer 3
  addManualTri(-0.9, -0.3, -0.8, -0.3, -0.8, -0.2, ORANGE);
  addManualTri(-0.9, -0.3, -0.8, -0.3, -0.8, -0.4, ORANGE);
  addManualTri(-0.9, -0.3, -0.9, -0.4, -0.8, -0.4, ORANGE);
  addManualTri(-0.8, -0.2, -0.8, -0.4, -0.6, -0.2, ORANGE);
  addManualTri(-0.8, -0.4, -0.6, -0.4, -0.6, -0.2, ORANGE);
  addManualTri(-0.6, -0.2, -0.6, -0.4, -0.4, -0.2, ORANGE);
  addManualTri(-0.6, -0.4, -0.4, -0.4, -0.4, -0.2, ORANGE);
  addManualTri(-0.4, -0.2, -0.4, -0.4, -0.2, -0.2, ORANGE);
  addManualTri(-0.4, -0.4, -0.2, -0.4, -0.2, -0.2, ORANGE);
  addManualTri(-0.2, -0.2, -0.2, -0.4, 0.0, -0.2, ORANGE);
  addManualTri(-0.2, -0.4, 0.0, -0.4, 0.0, -0.2, ORANGE);
  addManualTri(0.0, -0.2, 0.0, -0.4, 0.2, -0.2, ORANGE);
  addManualTri(0.0, -0.4, 0.2, -0.4, 0.2, -0.2, ORANGE);
  addManualTri(0.2, -0.2, 0.2, -0.4, 0.4, -0.2, ORANGE);
  addManualTri(0.2, -0.4, 0.4, -0.4, 0.4, -0.2, ORANGE);
  addManualTri(0.4, -0.2, 0.4, -0.4, 0.6, -0.2, ORANGE);
  addManualTri(0.4, -0.4, 0.6, -0.4, 0.6, -0.2, ORANGE);
  addManualTri(0.6, -0.2, 0.6, -0.4, 0.8, -0.2, ORANGE);
  addManualTri(0.6, -0.4, 0.8, -0.4, 0.8, -0.2, ORANGE);
  addManualTri(0.9, -0.3, 0.8, -0.3, 0.8, -0.2, ORANGE);
  addManualTri(0.9, -0.3, 0.8, -0.3, 0.8, -0.4, ORANGE);
  addManualTri(0.9, -0.3, 0.9, -0.4, 0.8, -0.4, ORANGE);

  //face layer 4
  addManualTri(-0.9, -0.6, -0.9, -0.5, -0.8, -0.6, ORANGE);
  addManualTri(-0.9, -0.5, -0.8, -0.5, -0.8, -0.6, ORANGE);
  addManualTri(-0.9, -0.5, -0.9, -0.4, -0.8, -0.5, ORANGE);
  addManualTri(-0.9, -0.4, -0.8, -0.4, -0.8, -0.5, ORANGE);
  addManualTri(-0.8, -0.4, -0.8, -0.6, -0.6, -0.4, ORANGE);
  addManualTri(-0.8, -0.6, -0.6, -0.6, -0.6, -0.4, ORANGE);
  addManualTri(-0.6, -0.4, -0.6, -0.6, -0.4, -0.4, ORANGE);
  addManualTri(-0.6, -0.6, -0.4, -0.6, -0.4, -0.4, ORANGE);
  addManualTri(-0.4, -0.4, -0.4, -0.6, -0.2, -0.4, ORANGE);
  addManualTri(-0.4, -0.6, -0.2, -0.6, -0.2, -0.4, ORANGE);
  addManualTri(-0.2, -0.4, -0.2, -0.6, 0.0, -0.4, ORANGE);
  addManualTri(-0.2, -0.6, 0.0, -0.6, 0.0, -0.4, ORANGE);
  addManualTri(0.0, -0.4, 0.0, -0.6, 0.2, -0.4, ORANGE);
  addManualTri(0.0, -0.6, 0.2, -0.6, 0.2, -0.4, ORANGE);
  addManualTri(0.2, -0.4, 0.2, -0.6, 0.4, -0.4, ORANGE);
  addManualTri(0.2, -0.6, 0.4, -0.6, 0.4, -0.4, ORANGE);
  addManualTri(0.4, -0.4, 0.4, -0.6, 0.6, -0.4, ORANGE);
  addManualTri(0.4, -0.6, 0.6, -0.6, 0.6, -0.4, ORANGE);
  addManualTri(0.6, -0.4, 0.6, -0.6, 0.8, -0.4, ORANGE);
  addManualTri(0.6, -0.6, 0.8, -0.6, 0.8, -0.4, ORANGE);
  addManualTri(0.9, -0.6, 0.9, -0.5, 0.8, -0.6, ORANGE);
  addManualTri(0.9, -0.5, 0.8, -0.5, 0.8, -0.6, ORANGE);
  addManualTri(0.9, -0.5, 0.9, -0.4, 0.8, -0.5, ORANGE);
  addManualTri(0.9, -0.4, 0.8, -0.4, 0.8, -0.5, ORANGE);

  //face layer 5
  addManualTri(-0.9, -0.6, -0.7, -0.8, -0.7, -0.6, ORANGE);
  addManualTri(-0.7, -0.8, -0.6, -0.8, -0.7, -0.7, ORANGE);
  addManualTri(-0.8, -0.6, -0.6, -0.8, -0.6, -0.6, ORANGE);
  addManualTri(-0.6, -0.6, -0.6, -0.8, -0.4, -0.6, ORANGE);
  addManualTri(-0.6, -0.8, -0.4, -0.8, -0.4, -0.6, ORANGE);
  addManualTri(-0.4, -0.6, -0.4, -0.8, -0.2, -0.6, ORANGE);
  addManualTri(-0.4, -0.8, -0.2, -0.8, -0.2, -0.6, ORANGE);
  addManualTri(-0.2, -0.6, -0.2, -0.8, 0.0, -0.6, ORANGE);
  addManualTri(-0.2, -0.8, 0.0, -0.8, 0.0, -0.6, ORANGE);
  addManualTri(0.0, -0.6, 0.0, -0.8, 0.2, -0.6, ORANGE);
  addManualTri(0.0, -0.8, 0.2, -0.8, 0.2, -0.6, ORANGE);
  addManualTri(0.2, -0.6, 0.2, -0.8, 0.4, -0.6, ORANGE);
  addManualTri(0.2, -0.8, 0.4, -0.8, 0.4, -0.6, ORANGE);
  addManualTri(0.4, -0.6, 0.4, -0.8, 0.6, -0.6, ORANGE);
  addManualTri(0.4, -0.8, 0.6, -0.8, 0.6, -0.6, ORANGE);
  addManualTri(0.6, -0.6, 0.6, -0.8, 0.8, -0.6, ORANGE);
  addManualTri(0.7, -0.6, 0.7, -0.8, 0.9, -0.6, ORANGE);
  addManualTri(0.7, -0.8, 0.7, -0.7, 0.6, -0.8, ORANGE);

  //ears left
  addManualTri(-0.6, 0.4, -0.4, 0.4, -0.4, 0.6, ORANGE);
  addManualTri(-0.6, 0.4, -0.6, 0.6, -0.4, 0.6, ORANGE);
  addManualTri(-0.6, 0.6, -0.4, 0.6, -0.4, 0.8, ORANGE);
  addManualTri(-0.4, 0.8, -0.4, 0.6, -0.2, 0.6, ORANGE);
  addManualTri(-0.2, 0.4, -0.3, 0.4, -0.2, 0.5, ORANGE);  
  addManualTri(-0.2, 0.5, -0.3, 0.5, -0.2, 0.6, ORANGE);  
  addManualTri(-0.2, 0.5, -0.3, 0.4, -0.3, 0.5, ORANGE);  
  addManualTri(-0.2, 0.6, -0.3, 0.5, -0.3, 0.6, ORANGE); 
  addManualTri(-0.3, 0.4, -0.4, 0.4, -0.3, 0.5, PINK);  
  addManualTri(-0.3, 0.5, -0.4, 0.5, -0.3, 0.6, PINK);  
  addManualTri(-0.3, 0.5, -0.4, 0.4, -0.4, 0.5, PINK);  
  addManualTri(-0.3, 0.6, -0.4, 0.5, -0.4, 0.6, PINK); 

  //ears right
  addManualTri(0.3, 0.4, 0.5, 0.4, 0.5, 0.6, ORANGE);
  addManualTri(0.3, 0.4, 0.3, 0.6, 0.5, 0.6, ORANGE);
  addManualTri(0.3, 0.6, 0.5, 0.6, 0.5, 0.8, ORANGE);
  addManualTri(0.5, 0.8, 0.5, 0.6, 0.7, 0.6, ORANGE);
  addManualTri(0.7, 0.4, 0.6, 0.4, 0.7, 0.5, ORANGE);  
  addManualTri(0.7, 0.5, 0.6, 0.5, 0.7, 0.6, ORANGE);  
  addManualTri(0.7, 0.5, 0.6, 0.4, 0.6, 0.5, ORANGE);  
  addManualTri(0.7, 0.6, 0.6, 0.5, 0.6, 0.6, ORANGE); 
  addManualTri(0.6, 0.4, 0.5, 0.4, 0.6, 0.5, PINK);  
  addManualTri(0.6, 0.5, 0.5, 0.5, 0.6, 0.6, PINK);  
  addManualTri(0.6, 0.5, 0.5, 0.4, 0.5, 0.5, PINK);  
  addManualTri(0.6, 0.6, 0.5, 0.5, 0.5, 0.6, PINK); 

  //left eye
  addManualTri(-0.1, 0.0, -0.1, 0.1, -0.2, 0.0, WHITE);  
  addManualTri(-0.1, 0.1, -0.2, 0.1, -0.2, 0.0, WHITE);  
  addManualTri(-0.2, 0.0, -0.2, 0.1, -0.3, 0.0, WHITE);  
  addManualTri(-0.1, 0.0, -0.1, -0.1, -0.2, 0.0, WHITE);  
  addManualTri(-0.1, -0.1, -0.2, -0.1, -0.2, 0.0, WHITE);
  addManualTri(-0.2, 0.0, -0.2, -0.1, -0.3, 0.0, WHITE); 


  //left pupil
  addManualTri(0.0, 0.0, 0.0, 0.1, -0.1, 0.0, BLUE);  
  addManualTri(0.0, 0.1, -0.1, 0.1, -0.1, 0.0, BLUE);  
  addManualTri(0.0, 0.0, 0.0, -0.1, -0.1, 0.0, BLUE);  
  addManualTri(0.0, -0.1, -0.1, -0.1, -0.1, 0.0, BLUE);

  //right eye
  addManualTri(0.5, 0.0, 0.5, 0.1, 0.4, 0.0, WHITE);  
  addManualTri(0.5, 0.1, 0.4, 0.1, 0.4, 0.0, WHITE);  
  addManualTri(0.4, 0.0, 0.4, 0.1, 0.3, 0.0, WHITE);  
  addManualTri(0.5, 0.0, 0.5, -0.1, 0.4, 0.0, WHITE);  
  addManualTri(0.5, -0.1, 0.4, -0.1, 0.4, 0.0, WHITE);
  addManualTri(0.4, 0.0, 0.4, -0.1, 0.3, 0.0, WHITE); 


  //right pupil
  addManualTri(0.6, 0.0, 0.6, 0.1, 0.5, 0.0, BLUE);  
  addManualTri(0.6, 0.1, 0.5, 0.1, 0.5, 0.0, BLUE);  
  addManualTri(0.6, 0.0, 0.6, -0.1, 0.5, 0.0, BLUE);  
  addManualTri(0.6, -0.1, 0.5, -0.1, 0.5, 0.0, BLUE);

  //nose
  addManualTri(0.0, -0.2, 0.0, -0.3, 0.1, -0.2, PINK);
  addManualTri(0.1, -0.2, 0.0, -0.3, 0.1, -0.3, PINK);
  addManualTri(0.1, -0.2, 0.1, -0.3, 0.2, -0.2, PINK);
  addManualTri(0.2, -0.2, 0.1, -0.3, 0.2, -0.3, PINK);
  addManualTri(0.2, -0.2, 0.2, -0.3, 0.3, -0.2, PINK);
  addManualTri(0.3, -0.2, 0.2, -0.3, 0.3, -0.3, PINK);
  addManualTri(0.1, -0.3, 0.1, -0.4, 0.2, -0.3, PINK);
  addManualTri(0.2, -0.3, 0.1, -0.4, 0.2, -0.4, PINK);
  addManualTri(0.2, -0.3, 0.2, -0.4, 0.3, -0.3, PINK);
  addManualTri(0.0, -0.3, 0.1, -0.4, 0.1, -0.3, PINK);

  //left mustash
  addManualTri(-0.2, -0.4, -0.3, -0.4, -0.3, -0.3, YELLOW);
  addManualTri(-0.3, -0.4, -0.4, -0.4, -0.4, -0.3, YELLOW);
  addManualTri(-0.4, -0.4, -0.5, -0.4, -0.5, -0.3, YELLOW);
  addManualTri(-0.5, -0.4, -0.6, -0.4, -0.6, -0.3, YELLOW);
  addManualTri(-0.6, -0.4, -0.7, -0.4, -0.7, -0.3, YELLOW);
  addManualTri(-0.7, -0.4, -0.8, -0.4, -0.8, -0.3, YELLOW);
  addManualTri(-0.8, -0.4, -0.9, -0.4, -0.9, -0.3, YELLOW);
  addManualTri(-0.3, -0.3, -0.3, -0.4, -0.4, -0.3, YELLOW);
  addManualTri(-0.4, -0.3, -0.4, -0.4, -0.5, -0.3, YELLOW);
  addManualTri(-0.5, -0.3, -0.5, -0.4, -0.6, -0.3, YELLOW);
  addManualTri(-0.6, -0.3, -0.6, -0.4, -0.7, -0.3, YELLOW);
  addManualTri(-0.7, -0.3, -0.7, -0.4, -0.8, -0.3, YELLOW);
  addManualTri(-0.8, -0.3, -0.8, -0.4, -0.9, -0.3, YELLOW);

  addManualTri(-0.2, -0.5, -0.3, -0.6, -0.3, -0.5, YELLOW);
  addManualTri(-0.3, -0.6, -0.4, -0.6, -0.4, -0.5, YELLOW);
  addManualTri(-0.4, -0.6, -0.5, -0.6, -0.5, -0.5, YELLOW);
  addManualTri(-0.5, -0.6, -0.6, -0.6, -0.6, -0.5, YELLOW);
  addManualTri(-0.6, -0.6, -0.7, -0.6, -0.7, -0.5, YELLOW);
  addManualTri(-0.7, -0.6, -0.8, -0.6, -0.8, -0.5, YELLOW);
  addManualTri(-0.8, -0.6, -0.9, -0.6, -0.9, -0.5, YELLOW);
  addManualTri(-0.3, -0.5, -0.3, -0.6, -0.4, -0.5, YELLOW);
  addManualTri(-0.4, -0.5, -0.4, -0.6, -0.5, -0.5, YELLOW);
  addManualTri(-0.5, -0.5, -0.5, -0.6, -0.6, -0.5, YELLOW);
  addManualTri(-0.6, -0.5, -0.6, -0.6, -0.7, -0.5, YELLOW);
  addManualTri(-0.7, -0.5, -0.7, -0.6, -0.8, -0.5, YELLOW);
  addManualTri(-0.8, -0.5, -0.8, -0.6, -0.9, -0.5, YELLOW);

  //right mustash
  addManualTri(0.5, -0.4, 0.6, -0.4, 0.6, -0.3, YELLOW);
  addManualTri(0.6, -0.4, 0.7, -0.4, 0.7, -0.3, YELLOW);
  addManualTri(0.7, -0.4, 0.8, -0.4, 0.8, -0.3, YELLOW);
  addManualTri(0.8, -0.4, 0.9, -0.4, 0.9, -0.3, YELLOW);
  addManualTri(0.6, -0.4, 0.7, -0.3, 0.6, -0.3, YELLOW);
  addManualTri(0.7, -0.4, 0.8, -0.3, 0.7, -0.3, YELLOW);
  addManualTri(0.8, -0.4, 0.9, -0.3, 0.8, -0.3, YELLOW);
  

  addManualTri(0.5, -0.5, 0.6, -0.6, 0.6, -0.5, YELLOW);
  addManualTri(0.6, -0.6, 0.7, -0.6, 0.7, -0.5, YELLOW);
  addManualTri(0.7, -0.6, 0.8, -0.6, 0.8, -0.5, YELLOW);
  addManualTri(0.8, -0.6, 0.9, -0.6, 0.9, -0.5, YELLOW);
  addManualTri(0.6, -0.6, 0.7, -0.5, 0.6, -0.5, YELLOW);
  addManualTri(0.7, -0.6, 0.8, -0.5, 0.7, -0.5, YELLOW);
  addManualTri(0.8, -0.6, 0.9, -0.5, 0.8, -0.5, YELLOW);

  renderAllShapes(); // Display everything
}
