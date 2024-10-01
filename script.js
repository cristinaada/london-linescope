
var bufferSize = 1024;
var bufferWidth = bufferSize;
var bufferHeight = bufferSize;

var showTexture = false;
var speed = 0.3;
var saturation = 0.1;
var lightness = 3;
var isPaused = false;
var textureZoom = 2.2;
var isDragging = false;
var useEnvMap = true;
var reflectivity = 1;
var envMapSelect = 1;


const scene = new THREE.Scene();
var bufferCamera = new THREE.PerspectiveCamera(75, bufferWidth / bufferHeight, 0.1, 1000);
bufferCamera.position.z = textureZoom;


var camera = new THREE.OrthographicCamera(
	(window.innerWidth / 2) / -2, // left
	(window.innerWidth / 2) / 2,  // right
	window.innerHeight / 2,       // top
	window.innerHeight / -2,      // bottom
	0.1, 
	1000
  );
camera.position.z = 5;
camera.zoom = 1.5;
camera.updateProjectionMatrix();

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth / 2, window.innerHeight);

const container = document.getElementById('kaleidoscope-container');
container.appendChild(renderer.domElement);

var controls = new THREE.TrackballControls(bufferCamera, renderer.domElement);
controls.noZoom = true;
controls.dynamicDampingFactor = 0.5;
controls.rotateSpeed = 1;

var controls2 = new THREE.OrbitControls(camera, renderer.domElement);
controls2.enableZoom = true;
controls2.enableRotate = false;
controls2.zoomSpeed = 0.3;
controls2.minZoom = 0.2;
controls2.maxZoom = 2;
controls2.enablePan = false;


var bufferScene = new THREE.Scene();
var bufferTexture = new THREE.WebGLRenderTarget( bufferWidth, bufferHeight, { minFilter: THREE.LinearMipMapLinearFilter, magFilter: THREE.LinearFilter, antialias: true});

var urls = [
		  'images/cubeMaps/1/pos-x.png',
		  'images/cubeMaps/1/neg-x.png',
		  'images/cubeMaps/1/pos-y.png',
		  'images/cubeMaps/1/neg-y.png',
		  'images/cubeMaps/1/pos-z.png',
		  'images/cubeMaps/1/neg-z.png'
		];

var cubemap = THREE.ImageUtils.loadTextureCube(urls);
cubemap.format = THREE.RGBFormat;

/// buffer scene objects
var numAxes = 12;
var allShapes = [];
var numShapes = 10;
var complexity = 5;

function createShapes() {
	for (var i=0; i<numShapes; i++)
	{
		var shape = new TorusKnotShape();
		shape.update();
		bufferScene.add(shape.mesh);
		allShapes[i] = shape;

		if (i < complexity) {
			shape.mesh.visible = true;
		} else {
			shape.mesh.visible = false;
		}
	}	
}
createShapes();


var ambientLight = new THREE.AmbientLight(0x808080);
bufferScene.add(ambientLight);

var pointLight = new THREE.PointLight(0xaaaaaa);
pointLight.position.set(0,50,200);
bufferScene.add(pointLight);

var pointLight = new THREE.PointLight(0x404040);
pointLight.position.set(0,50,-200);
bufferScene.add(pointLight);


// Kaleidoscope Grid
var grid = new KaleidoscopeGrid(bufferTexture);

function updateGridGeometry() {
	scene.remove(grid.mesh);
	grid.createGeometry();
	scene.add(grid.mesh);
}
updateGridGeometry();


// texture plane
var planeMat = new THREE.MeshBasicMaterial({map:bufferTexture, side:THREE.DoubleSide});
var planeGeo = new THREE.PlaneGeometry(bufferWidth / 2, bufferHeight / 2);
var planeObj = new THREE.Mesh(planeGeo, planeMat);
scene.add(planeObj);
planeObj.visible = false;


