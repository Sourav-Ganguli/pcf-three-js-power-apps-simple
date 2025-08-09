import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { zoomToFitGeometry } from './cameraUtils';

// Parse string list of points into 3js objects
function parseCoordinates(coordinateString: string): THREE.Vector2[] | null {
    try {
        // Use Function constructor to parse the array string safely
        const coordinates = new Function('return ' + coordinateString)();
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
            return null;
        }

        // Handle nested array structure - get the first polygon
        const polygonCoords = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
        
        if (!polygonCoords || polygonCoords.length < 3) {
            return null;
        }

        // Find bounds to normalize coordinates
        let minLon = Infinity, maxLon = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;
        
        polygonCoords.forEach((coord: number[]) => {
            if (Array.isArray(coord) && coord.length >= 2) {
                const [lon, lat] = coord;
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
            }
        });

        // Calculate center point for translation
        const centerLon = (minLon + maxLon) / 2;
        const centerLat = (minLat + maxLat) / 2;
        
        // Scale factor to convert from degrees to reasonable Three.js units
        const scale = 100000; // Adjust this value to make shapes appropriately sized
        
        return polygonCoords.map((coord: number[]) => {
            if (!Array.isArray(coord) || coord.length < 2) {
                throw new Error('Invalid coordinate format');
            }
            
            // Translate to center at origin and scale
            const x = (coord[0] - centerLon) * scale;
            const y = (coord[1] - centerLat) * scale;
            
            return new THREE.Vector2(x, y);
        });
    } catch (error) {
        console.error('Failed to parse coordinates:', error);
        return null;
    }
}

export function createCubes(
    tableData: ComponentFramework.PropertyTypes.DataSet,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    existingCubes: THREE.Mesh[]
): THREE.Mesh[] {
    // Clear existing cubes
    existingCubes.forEach(cube => {
        scene.remove(cube);
        cube.geometry.dispose();
        (cube.material as THREE.Material).dispose();
    });

    if (!tableData?.sortedRecordIds || tableData.sortedRecordIds.length === 0) {
        return [];
    }

    const newCubes: THREE.Mesh[] = [];
    
    // Calculate global bounds for all polygons to center the entire scene
    let globalMinLon = Infinity, globalMaxLon = -Infinity;
    let globalMinLat = Infinity, globalMaxLat = -Infinity;
    
    // First pass: calculate global bounds
    tableData.sortedRecordIds.forEach((recordId) => {
        const record = tableData.records[recordId];
        if (!record) return;
        
        const coordinatesString = record.getFormattedValue('Coordinates');
        try {
            const coordinates = new Function('return ' + coordinatesString)();
            const polygonCoords = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
            
            polygonCoords.forEach((coord: number[]) => {
                if (Array.isArray(coord) && coord.length >= 2) {
                    globalMinLon = Math.min(globalMinLon, coord[0]);
                    globalMaxLon = Math.max(globalMaxLon, coord[0]);
                    globalMinLat = Math.min(globalMinLat, coord[1]);
                    globalMaxLat = Math.max(globalMaxLat, coord[1]);
                }
            });
        } catch (error) {
            console.error('Error parsing coordinates for bounds:', error);
        }
    });
    
    const globalCenterLon = (globalMinLon + globalMaxLon) / 2;
    const globalCenterLat = (globalMinLat + globalMaxLat) / 2;
    const scale = 100000;
    
    tableData.sortedRecordIds.forEach((recordId, index) => {
        const record = tableData.records[recordId];
        if (!record) return; // Skip if no record data
        
        const colorHex = record.getFormattedValue('Color Hex') || '#FF5733';
        const coordinatesString = record.getFormattedValue('Coordinates');
        const floors = parseFloat(record.getFormattedValue('Floors')) || 1;

        try {
            const coordinates = new Function('return ' + coordinatesString)();
            const polygonCoords = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
            
            if (!polygonCoords || polygonCoords.length < 3) {
                console.warn('Invalid or insufficient points for polygon, skipping shape creation');
                return;
            }

            // Convert coordinates relative to global center
            const points = polygonCoords.map((coord: number[]) => {
                const x = (coord[0] - globalCenterLon) * scale;
                const y = (coord[1] - globalCenterLat) * scale;
                return new THREE.Vector2(x, y);
            });

            const shape = new THREE.Shape(points);

            // Create extruded geometry based on floors value
            const extrudeSettings = {
                depth: 0.1, // Constant value
                bevelEnabled: true,
                bevelThickness: 0.1,
                bevelSize: 0.1,
                bevelSegments: 2
            };
            
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
            const polygon = new THREE.Mesh(geometry, material);
            
            // Position at origin since coordinates are already centered
            polygon.position.set(0, 0, 0);
            
            scene.add(polygon);
            newCubes.push(polygon);
        } catch (error) {
            console.error('Error creating polygon:', error);
        }
    });

    // Use the new zoom-to-fit functionality instead of manual camera positioning
    zoomToFitGeometry(camera, controls, scene, 1.3);

    return newCubes;
}
