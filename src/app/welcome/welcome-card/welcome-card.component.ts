import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, HostListener } from "@angular/core";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Flow } from "three/examples/jsm/modifiers/CurveModifier.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
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
  @Input('nearClipping') public nearClippingPane: number = 1.5;
  @Input('farClipping') public farClippingPane: number = 1000;
  @Input() public fov = 1.5;
  @Input() public planeAspectRatio: number;
  @Input() public initWidth: number;
  @Input() public initHeight: number;

  // Helper Properties (Private Properties)
  private scene!: THREE.Scene;
  private sceneBackgroundTexture: string = "/assets/AC_menuBackground.png";
  private clock = new THREE.Clock();
  private speed = 1; //units per second
  private delta = 0;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private mouse!: THREE.Vector2;
  private controls!: OrbitControls;
  private curve!: THREE.CatmullRomCurve3;
  private loader!: THREE.TextureLoader;
  private raycaster!: THREE.Raycaster;

  // Title Screen Objects
  private titleSubtextRenderer!: CSS2DRenderer;
  private titleEnterTextRenderer!: CSS2DRenderer;
  private titleCard!: THREE.Mesh;
  private titleEnterButton!: THREE.Mesh;

  // Menu Screen Objects
  private menuOptionMesh_profile!: THREE.Mesh;
  private menuOptionMesh_services!: THREE.Mesh;
  private menuOptionMesh_system!: THREE.Mesh;
  private flow_profileOption!: Flow;
  private flow_servicesOption!: Flow;
  private flow_systemOption!: Flow;
  private leftMenuArrow!: THREE.Mesh;
  private rightMenuArrow!: THREE.Mesh;
  private menuOptionCircle!: THREE.Line;
  private rotateMenuRight: boolean = false;
  private rotateMenuLeft: boolean = false;
  private INTERSECTED: any;
  private listOfMenuObjects: Flow[] = [];
  private menuOptionsLocation = [0, 0.25, 0.75];
  private menuOptionsFlowSpeedPerPosition_Left = [-0.01, -0.01, -0.02];
  private menuOptionsFlowSpeedPerPosition_Right = [0.01, 0.02, 0.01];

  private pre = document.createElement('pre')

  ngOnInit() {
    // MAIN MENU SCENE
    let sceneTitleScreen = new THREE.Scene();
    this.scene = sceneTitleScreen;
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView * 2,
      this.getAspectRatio(),
      this.nearClippingPane,
      this.farClippingPane
    );
    this.camera.position.z = this.cameraZ;
    this.camera.position.y = this.cameraY;
    this.mouse = new THREE.Vector2();
    this.loader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();
    this.titleSubtextRenderer = new CSS2DRenderer();
    this.titleSubtextRenderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.titleSubtextRenderer.domElement.style.position = 'absolute';
    this.titleSubtextRenderer.domElement.style.top = '32vh';
    this.titleSubtextRenderer.domElement.style.left = '0vw';
    this.titleSubtextRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(this.titleSubtextRenderer.domElement);
/*    this.createSceneMenuObjects();*/

    this.createTitleScreenObjects();


    //vvvvv   THIS can be used on a click event to load another scene

