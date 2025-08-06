import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as THREE from "three";

export class My3DViewerControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _renderer: THREE.WebGLRenderer;
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _cube: THREE.Mesh;
    private _raycaster: THREE.Raycaster;
    private _mouse: THREE.Vector2;
    private _intersected: THREE.Object3D | null = null;
    
    // Mouse interaction properties for rotation
    private _isMouseDown: boolean = false;
    private _mouseX: number = 0;
    private _mouseY: number = 0;
    private _targetRotationX: number = 0;
    private _targetRotationY: number = 0;
    private _targetRotationOnMouseDownX: number = 0;
    private _targetRotationOnMouseDownY: number = 0;
    private _mouseXOnMouseDown: number = 0;
    private _mouseYOnMouseDown: number = 0;

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
        this._renderer.setClearColor(0xffffff); // Set background color to white - can set to different color to see the edges of the render window.
        this._renderer.shadowMap.enabled = true; // Enable shadow maps
        container.appendChild(this._renderer.domElement);

        

        // Create a scene
        this._scene = new THREE.Scene();

        // Add a camera
        this._camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

        this._camera.position.z = 2;

        // Create a cube
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Use MeshStandardMaterial for better lighting
        this._cube = new THREE.Mesh(geometry, material);
        this._cube.castShadow = true; // Enable casting shadows
        this._scene.add(this._cube);

        // Create a plane to receive the shadow
        const planeGeometry = new THREE.PlaneGeometry(500, 500);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -1;
        plane.receiveShadow = true; // Enable receiving shadows
        this._scene.add(plane);

        // Add a directional light
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        light.castShadow = true; // Enable shadow casting by the light
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        this._scene.add(light);

        // Initialize raycaster and mouse vector
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();

        // Add event listeners for mouse interaction
        container.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        container.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        container.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        container.addEventListener('click', this.onMouseClick.bind(this), false);

        // Render the scene with static animation loop for smooth rotation interpolation
        const animate = () => {
            requestAnimationFrame(animate);
            
            // Smooth rotation interpolation
            this._cube.rotation.x += (this._targetRotationX - this._cube.rotation.x) * 0.05;
            this._cube.rotation.y += (this._targetRotationY - this._cube.rotation.y) * 0.05;
            
            this._renderer.render(this._scene, this._camera);
        };
        animate();
    }

    // Mouse event handlers for rotation control
    private onMouseDown(event: MouseEvent): void {
        event.preventDefault();
        this._isMouseDown = true;
        this._mouseXOnMouseDown = event.clientX;
        this._mouseYOnMouseDown = event.clientY;
        this._targetRotationOnMouseDownX = this._targetRotationX;
        this._targetRotationOnMouseDownY = this._targetRotationY;
    }

    private onMouseUp(event: MouseEvent): void {
        event.preventDefault();
        this._isMouseDown = false;
    }

    private onMouseMove(event: MouseEvent): void {
        event.preventDefault();
        
        if (this._isMouseDown) {
            this._mouseX = event.clientX;
            this._mouseY = event.clientY;
            
            // Calculate rotation based on mouse movement
            this._targetRotationY = this._targetRotationOnMouseDownY + (this._mouseX - this._mouseXOnMouseDown) * 0.02;
            this._targetRotationX = this._targetRotationOnMouseDownX + (this._mouseY - this._mouseYOnMouseDown) * 0.02;
        }
    }

    
    // Change color on mouse click to check the 3D scene is interactable.
    private onMouseClick(event: MouseEvent): void {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = this._container.getBoundingClientRect();
        this._mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update the raycaster with the mouse position and the camera
        this._raycaster.setFromCamera(this._mouse, this._camera);

        // Calculate objects intersected by the raycaster
        const intersects = this._raycaster.intersectObjects(this._scene.children);

        if (intersects.length > 0) {
            // Check if the intersected object is the cube
            if (intersects[0].object === this._cube) {
                const material = this._cube.material;
                if (Array.isArray(material)) {
                    material.forEach((mat) => {
                        if (mat instanceof THREE.MeshStandardMaterial) {
                            mat.color.setHex(Math.random() * 0xffffff); // Change color on click
                        }
                    });
                } else if (material instanceof THREE.MeshStandardMaterial) {
                    material.color.setHex(Math.random() * 0xffffff); // Change color on click
                }
            }
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        
        // Change the render size depending on the parent container (the container that is inside the Canvas App)
        const width = context.mode.allocatedWidth;
        const height = context.mode.allocatedHeight;

        this._renderer.setSize(width, height);
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();

    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        // Remove event listeners
        this._container.removeEventListener('mousedown', this.onMouseDown.bind(this), false);
        this._container.removeEventListener('mouseup', this.onMouseUp.bind(this), false);
        this._container.removeEventListener('mousemove', this.onMouseMove.bind(this), false);
        this._container.removeEventListener('click', this.onMouseClick.bind(this), false);
        
        // Cleanup Three.js resources
        this._renderer.dispose();
        
        // Dispose geometry and materials
        this._cube.geometry.dispose();
        if (this._cube.material instanceof THREE.Material) {
            this._cube.material.dispose();
        }
    }
}