const mapSlider = document.getElementById('map-slider');
mapSlider.addEventListener('input', function(value) {
	var value = Math.floor(mapSlider.value/100)
	var urls = [
			'images/cubeMaps/' + value + '/pos-x.png',
			'images/cubeMaps/' + value + '/neg-x.png',
			'images/cubeMaps/' + value + '/pos-y.png',
			'images/cubeMaps/' + value + '/neg-y.png',
			'images/cubeMaps/' + value + '/pos-z.png',
			'images/cubeMaps/' + value + '/neg-z.png'
		];

	cubemap = THREE.ImageUtils.loadTextureCube(urls);
	cubemap.format = THREE.RGBFormat;

	imageGrid.images = urls;
	reloadImageGrid();

	document.dispatchEvent(new Event("updateMaterial"));
});

const imageGrid = {
	group: new THREE.Group(), // Holds all image meshes
	images: urls,
	rows: 3, // Number of rows in the grid
	cols: 2, // Number of columns in the grid
};

function createImageGrid() {
	var { images, rows, cols, group } = imageGrid;

	// Get the size of the container (assumes container is full window)
	const containerWidth = window.innerWidth / 3;
	const containerHeight = window.innerHeight / 1.5;

	// Calculate the width and height of each image based on the container and grid size
	const planeWidth = containerWidth / cols;
	const planeHeight = containerHeight / rows;

	images.forEach((imagePath, index) => {
		// Load the texture
		const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load(imagePath);

		// Create material with the texture
		const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

		// Define plane geometry based on the container size
		const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

		// Create mesh
		const mesh = new THREE.Mesh(geometry, material);

		// Calculate position in grid
		const row = Math.floor(index / cols);
		const col = index % cols;

		// Position mesh using the calculated width and height
		mesh.position.x = (col - (cols - 1) / 2) * planeWidth;
		mesh.position.y = ((rows - 1) / 2 - row) * planeHeight;
		mesh.position.z = 0;

		// Add mesh to the group
		group.add(mesh);
	});

	// Add the group to the main scene
	scene.add(group);
}
// Call the function to create the grid
createImageGrid();
// Initially, the grid is not visible
imageGrid.group.visible = false;

// Make sure to resize the grid when the window is resized
window.addEventListener('resize', () => {
	reloadImageGrid
});

function reloadImageGrid() {
	scene.remove(imageGrid.group)
	var vis = imageGrid.group.visible
	imageGrid.group = new THREE.Group()
	createImageGrid();
	imageGrid.group.visible = vis;
}

const switchButton = document.getElementById('switch');
switchButton.addEventListener('click', toggleImages);

function toggleImages() {
	if (imageGrid.group.visible) {
		hideImageGrid()
	} else {
		showImageGrid()
	}
}

function showImageGrid() {
	// Hide animated shapes
	allShapes.forEach(shape => {
	  shape.mesh.visible = false;
	});
  
	// Show the image grid
	imageGrid.group.visible = true;
  	isPaused = true;
}
  
function hideImageGrid() {
	// Show animated shapes
	allShapes.forEach((shape, index) => {
	  shape.mesh.visible = index < complexity; // Adjust visibility based on complexity
	});
  
	// Hide the image grid
	imageGrid.group.visible = false;
  	isPaused = false;
}


