import * as THREE from './libs/three.js-r132/build/three.module.js';
import { GLTFLoader } from './libs/three.js-r132/examples/jsm/loaders/GLTFLoader.js';

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

// Add lights
const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 1); // Position in front
directionalLight.castShadow = true; // Enable shadows
directionalLight.shadow.mapSize.width = 2048;  // Higher resolution shadows
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);




// Position the camera
camera.position.set(0, 0, 10);


const capturedImage = localStorage.getItem("capturedImage");

// Load background image
const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load(capturedImage, (texture) => {
    const aspect = window.innerWidth / window.innerHeight;
    const bgMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(20 * aspect, 20),
        new THREE.MeshBasicMaterial({ map: texture })
    );
    bgMesh.position.z = -5; // Ensure it's behind the 3D objects
    scene.add(bgMesh);
});

// Selection Box Variables
let startX, startY;
let selectionBox = document.createElement("div");
selectionBox.style.position = "absolute";
selectionBox.style.border = "2px dashed blue";
selectionBox.style.background = "rgba(0, 0, 255, 0.2)";
selectionBox.style.display = "none";
document.body.appendChild(selectionBox);

// Mouse Events for Selection
window.addEventListener("mousedown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    selectionBox.style.display = "block";
});

window.addEventListener("mousemove", (event) => {
    if (event.buttons !== 1) return;
    let width = event.clientX - startX;
    let height = event.clientY - startY;
    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;
    selectionBox.style.left = `${Math.min(startX, event.clientX)}px`;
    selectionBox.style.top = `${Math.min(startY, event.clientY)}px`;
});

window.addEventListener("mouseup", (event) => {
    let endX = event.clientX;
    let endY = event.clientY;
    selectionBox.style.display = "none";
    create3DModelFromSelection(startX, startY, endX, endY);
});

// Convert Screen Coordinates to World Coordinates
function screenToWorld(x, y, camera) {
    let vector = new THREE.Vector3((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1, 0.5);
    vector.unproject(camera);
    let dir = vector.sub(camera.position).normalize();
    let distance = -camera.position.z / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
}

// Load and place the 3D Model
// Load and place the 3D Model with a custom texture
function create3DModelFromSelection(startX, startY, endX, endY) {
    let worldStart = screenToWorld(startX, startY, camera);
    let worldEnd = screenToWorld(endX, endY, camera);

    let targetWidth = Math.abs(worldEnd.x - worldStart.x);
    let targetHeight = Math.abs(worldEnd.y - worldStart.y);

    const loader = new GLTFLoader();
    loader.load('models/Roman_shades_03.gltf', (gltf) => {
        let model = gltf.scene;

        // Load the texture
        const textureLoader = new THREE.TextureLoader();
        const windowTexture = textureLoader.load('images/pattern4.jpg', (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(targetWidth, targetHeight); // Tile based on selection size

            texture.center.set(0.5, 0.5);  // Set center point for rotation
            texture.rotation = Math.PI / 2; // Rotate texture 45 degrees
            texture.offset.set(0.1, 0.2);  // Shift texture position
        });

        // Apply the texture to all meshes in the model
        model.traverse((child) => {
            if (child.isMesh) {
                child.geometry.computeBoundingBox(); // Ensure bounding box is updated
                child.material = new THREE.MeshStandardMaterial({ 
                    map: windowTexture, 
                    roughness: 0.5, 
                    metalness: 0.3 
                });
            }
        });

        // Compute the actual size of the model
        let box = new THREE.Box3().setFromObject(model);
        let modelSize = new THREE.Vector3();
        box.getSize(modelSize); // Get original model size

        // Scale X and Y independently to match selection box exactly
        let scaleX = targetWidth / modelSize.x;
        let scaleY = targetHeight / modelSize.y;

        model.scale.set(scaleX, scaleY, 1); // Stretch model to fit

        // Get new bounding box after scaling
        box.setFromObject(model);
        let newSize = new THREE.Vector3();
        box.getSize(newSize);

        // Center model inside the selection box
        let centerX = (worldStart.x + worldEnd.x) / 2;
        let centerY = (worldStart.y + worldEnd.y) / 2;
        let centerZ = 0.1; // Keep above background

        let modelCenter = new THREE.Vector3();
        box.getCenter(modelCenter);
        model.position.set(
            centerX - (modelCenter.x - model.position.x),
            centerY - (modelCenter.y - model.position.y),
            centerZ
        );

        scene.add(model);
    }, undefined, (error) => {
        console.error('Error loading model:', error);
    });
}




// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
