import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, HostListener } from "@angular/core";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Flow } from "three/examples/jsm/modifiers/CurveModifier.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import { MathUtils } from 'three';


@Component({
  selector: 'app-welcome-card',
  templateUrl: 'welcome-card.component.html',
  styleUrls: ['welcome-card.component.css']
})

export class WelcomeCardComponent {
  @ViewChild('canvas') public canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  // Stage Properties
  @Input() public cameraZ: number = 100;
  @Input() public cameraY: number = -250;
  @Input() public fieldOfView: number = 1.5;
  @Input('nearClipping') public nearClippingPane: number = 1;
  @Input('farClipping') public farClippingPane: number = 1000;
  @Input() public fov = 1.5;
  @Input() public planeAspectRatio: number;
  @Input() public initWidth: number;
  @Input() public initHeight: number;

  // Helper Properties (Private Properties)
  private scene!: THREE.Scene;
  private sceneBackgroundTexture: string = "/assets/AC_menuBackground.png";

  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private labelRenderer!: CSS2DRenderer;
  private mouse!: THREE.Vector2;
  private controls!: OrbitControls;
  private curve!: THREE.CatmullRomCurve3;
  private loader!: THREE.TextureLoader;
  private raycaster!: THREE.Raycaster;
  private menuOptionMesh_profile!: THREE.Mesh;
  private menuOptionMesh_services!: THREE.Mesh;
  private menuOptionMesh_system!: THREE.Mesh;
  private flow_profileOption!: Flow;
  private flow_servicesOption!: Flow;
  private flow_systemOption!: Flow;
  private leftMenuArrow!: THREE.Mesh;
  private rightMenuArrow!: THREE.Mesh;
  private menuOptionCircle!: THREE.Line;
  private INTERSECTED: any;
  private listOfSceneObjects = [];


  ngOnInit() {
    this.scene = new THREE.Scene();
/*    this.scene.background = new THREE.TextureLoader().load(this.sceneBackgroundTexture);*/
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      this.getAspectRatio(),
      this.nearClippingPane,
      this.farClippingPane
    );
    this.camera.position.z = this.cameraZ;
    this.camera.position.y = this.cameraY;
    this.mouse = new THREE.Vector2();
    this.loader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();
    this.labelRenderer = new CSS2DRenderer();
    this.createSceneObjects();

  }


  ngAfterViewInit() {
    this.startRenderingLoop();
  }


  private createSceneObjects() {
    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -4, 0),
      new THREE.Vector3(4, 0, 0),
      new THREE.Vector3(0, 4, 0),
      new THREE.Vector3(-4, 0, 0),
    ]);
    this.curve.closed = true;
    const points = this.curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this.menuOptionCircle = new THREE.Line(geometry, material);
    this.scene.add(this.menuOptionCircle);

    const cube1 = new THREE.BoxGeometry(1, 1, 1);
    const cube2 = new THREE.BoxGeometry(1, 1, 1);
    const cube3 = new THREE.BoxGeometry(1, 1, 1);

    const profileMaterial = new THREE.MeshBasicMaterial({ color: 0x800080 });
    this.menuOptionMesh_profile = new THREE.Mesh(cube1, profileMaterial);
    this.flow_profileOption = new Flow(this.menuOptionMesh_profile);
    this.flow_profileOption.updateCurve(0, this.curve);
    this.flow_profileOption.uniforms.flow.value = false;
    this.scene.add(this.flow_profileOption.object3D);

    const servicesMaterial = new THREE.MeshBasicMaterial({ color: 0xC0C0C0 });
    this.menuOptionMesh_services = new THREE.Mesh(cube2, servicesMaterial);
    this.flow_servicesOption = new Flow(this.menuOptionMesh_services);
    this.flow_servicesOption.updateCurve(0, this.curve);
    this.flow_servicesOption.uniforms.flow.value = false;
    this.flow_servicesOption.uniforms.pathOffset.value = 0.25;
    this.scene.add(this.flow_servicesOption.object3D);

    const systemMaterial = new THREE.MeshBasicMaterial({ color: 0xBB0000 });
    this.menuOptionMesh_system = new THREE.Mesh(cube3, systemMaterial);
    this.flow_systemOption = new Flow(this.menuOptionMesh_system);
    this.flow_systemOption.updateCurve(0, this.curve);
    this.flow_systemOption.uniforms.flow.value = false;
    this.flow_systemOption.uniforms.pathOffset.value = 0.75;
    this.scene.add(this.flow_systemOption.object3D);

  }


  private startRenderingLoop() {
    this.renderer = new THREE.WebGL1Renderer({ canvas: this.canvas });
    this.renderer.setPixelRatio(window.devicePixelRatio);

      this.renderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
      this.initWidth = window.innerWidth;
      this.initHeight = window.innerHeight * 2 / 3;
      this.planeAspectRatio = this.initWidth / this.initHeight;
    

/*    this.labelRenderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';*/
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    let component: WelcomeCardComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.hoverMenuItem();
      component.renderer.render(component.scene, component.camera);
      component.labelRenderer.render(component.scene, component.camera);
      component.animate();
    }());
  }


  private animate() {

  }


  private getAspectRatio() {
    return window.innerWidth / (window.innerHeight * 2 / 3);
  }

  // Hover
  private hoverMenuItem() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0 ) {
        this.INTERSECTED = intersects[0].object;

      
    }
  }


  // Resize
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.renderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.camera.aspect = window.innerWidth / (window.innerHeight * 2 / 3);
    this.camera.updateProjectionMatrix();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    if (this.camera.aspect > this.initWidth / this.initHeight) {
      // window too large
      this.camera.fov = this.fov;
    } else {
      // window too narrow
      const cameraHeight = Math.tan(MathUtils.degToRad(this.fov / 2));
      const ratio = this.camera.aspect / this.planeAspectRatio;
      const newCameraHeight = cameraHeight / ratio;
      this.camera.fov = MathUtils.radToDeg(Math.atan(newCameraHeight)) * 2;
    }
  }

  // Locate Mouse
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const pos = this.getCanvasRelativePosition(event);
    this.mouse.x = (pos.x / this.canvas.width) * 2 - 1;
    this.mouse.y = (pos.y / this.canvas.height) * -2 + 1;
  }
  getCanvasRelativePosition(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * this.canvas.width / rect.width,
      y: (event.clientY - rect.top) * this.canvas.height / rect.height,
    };
  }

  // Click Event
/*  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let intersects = this.raycaster.intersectObjects(this.scene.children, true);
    let temp: any;
    if (intersects.length > 0) {
      this.INTERSECTED = intersects[0].object;
    }
  }*/
}
