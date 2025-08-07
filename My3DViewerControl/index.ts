import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class My3DViewerControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _renderer: THREE.WebGLRenderer;
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _cube: THREE.Mesh;
    private _controls: OrbitControls;

    constructor() {
        // nothing here
    }

    public init(
        context: ComponentFramework.Context<IInputs>, 
        notifyOutputChanged: () => void, 
        state: ComponentFramework.Dictionary, 
        container: HTMLDivElement
    ): void {
        this._container = container;

        // Track window size - important for code inside updateView.
        context.mode.trackContainerResize(true);

        // Initialize Three.js renderer
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setClearColor(0xffffff); // Set background color to white
        container.appendChild(this._renderer.domElement);

        // Create a scene
        this._scene = new THREE.Scene();

        // Add a camera
        this._camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this._camera.position.z = 2;

        // Create a simple cube with basic material
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this._cube = new THREE.Mesh(geometry, material);
        this._scene.add(this._cube);

        // Initialize OrbitControls
        this._controls = new OrbitControls(this._camera, this._renderer.domElement);
        this._controls.enableDamping = true; // Enable smooth damping
        this._controls.dampingFactor = 0.05; // Damping factor
        this._controls.enableZoom = true; // Enable zoom
        this._controls.enableRotate = true; // Enable rotation
        this._controls.enablePan = true; // Enable panning

        // Start animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            
            // Update controls
            this._controls.update();
            
            // Render the scene
            this._renderer.render(this._scene, this._camera);
        };
        animate();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Change the render size depending on the parent container (the container that is inside the Canvas App)
        const width = context.mode.allocatedWidth;
        const height = context.mode.allocatedHeight;

        this._renderer.setSize(width, height);
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        
        // Update controls after camera changes
        this._controls.update();

        // Handle table data input
        const tableData = context.parameters.tableData;
        if (tableData && tableData.columns) {
            // You can access table data here
            console.log("Table columns:", Object.keys(tableData.columns));
            if (tableData.sortedRecordIds && tableData.sortedRecordIds.length > 0) {
                console.log("Table has", tableData.sortedRecordIds.length, "rows");
                
                // Example: Access first row data
                const firstRecordId = tableData.sortedRecordIds[0];
                const record = tableData.records[firstRecordId];
                console.log("First record:", record);
            }
        }
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        // Dispose controls
        this._controls.dispose();
        
        // Cleanup Three.js resources
        this._renderer.dispose();
        
        // Dispose geometry and materials
        this._cube.geometry.dispose();
        if (this._cube.material instanceof THREE.Material) {
            this._cube.material.dispose();
        }
    }
}
