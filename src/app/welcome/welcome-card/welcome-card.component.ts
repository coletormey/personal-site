import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, HostListener } from "@angular/core";
import * as THREE from "three";


@Component({
  selector: 'app-welcome-card',
  templateUrl: 'welcome-card.component.html',
  styleUrls: ['welcome-card.component.css']
})
 
export class WelcomeCardComponent implements AfterViewInit {
  @ViewChild('canvas') public canvasRef: ElementRef;
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
  private loader = new THREE.TextureLoader();
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshBasicMaterial({ map: this.loader.load(this.texture) });

  private cube1: THREE.Mesh = new THREE.Mesh(this.geometry, this.material);

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  /* Create the scene */
  private createScene() {
    // scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.TextureLoader().load("");
/*    this.scene.background = new THREE.Color("black");*/
    this.scene.add(this.cube1);

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

  // Animate 
  private animate() {
    this.cube1.rotation.x += this.rotationSpeedX;
    this.cube1.rotation.y += this.rotationSpeedY;
  }

  // Resize
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.renderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // Begin Rendering Loop
  private startRenderingLoop() {
    // use canvas element in template
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight * 2/3);

    let component: WelcomeCardComponent = this;
    (function render() {
      requestAnimationFrame(render);
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
