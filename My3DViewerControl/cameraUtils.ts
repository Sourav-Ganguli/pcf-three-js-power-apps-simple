import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Calculates the bounding box that encompasses all visible meshes in the scene
 * @param scene - The Three.js scene containing the meshes
 * @returns The bounding box of all meshes, or null if no meshes found
 */
function calculateSceneBounds(scene: THREE.Scene): THREE.Box3 | null {
    const box = new THREE.Box3();
    let hasGeometry = false;

    scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry) {
            // Update geometry's bounding box if needed
            if (!object.geometry.boundingBox) {
                object.geometry.computeBoundingBox();
            }
            
            if (object.geometry.boundingBox) {
                // Clone the bounding box and apply the object's transform
                const meshBox = object.geometry.boundingBox.clone();
                meshBox.applyMatrix4(object.matrixWorld);
                
                if (hasGeometry) {
                    box.union(meshBox);
                } else {
                    box.copy(meshBox);
                    hasGeometry = true;
                }
            }
        }
    });

    return hasGeometry ? box : null;
}

/**
 * Zooms the camera to fit all geometry in the scene
 * @param camera - The Three.js perspective camera
 * @param controls - The orbit controls for the camera
 * @param scene - The Three.js scene containing the geometry
 * @param fitPadding - Padding factor (1.0 = exact fit, 1.2 = 20% padding)
 */
export function zoomToFitGeometry(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    scene: THREE.Scene,
    fitPadding: number = 1.2
): void {
    const bounds = calculateSceneBounds(scene);
    
    if (!bounds || bounds.isEmpty()) {
        console.warn('No geometry found in scene to zoom to');
        return;
    }

    // Calculate the center and size of the bounding box
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    
    // Calculate the maximum dimension
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    // Calculate the distance needed to fit the object in view
    const fov = camera.fov * (Math.PI / 180); // Convert to radians
    const distance = (maxDimension / 2) / Math.tan(fov / 2);
    
    // Apply padding
    const paddedDistance = distance * fitPadding;
    
    // Position camera at an angle for better 3D viewing
    const cameraDirection = new THREE.Vector3(1, 0.8, 1).normalize();
    const newCameraPosition = center.clone().add(cameraDirection.multiplyScalar(paddedDistance));
    
    // Update camera position and target
    camera.position.copy(newCameraPosition);
    camera.lookAt(center);
    
    // Update controls target and position
    controls.target.copy(center);
    controls.update();
    
    console.log(`Zoomed to fit geometry. Bounds size: ${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}`);
}

/**
 * Smoothly animates the camera to fit all geometry in the scene
 * @param camera - The Three.js perspective camera
 * @param controls - The orbit controls for the camera
 * @param scene - The Three.js scene containing the geometry
 * @param fitPadding - Padding factor (1.0 = exact fit, 1.2 = 20% padding)
 * @param duration - Animation duration in milliseconds
 */
export function animateZoomToFit(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    scene: THREE.Scene,
    fitPadding: number = 1.2,
    duration: number = 1000
): void {
    const bounds = calculateSceneBounds(scene);
    
    if (!bounds || bounds.isEmpty()) {
        console.warn('No geometry found in scene to zoom to');
        return;
    }

    // Calculate target position and center
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const distance = (maxDimension / 2) / Math.tan(fov / 2);
    const paddedDistance = distance * fitPadding;
    
    const cameraDirection = new THREE.Vector3(1, 0.8, 1).normalize();
    const targetPosition = center.clone().add(cameraDirection.multiplyScalar(paddedDistance));
    
    // Store initial values
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    
    const startTime = performance.now();
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate camera position
        camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
        
        // Interpolate controls target
        controls.target.lerpVectors(startTarget, center, easeProgress);
        
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}
