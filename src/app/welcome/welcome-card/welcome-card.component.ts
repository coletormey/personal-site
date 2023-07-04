import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, HostListener } from "@angular/core";
import * as THREE from "three";
import * as YUKA from "yuka";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Flow } from "three/examples/jsm/modifiers/CurveModifier.js";


@Component({
  selector: 'app-welcome-card',
  templateUrl: 'welcome-card.component.html',
  styleUrls: ['welcome-card.component.css']
})
 
export class WelcomeCardComponent implements AfterViewInit {
  @ViewChild('canvas') public canvasRef: ElementRef;
  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  initialAspectRatio: any;

  // Menu Item Properties
  @Input() public revolutionSpeed: number = 0.5;
  @Input() public rotationSpeedX: number = 0.01;
  @Input() public rotationSpeedY: number = 0.01;
  @Input() public size: number = 64;
  @Input() public orientation: number = 0;
  @Input() public position: [number, number] = [0, 0]
  @Input() public texture: string = "/assets/raven.png"

  // Stage Properties
  @Input() public cameraZ: number = 400;
  @Input() public fieldOfView: number = 1;
  @Input('nearClipping') public nearClippingPane: number = 1;
  @Input('farClipping') public farClippingPane: number = 1000;

  // Helper Properties (Private Properties)
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private light!: THREE.DirectionalLight;
  private controls: OrbitControls;
  private flow!: Flow;
  private mouse = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private loader = new THREE.TextureLoader();
  private INTERSECTED: any;

  private cube: THREE.Mesh;
  private rightArrow: THREE.Mesh;
  private leftArrow: THREE.Mesh;

  private menuOptions: THREE.Group;

  private pathPoints = [
    new THREE.Vector3(3, 0, 3),
    new THREE.Vector3(3, 1, -3),
    new THREE.Vector3(-3, 1, -3),
    new THREE.Vector3(-3, 0, 3)

  ];

  private curve: THREE.CatmullRomCurve3;
  private line: THREE.LineLoop;
  

  private createMenuObjects() {
    // Objects 
    const arrowMaterial = new THREE.MeshNormalMaterial();
    const arrowGeometry = new THREE.BufferGeometry();
    const arrowPoints = [
      new THREE.Vector3(-0.5, 0.5, 0),
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, -0.5, 0)
    ];
    arrowGeometry.setFromPoints(arrowPoints);
    arrowGeometry.computeVertexNormals();
    this.rightArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.leftArrow = this.rightArrow.clone();
    this.leftArrow.position.x -= 1;
    this.leftArrow.position.y -= 1.5;
    this.rightArrow.position.x += 1.5;
    this.rightArrow.position.y -= 1.5;

    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshBasicMaterial({ map: this.loader.load(this.texture) });
    this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

/*    this.menuOptions = new THREE.Group();
    this.menuOptions.add(this.cube);*/

    // Light
    this.light = new THREE.DirectionalLight(0xc0c0c0);
    this.light.position.set(- 8, 12, 10);
    this.light.intensity = 1.0;

    // Path for menu options to travel along
    this.curve = new THREE.CatmullRomCurve3(this.pathPoints);
    this.curve.closed = true;

    const points = this.curve.getPoints(60);
    this.line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x000000 }));

    this.flow = new Flow(this.cube);
    this.flow.updateCurve(0, this.curve);
    this.flow.uniforms.flow.value = false;
  }


  /* Create the scene */
  private createScene() {
    // scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.TextureLoader().load("");
    this.createMenuObjects();

    this.scene.add(this.light);
    this.scene.add(this.line);
    this.scene.add(this.flow.object3D);
    this.scene.add(this.menuOptions);
/*    this.scene.add(this.cube);*/
    this.scene.add(this.rightArrow);
    this.scene.add(this.leftArrow);

    // camera
    let aspectRatio = this.getAspectRatio();
    this.initialAspectRatio = aspectRatio;
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      aspectRatio,
      this.nearClippingPane,
      this.farClippingPane
    )
    this.camera.position.z = this.cameraZ;

  }

  private getAspectRatio() {
    return window.innerWidth / window.innerHeight;
  }

  private hoverMenuItem() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      if (this.INTERSECTED !== intersects[0].object ) { 
        this.INTERSECTED = intersects[0].object;
        if (this.INTERSECTED !== this.rightArrow && this.INTERSECTED !== this.leftArrow)
/*          this.INTERSECTED.rotation.x += 100;*/console.log('hey');
      } else 
        this.INTERSECTED = null;
    }
  }

  
  // Animate 
  private animate() {
    this.cube.rotation.x += this.rotationSpeedX;
    this.cube.rotation.y += this.rotationSpeedY;
    this.flow.moveAlongCurve(0.0006);
  }

  // Resize
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.renderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // Locate Mouse
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const pos = this.getCanvasRelativePosition(event);
    this.mouse.x = (pos.x / this.canvas.width) * 2 - 1;
    this.mouse.y = (pos.y / this.canvas.height) * -2 + 1;
  }

  // Click Event
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      this.INTERSECTED = intersects[0].object;
      switch (this.INTERSECTED) {
        case this.leftArrow:

          break;
        case this.rightArrow:

          break;

      }
    }
  }

  getCanvasRelativePosition(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * this.canvas.width / rect.width,
      y: (event.clientY - rect.top) * this.canvas.height / rect.height,
    };
  }

  // Begin Rendering Loop
  private startRenderingLoop() {
    // use canvas element in template
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement); 

    let component: WelcomeCardComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.hoverMenuItem();
      component.renderer.render(component.scene, component.camera);
      component.animate();
    }());
  }

  ngAfterViewInit() {
    this.createScene();
    this.startRenderingLoop();
  }

  ngOnInit() {

  }

}