/* No need for GUI outside debugging.
// GUI
var gui = new dat.GUI();
gui.add(this, "speed", 0, 2);
var gridZoomControl = gui.add(camera, "zoom", 0.2, 2).listen();
var textureControl = gui.add(this, "showTexture");
var complexityControl = gui.add(this, "complexity", 1, 10).step(1);
var textureZoomControl = gui.add(this, "textureZoom", 1, 3);
var saturationControl = gui.add(this, "saturation", 0, 3);
var lightnessControl = gui.add(this, "lightness", 0, 3);
var useEnvMapControl = gui.add(this, "useEnvMap");
var reflectivityControl = gui.add(this, "reflectivity", 0, 1);
var envMapSelectControl = gui.add(this, "envMapSelect", 1, 4).step(1);
gui.add(this, "randomize");
gui.add(this, "randomizeColor");
var numAxesControl = gui.add(this, "numAxes", [4, 6, 8, 12, 16, 18, 20, 24, 28, 30, 32, 36]);
gui.add(this, "isPaused").listen();
gui.close();

envMapSelectControl.onChange(function(value){
	var urls = [
		  'images/cubeMaps/' + envMapSelect + '/pos-x.png',
		  'images/cubeMaps/' + envMapSelect + '/neg-x.png',
		  'images/cubeMaps/' + envMapSelect + '/pos-y.png',
		  'images/cubeMaps/' + envMapSelect + '/neg-y.png',
		  'images/cubeMaps/' + envMapSelect + '/pos-z.png',
		  'images/cubeMaps/' + envMapSelect + '/neg-z.png'
		];

	cubemap = THREE.ImageUtils.loadTextureCube(urls);
	cubemap.format = THREE.RGBFormat;

	document.dispatchEvent(new Event("updateMaterial"));
});

reflectivityControl.onChange(function(value){
	document.dispatchEvent(new Event("updateMaterial"));
});

useEnvMapControl.onChange(function(value){
	document.dispatchEvent(new Event("updateMaterial"));
});

gridZoomControl.onChange(function(value){
	camera.updateProjectionMatrix();
});

textureZoomControl.onChange(function(value){
	bufferCamera.position.z = textureZoom;
});

numAxesControl.onChange(function(value){
	updateGridGeometry();
});

textureControl.onChange(function(value){
	planeObj.visible = showTexture;
	scene.add(planeObj);
});

complexityControl.onChange(function(value)
{
	for (var i=0; i<numShapes; i++) 
	{
		if (i < complexity) {
			allShapes[i].mesh.visible = true;
		} else {
			allShapes[i].mesh.visible = false;
		}
	}
});

saturationControl.onChange(function(value)
{
	for (var i=0; i<numShapes; i++) {
		allShapes[i].updateColor();
	}
});

lightnessControl.onChange(function(value)
{
	for (var i=0; i<numShapes; i++) {
		allShapes[i].updateColor();
	}
});
*/

function randomize() {
	for (var i=0; i<numShapes; i++) {
		allShapes[i].update();
		bufferScene.remove(allShapes[i].mesh);
	}
	createShapes();
}

function randomizeColor() {
	for (var i=0; i<numShapes; i++) {
		allShapes[i].randomizeColor();
	}
}

function render() {
	update();
	
	renderer.render(bufferScene, bufferCamera, bufferTexture);
	renderer.render(scene, camera);

	requestAnimationFrame(render);
}
render();

function update() {
	controls.update();

	if (!isPaused && !isDragging)
	{
		for (var i=0; i<complexity; i++) {
			allShapes[i].update();
		}
	}
}

window.addEventListener('resize', function() {
	var WIDTH = window.innerWidth;
	var HEIGHT = window.innerHeight;
  
	// Update renderer size
	renderer.setSize(WIDTH / 2, HEIGHT);
  
	// Update Orthographic Camera bounds
	camera.left = (WIDTH / 2) / -2; // Adjust based on renderer's new width
	camera.right = (WIDTH / 2) / 2;
	camera.top = HEIGHT / 2;
	camera.bottom = -HEIGHT / 2;
	camera.updateProjectionMatrix();
  });  

window.addEventListener('keydown', function(e)
{
	e = e || window.event;

    if (e.keyCode == '32')  {
    	isPaused = !isPaused;
    }
});

renderer.domElement.addEventListener('mousedown', function() {
	isDragging = true;
});

renderer.domElement.addEventListener('mouseup', function() {
	isDragging = false;
});

renderer.domElement.addEventListener('touchstart', function() {
	isDragging = true;
});

renderer.domElement.addEventListener('touchend', function() {
	isDragging = false;
});
