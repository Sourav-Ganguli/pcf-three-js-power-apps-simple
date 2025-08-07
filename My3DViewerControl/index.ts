import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class My3DViewerControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _renderer: THREE.WebGLRenderer;
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _controls: OrbitControls;
    private _cubes: THREE.Mesh[] = [];

    constructor() {
        // nothing here
    }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._container = container;
        context.mode.trackContainerResize(true);

        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setClearColor(0xffffff);
        container.appendChild(this._renderer.domElement);

        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this._camera.position.z = 5;

        this._controls = new OrbitControls(this._camera, this._renderer.domElement);

        const animate = () => {
            requestAnimationFrame(animate);
            this._controls.update();
            this._renderer.render(this._scene, this._camera);
        };
        animate();
    }

    // Parse GeoJSON polygon (always closed 2D polygon)
    private parseGeoJSON(geoJsonString: string): THREE.Vector2[] | null {
        try {
            const geoJson = JSON.parse(geoJsonString);
            
            if (geoJson.type === 'Polygon' && geoJson.coordinates && geoJson.coordinates.length > 0) {
                // Get the outer ring (first array in coordinates)
                const outerRing = geoJson.coordinates[0];
                
                // Convert coordinates to Vector2 array for Three.js Shape
                // Remove the last point since GeoJSON polygons are closed (first == last)
                const points: THREE.Vector2[] = outerRing.slice(0, -1).map((coord: number[]) => {
                    return new THREE.Vector2(coord[0], coord[1]);
                });
                
                return points.length >= 3 ? points : null; // Need at least 3 points for a valid polygon
            }
        } catch (error) {
            console.error('Error parsing GeoJSON:', error);
        }
        
        return null;
    }


    // Create cubes for each table row
    private createCubes(tableData: ComponentFramework.PropertyTypes.DataSet): void {
        // Clear existing cubes
        this._cubes.forEach(cube => {
            this._scene.remove(cube);
            cube.geometry.dispose();
            if (cube.material instanceof THREE.Material) {
                cube.material.dispose();
            }
        });
        this._cubes = [];

        if (!tableData || !tableData.sortedRecordIds) {
            return;
        }

        // Create cubes for each row
        const gridSize = Math.ceil(Math.sqrt(tableData.sortedRecordIds.length));
        
        tableData.sortedRecordIds.forEach((recordId, index) => {
            const record = tableData.records[recordId];
            const colorHex = record.getFormattedValue('Color Hex') || '#FF5733'; // fallback to first color if no color
            const geoJsonString = record.getFormattedValue('Geometry');

            const points = this.parseGeoJSON(geoJsonString);

               // Add null check before creating the shape
            if (!points || points.length < 3) {
                console.warn('Invalid or insufficient points for polygon, skipping shape creation');
                return; // Skip this iteration if no valid points
            }

            const shape = new THREE.Shape(points);

            // Create extruded geometry with consistent settings for 2D polygons
            const extrudeSettings = {
                        depth: 1.5, // Extrusion depth
                        bevelEnabled: true,
                        bevelThickness: 0.1,
                        bevelSize: 0.1,
                        bevelSegments: 2
                    };
            
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

            const cube = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) })
            );
            
            // Simple grid positioning - center the grid
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            const offsetX = (gridSize - 1) * 1.5; // Center the grid
            const offsetZ = (gridSize - 1) * 1.5;
            cube.position.set(col * 3 - offsetX, 0, row * 3 - offsetZ);
            
            this._scene.add(cube);
            this._cubes.push(cube);
        });

        // Adjust camera position to view all cubes
        const distance = Math.max(gridSize * 3, 10);
        this._camera.position.set(distance, distance * 0.5, distance);
        this._camera.lookAt(0, 0, 0);
        this._controls.update();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        const width = context.mode.allocatedWidth;
        const height = context.mode.allocatedHeight;

        this._renderer.setSize(width, height);
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._controls.update();

        // Create cubes from table data
        const tableData = context.parameters.tableData;
        
        if (tableData && tableData.sortedRecordIds) {
            // Always recreate cubes when data changes
            this.createCubes(tableData);
        }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this._controls.dispose();
        this._cubes.forEach(cube => {
            this._scene.remove(cube);
            cube.geometry.dispose();
            if (cube.material instanceof THREE.Material) {
                cube.material.dispose();
            }
        });
        this._renderer.dispose();
    }
}
