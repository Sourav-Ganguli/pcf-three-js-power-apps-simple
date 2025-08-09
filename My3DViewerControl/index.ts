import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createCubes } from './cubeCreator';

export class My3DViewerControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _renderer: THREE.WebGLRenderer;
    private _scene: THREE.Scene;
    private _camera: THREE.PerspectiveCamera;
    private _controls: OrbitControls;
    private _cubes: THREE.Mesh[] = [];

    constructor() {}

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        context.mode.trackContainerResize(true);

        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setClearColor(0xffffff);
        container.appendChild(this._renderer.domElement);

        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this._camera.position.set(10, 5, 10);

        this._controls = new OrbitControls(this._camera, this._renderer.domElement);

        const animate = () => {
            requestAnimationFrame(animate);
            this._controls.update();
            this._renderer.render(this._scene, this._camera);
        };
        animate();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        const width = context.mode.allocatedWidth;
        const height = context.mode.allocatedHeight;

        this._renderer.setSize(width, height);
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();

        const tableData = context.parameters.tableData;
        if (tableData?.sortedRecordIds && tableData.sortedRecordIds.length > 0) {
            this._cubes = createCubes(tableData, this._scene, this._camera, this._controls, this._cubes);
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
            (cube.material as THREE.Material).dispose();
        });
        this._renderer.dispose();
    }
}