/*    this.scene = sceneTitle;
    this.createSceneMenuObjects();*/

  }


  ngAfterViewInit() {
    this.startRenderingLoop();
  }


  private createTitleScreenObjects() {
    const titleCardGeometry = new THREE.PlaneGeometry(25, 30);
    const titleCardMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFF0,
      side: THREE.DoubleSide
    });
    this.titleCard = new THREE.Mesh(titleCardGeometry, titleCardMaterial);
    try {
      const texture = this.loader.load('./assets/tormey-xyz_TitleScreen.png');
      titleCardMaterial.map = texture;
      titleCardMaterial.transparent = true;
      titleCardMaterial.needsUpdate = true;
    } catch (e) {
      console.error(e);
    } 
    this.scene.add(this.titleCard);

    this.pre.className = 'title_subtext';
    this.pre.style.fontFamily = "'Times New Roman', Times, serif, 'Lucida Console', 'Courier New', monospace";
    this.pre.style.textShadow = '0 0 1.5px #fff';
    this.pre.style.color = 'transparent';
    this.pre.style.fontSize = '1.5rem';
    this.pre.style.fontWeight = '900';
    this.pre.textContent =
      "                             Welcome to tormey.xyz" +
      "\n\n             A portfolio in the style of Armored Core™,\ntrademark of Sony Computer Entertainment America Inc." +
      "\n                             © 1997 From Software";
    const titleScreenSubtext = new CSS2DObject(this.pre);
    this.scene.add(titleScreenSubtext);

    const loader = new FontLoader();
    loader.load('')
    const buttonText = 'Enter';

    const titleEnterButtonGeometry = new THREE.PlaneGeometry(7, 3);
    const titleEnterButtonMaterial = new THREE.MeshBasicMaterial();
    this.titleEnterButton = new THREE.Mesh(titleEnterButtonGeometry, titleEnterButtonMaterial);
  }


  private createSceneMenuObjects() {
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
/*    this.scene.add(this.menuOptionCircle);*/

    const cube1 = new THREE.BoxGeometry(1, 1, 1);
    const cube2 = new THREE.BoxGeometry(1, 1, 1);
    const cube3 = new THREE.BoxGeometry(1, 1, 1);

    const profileMaterial = new THREE.MeshBasicMaterial({ color: 0x800080 });
    this.menuOptionMesh_profile = new THREE.Mesh(cube1, profileMaterial);
    this.flow_profileOption = new Flow(this.menuOptionMesh_profile);
    this.flow_profileOption.updateCurve(0, this.curve);
    this.flow_profileOption.uniforms.flow.value = false;
    this.listOfMenuObjects.push(this.flow_profileOption);
    this.scene.add(this.flow_profileOption.object3D);


    const servicesMaterial = new THREE.MeshBasicMaterial({ color: 0xC0C0C0 });
    this.menuOptionMesh_services = new THREE.Mesh(cube2, servicesMaterial);
    this.flow_servicesOption = new Flow(this.menuOptionMesh_services);
    this.flow_servicesOption.updateCurve(0, this.curve);
    this.flow_servicesOption.uniforms.flow.value = false;
    this.flow_servicesOption.uniforms.pathOffset.value = 0.25;
    this.listOfMenuObjects.push(this.flow_servicesOption);
    this.scene.add(this.flow_servicesOption.object3D);


    const systemMaterial = new THREE.MeshBasicMaterial({ color: 0xBB0000 });
    this.menuOptionMesh_system = new THREE.Mesh(cube3, systemMaterial);
    this.flow_systemOption = new Flow(this.menuOptionMesh_system);
    this.flow_systemOption.updateCurve(0, this.curve);
    this.flow_systemOption.uniforms.flow.value = false;
    this.flow_systemOption.uniforms.pathOffset.value = 0.75;
    this.listOfMenuObjects.push(this.flow_systemOption);
    this.scene.add(this.flow_systemOption.object3D);


    const arrowMaterial = new THREE.MeshNormalMaterial();
    const arrowGeometry = new THREE.BufferGeometry();
    const arrowPoints = [
      new THREE.Vector3(-0.25, 0.25, 0),
      new THREE.Vector3(-0.25, -0.25, 0),
      new THREE.Vector3(0.25, -0.25, 0)
    ];
    arrowGeometry.setFromPoints(arrowPoints);
    arrowGeometry.computeVertexNormals();
    this.rightMenuArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.rightMenuArrow.rotateX(-30);
    this.rightMenuArrow.position.setX(2);
    this.leftMenuArrow = this.rightMenuArrow.clone();
    this.leftMenuArrow.position.setX(-1.75);
    this.scene.add(this.rightMenuArrow, this.leftMenuArrow);
  }


  private startRenderingLoop() {
    this.renderer = new THREE.WebGL1Renderer({ canvas: this.canvas });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.renderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.initWidth = window.innerWidth;
    this.initHeight = window.innerHeight * 2 / 3;
    this.planeAspectRatio = this.initWidth / this.initHeight;


    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;

    if (window.innerWidth < 800 || (window.innerWidth < 800 || window.innerHeight < 500)) {
      this.titleCard.geometry = new THREE.PlaneGeometry(12, 18);
      this.titleSubtextRenderer.domElement.style.scale = '0.75';
      this.titleSubtextRenderer.domElement.style.top = '20vh';
      this.pre.style.textShadow = '0 0 1px #fff';
      this.pre.style.fontSize = '1rem';
    } 

    let component: WelcomeCardComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.delta = component.clock.getDelta();
      component.hoverMenuItem();
      component.titleSubtextRenderer.render(component.scene, component.camera);
      component.renderer.render(component.scene, component.camera);
      component.titleSubtextRenderer.render(component.scene, component.camera);
      component.animate();
    }());
  }


  private animate() {
    if (this.rotateMenuLeft && Math.round((this.listOfMenuObjects[0].uniforms.pathOffset.value + Number.EPSILON) * 100) / 100 !== -0.25) {
      this.listOfMenuObjects[0].moveAlongCurve(-0.01);
      this.listOfMenuObjects[1].moveAlongCurve(-0.01);
      this.listOfMenuObjects[2].moveAlongCurve(-0.02);
    } else if (this.rotateMenuRight && Math.round((this.listOfMenuObjects[0].uniforms.pathOffset.value + Number.EPSILON) * 100) / 100 !== 0.25) {
      this.listOfMenuObjects[0].moveAlongCurve(0.01);
      this.listOfMenuObjects[1].moveAlongCurve(0.02);
      this.listOfMenuObjects[2].moveAlongCurve(0.01);
    } else {
      if (this.rotateMenuLeft) {
        this.rotateMenuLeft = false;
        let temp = this.listOfMenuObjects[0];
        for (let i = 0; i <= this.listOfMenuObjects.length - 1; i++) {
          if (i == this.listOfMenuObjects.length - 1)
            this.listOfMenuObjects[i] = temp;
          else
            this.listOfMenuObjects[i] = this.listOfMenuObjects[i + 1];
          this.listOfMenuObjects[i].uniforms.pathOffset.value = this.menuOptionsLocation[i];
        }
      } else if (this.rotateMenuRight) {
        this.rotateMenuRight = false;
        let temp = this.listOfMenuObjects[2];
        for (let i = this.listOfMenuObjects.length - 1; i >= 0; i--) {
          if (i == 0)
            this.listOfMenuObjects[i] = temp;
          else
            this.listOfMenuObjects[i] = this.listOfMenuObjects[i - 1];
          this.listOfMenuObjects[i].uniforms.pathOffset.value = this.menuOptionsLocation[i];
        }
      }
    }
  }

  // Hover
  private hoverMenuItem() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0 ) {
      this.INTERSECTED = intersects[0].object;
     
    }
  }


  // Resize Listener
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (window.innerWidth < 800 || (window.innerWidth < 800 || window.innerHeight < 500)) {
      this.titleCard.geometry = new THREE.PlaneGeometry(12, 18);
      this.titleSubtextRenderer.domElement.style.scale = '0.75';
      this.titleSubtextRenderer.domElement.style.top = '20vh';
      this.pre.style.fontSize = '1rem';
      this.pre.style.textShadow = '0 0 1px #fff';
      this.titleSubtextRenderer.domElement.style.top = '20vh';

    } else /*if (window.innerHeight < 800) {
      this.titleCard.geometry = new THREE.PlaneGeometry(12, 18);
      this.titleSubtextRenderer.domElement.style.scale = '0.75';*//*
      this.titleSubtextRenderer.domElement.style.top = '20vh';*//*
      this.pre.style.fontSize = '1.5rem';
      this.titleSubtextRenderer.domElement.style.top = '20vh';
    } else */{
      this.titleCard.geometry = new THREE.PlaneGeometry(25, 30);
      this.titleSubtextRenderer.domElement.style.scale = '1';
      this.titleSubtextRenderer.domElement.style.top = '32vh';
      this.pre.style.fontSize = '1.5rem';
    }

    this.titleSubtextRenderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.renderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.camera.aspect = window.innerWidth / (window.innerHeight * 2 / 3);
    this.camera.updateProjectionMatrix();

/*    if (this.camera.aspect > this.initWidth / this.initHeight) {
      // window too large
      this.camera.fov = this.fov;
    } else {
      // window too narrow
      const cameraHeight = Math.tan(MathUtils.degToRad(this.fov / 2));
      const ratio = this.camera.aspect / this.planeAspectRatio;
      const newCameraHeight = cameraHeight / ratio;
      this.camera.fov = (MathUtils.radToDeg(Math.atan(newCameraHeight)) * 2);
    }*/

  }

  // Locate Mouse Listener
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

  // Click Event Listener
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      this.INTERSECTED = intersects[0].object;
      if (this.INTERSECTED == this.leftMenuArrow) {
        this.rotateMenuLeft = true;
      } else if (this.INTERSECTED == this.rightMenuArrow) {
        this.rotateMenuRight = true;
      }
    }
  }

  private getAspectRatio() {
    return window.innerWidth / (window.innerHeight * 2 / 3);
  }
}
