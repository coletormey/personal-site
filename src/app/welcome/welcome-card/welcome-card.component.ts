import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, HostListener } from "@angular/core";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Flow } from "three/examples/jsm/modifiers/CurveModifier.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { MathUtils } from 'three';

import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';

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
  @Input() public fieldOfView: number = 3;
  @Input('nearClipping') public nearClippingPane: number = 1.5;
  @Input('farClipping') public farClippingPane: number = 5000;
  @Input() public fov = 8;
  @Input() public planeAspectRatio: number;
  @Input() public initWidth: number;
  @Input() public initHeight: number;

  // Helper Properties (Private Properties)
  private scene!: THREE.Scene;
  private scene_title!: THREE.Scene;
  private scene_menu!: THREE.Scene;
  private scene_menuOption!: THREE.Scene;
  private sceneBackgroundTexture: string = "/assets/AC_menuBackground.png";
  private clock = new THREE.Clock();
  private speed = 1; //units per second
  private delta = 0;
  private currentScene = 0;
  private initFOV!: number;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private mouse!: THREE.Vector2;
  private controls!: OrbitControls;
  private curve!: THREE.CatmullRomCurve3;
  private loader!: THREE.TextureLoader;
  private raycaster!: THREE.Raycaster;
  private light!: THREE.DirectionalLight;
  private listener!: THREE.AudioListener;
  private sound!: THREE.Audio;
  private audioLoader!: THREE.AudioLoader;
  private soundIcon!: THREE.Mesh;
  private isMusicPlaying: boolean = false;
  private hoverSoundIcon: boolean = false;
  private deltaTime: number;

  // Title Screen Objects
  private titleSubtextRenderer!: CSS2DRenderer;
  private titleEnterTextRenderer!: CSS2DRenderer;
  private titleCard!: THREE.Mesh;
  private titleEnterButton!: THREE.Mesh;
  private previousFrameBlinked = false;

  // Menu Screen Objects
  private menuOptionMesh_profile!: THREE.Mesh;
  private menuOptionMesh_contact!: THREE.Mesh;
  private menuOptionMesh_system!: THREE.Mesh;
  private listOfOptionMeshes: THREE.Mesh[] = [this.menuOptionMesh_profile, this.menuOptionMesh_contact, this.menuOptionMesh_system];
  private flow_profileOption!: Flow;
  private flow_servicesOption!: Flow;
  private flow_systemOption!: Flow;
  private leftMenuArrow!: THREE.Mesh;
  private rightMenuArrow!: THREE.Mesh;
  private menuOptionCircle!: THREE.Line;
  private analyzer!: THREE.AudioAnalyser;
  private titleScreenSubtext!: CSS2DObject
  private rotateMenuRight: boolean = false;
  private rotateMenuLeft: boolean = false;
  private INTERSECTED: any;
  private listOfMenuObjects: Flow[] = [];
  private menuOptionTexts: string[] = ["Profile", "System", "Contact"];
  private currentMenuText: number;
  private currentMenuMesh: THREE.Mesh;
  private menuOptionsLocation = [0, 0.25, 0.75];
  private menuOptionsFlowSpeedPerPosition_Left = [-0.01, -0.01, -0.02];
  private menuOptionsFlowSpeedPerPosition_Right = [0.01, 0.02, 0.01];

  private gridSize = 1500;
  private gridDivisions = 150;
  private grid: THREE.GridHelper = new THREE.GridHelper(this.gridSize, this.gridDivisions, new THREE.Color(0x048000), new THREE.Color(0x048000));

  // Selected Option Scene Objects
  private returnButton!: THREE.Mesh;
  private hoverReturnIcon: boolean = false;
  private animateProfileOption: boolean = false;
  private animateSystemOption: boolean = false;
  private animateContactOption: boolean = false;
  private startingVirtualHeight: number = 100;
  private startingVirtualHeight_Shadow: number = 102;


  private pre = document.createElement('pre');

  ngOnInit() {
    // MAIN MENU SCENE
    let sceneTitleScreen = new THREE.Scene();
    this.scene = sceneTitleScreen;
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      this.getAspectRatio(),
      this.nearClippingPane,
      this.farClippingPane
    );
    this.scene.add(this.camera);
    this.initFOV = this.camera.fov;
    this.camera.position.z = this.cameraZ;
    this.camera.position.y = this.cameraY;

    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);
    this.sound = new THREE.Audio(this.listener);
    this.audioLoader = new THREE.AudioLoader();
    let component: WelcomeCardComponent = this;
    this.audioLoader.load("/assets/Sanvein_track05.mp3", function (buffer) {
      component.sound.setBuffer(buffer);
      component.sound.setLoop(true);
      component.sound.setVolume(0.05);
    });
    this.sound.stop();

    this.mouse = new THREE.Vector2();
    this.loader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();
    this.titleSubtextRenderer = new CSS2DRenderer();

    this.createTitleScreenObjects();

    try {
      let soundButton = document.getElementById("sound");
      soundButton!.addEventListener("mouseover", (e: Event) => this.hoverSoundIcon = true);
      soundButton!.addEventListener("mouseout", (e: Event) => this.hoverSoundIcon = false);
      soundButton!.addEventListener("click", (e: Event) => this.play());

      let returnButton = document.getElementById("return");
      returnButton!.addEventListener("mouseover", (e: Event) => this.hoverReturnIcon = true);
      returnButton!.addEventListener("mouseout", (e: Event) => this.hoverReturnIcon = false);
      returnButton!.addEventListener("click", (e: Event) => this.reloadMenu());
      returnButton!.style.visibility = "hidden";
    } catch (e) {
      console.error(e);
    }
  }


  ngAfterViewInit() {
    this.startRenderingLoop();
  }


  private createTitleScreenObjects() {
    const titleCardGeometry = new THREE.PlaneGeometry(20, 20);
    const titleCardMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      side: THREE.DoubleSide
    });
    this.titleCard = new THREE.Mesh(titleCardGeometry, titleCardMaterial);
    let texture;
    try {
      if (window.innerWidth < 900) { 
        texture = this.loader.load('./assets/tormey-xyz_TitleScreen_Mobile.png');

      } else
        texture = this.loader.load('./assets/tormey-xyz_TitleScreen.png');
      titleCardMaterial.map = texture;
      titleCardMaterial.transparent = true;
      titleCardMaterial.needsUpdate = true;
    } catch (e) {
      console.error(e);
    }
    this.titleCard.position.setY(6);
    this.scene.add(this.titleCard);

    this.titleSubtextRenderer.setSize(window.innerWidth, window.innerHeight / 2);
    this.titleSubtextRenderer.domElement.style.position = 'absolute';
    this.titleSubtextRenderer.domElement.style.top = '36vh';
    this.titleSubtextRenderer.domElement.style.left = '0vw';
    this.titleSubtextRenderer.domElement.style.scale = '0.75';
    this.titleSubtextRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(this.titleSubtextRenderer.domElement);

    this.pre.className = 'title_subtext';
    this.pre.style.fontFamily = "'Times New Roman', Times, serif, 'Lucida Console', 'Courier New', monospace";
    this.pre.style.textShadow = '0 0 1.5px #fff';
    this.pre.style.color = 'transparent';
    this.pre.style.fontSize = '1rem';
    this.pre.style.fontWeight = '900';
    this.pre.textContent =
      "\n             A portfolio in the style of Armored Core™,\ntrademark of Sony Computer Entertainment America Inc." +
      "\n                             © 1997 From Software";
    this.titleScreenSubtext = new CSS2DObject(this.pre);
    this.scene.add(this.titleScreenSubtext);

    const enterButtonMaterial = new THREE.MeshBasicMaterial();
    const enterButtonGeometry = new THREE.PlaneGeometry(8, 4);
    this.titleEnterButton = new THREE.Mesh(enterButtonGeometry, enterButtonMaterial);
    const buttonTexture = this.loader.load('./assets/EnterText.png');
    enterButtonMaterial.map = buttonTexture;
    enterButtonMaterial.transparent = true;
    enterButtonMaterial.needsUpdate = true;
    this.titleEnterButton.position.setY(-11);
    this.scene.add(this.titleEnterButton);

    let soundButton = document.getElementById("sound");
    soundButton?.setAttribute("width", "55px");

    this.scene_title = this.scene;
  }



  private createSceneMenuObjects() {
    this.scene.remove(this.titleScreenSubtext);
    this.light = new THREE.DirectionalLight(0xee7f32, 10);
    this.light.position.set(0, 0, 10);
    this.scene_menu.add(this.light);
    this.camera.position.z = 150;
    this.camera.position.x = 0;
    this.camera.position.y = 10;
    this.controls.update();

    this.createMenuCurve(6);


    const cube2 = new THREE.BoxGeometry(1, 1, 1);
    const cube3 = new THREE.BoxGeometry(1, 1, 1);





    const profileGeometry = new THREE.PlaneGeometry(2, 2);
    const profileMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    let texture;
    try {
      if (window.innerWidth < 900) {
        texture = this.loader.load('./assets/laptop.png');

      } else
        texture = this.loader.load('./assets/laptop.png');
      profileMaterial.map = texture;
      profileMaterial.transparent = true;
      profileMaterial.needsUpdate = true;
    } catch (e) {
      console.error(e);
    }
    this.menuOptionMesh_profile = new THREE.Mesh(profileGeometry, profileMaterial);
  
    this.flow_profileOption = new Flow(this.menuOptionMesh_profile);
    this.flow_profileOption.updateCurve(0, this.curve);
    this.flow_profileOption.uniforms.flow.value = false;
    this.listOfMenuObjects.push(this.flow_profileOption);
    this.scene_menu.add(this.flow_profileOption.object3D);



    const servicesGeometry = new THREE.PlaneGeometry(2, 2);
    const servicesMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    try {
      if (window.innerWidth < 900) {
        texture = this.loader.load('./assets/contact.png');

      } else
        texture = this.loader.load('./assets/contact.png');
      servicesMaterial.map = texture;
      servicesMaterial.transparent = true;
      servicesMaterial.needsUpdate = true;
    } catch (e) {
      console.error(e);
    }
    this.menuOptionMesh_contact = new THREE.Mesh(servicesGeometry, servicesMaterial);
    this.flow_servicesOption = new Flow(this.menuOptionMesh_contact);
    this.flow_servicesOption.updateCurve(0, this.curve);
    this.flow_servicesOption.uniforms.flow.value = false;
    this.flow_servicesOption.uniforms.pathOffset.value = 0.25;
    this.listOfMenuObjects.push(this.flow_servicesOption);
    this.scene_menu.add(this.flow_servicesOption.object3D);


    const systemGeometry = new THREE.PlaneGeometry(2, 2);
    const systemMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    try {
      if (window.innerWidth < 900) {
        texture = this.loader.load('./assets/memoryCard.png');

      } else
        texture = this.loader.load('./assets/memoryCard.png');
      systemMaterial.map = texture;
      systemMaterial.transparent = true;
      systemMaterial.needsUpdate = true;
    } catch (e) {
      console.error(e);
    }
    this.menuOptionMesh_system = new THREE.Mesh(systemGeometry, systemMaterial);
    this.flow_systemOption = new Flow(this.menuOptionMesh_system);
    this.flow_systemOption.updateCurve(0, this.curve);
    this.flow_systemOption.uniforms.flow.value = false;
    this.flow_systemOption.uniforms.pathOffset.value = 0.75;
    this.listOfMenuObjects.push(this.flow_systemOption);
    this.scene_menu.add(this.flow_systemOption.object3D);



    const triangleRightShape = new THREE.Shape()
      .moveTo(0, 0.5)
      .lineTo(0.75, 0)
      .lineTo(0, -0.5);

    const triangleLeftShape = new THREE.Shape()
      .moveTo(0, 0.5)
      .lineTo(-0.75, 0)
      .lineTo(0, -0.5);

    const arrowRightGeometry = new THREE.ShapeGeometry(triangleRightShape);
    const arrowLeftGeometry = new THREE.ShapeGeometry(triangleLeftShape);
    const arrowMaterial = new THREE.MeshPhongMaterial()
    arrowMaterial.color.setHex(0x000000);

    this.rightMenuArrow = new THREE.Mesh(arrowRightGeometry, arrowMaterial);
    this.rightMenuArrow.position.set(1.5, -1.5, 8);

    this.leftMenuArrow = new THREE.Mesh(arrowLeftGeometry, arrowMaterial);
    this.leftMenuArrow.position.set(-1.5, -1.5, 8);
    this.scene_menu.add(this.rightMenuArrow, this.leftMenuArrow);


    this.titleSubtextRenderer.setSize(window.innerWidth, window.innerHeight / 2);
    this.titleSubtextRenderer.domElement.style.position = 'absolute';
    this.titleSubtextRenderer.domElement.style.top = '20vh';
    this.titleSubtextRenderer.domElement.style.left = '0vw';
    this.titleSubtextRenderer.domElement.style.scale = '1';
    this.titleSubtextRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(this.titleSubtextRenderer.domElement);

    this.pre.className = 'title_subtext';
    this.pre.style.fontFamily = "'Times New Roman', Times, serif, 'Lucida Console', 'Courier New', monospace";
    this.pre.style.textShadow = '0 0 0px #fff';
    this.pre.style.color = 'transparent';
    this.pre.style.fontSize = '6rem';
    this.pre.style.fontWeight = '900';
    this.pre.textContent = this.menuOptionTexts[0];
    this.currentMenuText = 0;
    this.currentMenuMesh = this.menuOptionMesh_profile;
    this.scene_menu.add(this.titleScreenSubtext);

    this.grid.position.y = -5;
    this.grid.rotation.y = 0.01;
    this.scene_menu.add(this.grid);

    this.currentMenuMesh.position.set(0, -1.5, 6);
    this.currentMenuMesh.rotation.x = 3;
    this.scene_menu.add(this.currentMenuMesh);

    this.scene = this.scene_menu;
  }
  private createMenuCurve(menuCurveDiameter:number) {
    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -1.5, menuCurveDiameter),
      new THREE.Vector3(menuCurveDiameter, 0, 2),
      new THREE.Vector3(0, 1.5, -menuCurveDiameter),
      new THREE.Vector3(-menuCurveDiameter, 0, 2),
    ]);
    this.curve.closed = true;

    const points = this.curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this.menuOptionCircle = new THREE.Line(geometry, material);
    return this.menuOptionCircle;
  }


  private startRenderingLoop() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.width = "100%";


    this.initWidth = window.innerWidth;
    this.initHeight = window.innerHeight;
    this.planeAspectRatio = 16/9;


    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;

    if (window.innerWidth < 900 ) {
      this.titleCard.geometry = new THREE.PlaneGeometry(12, 12);
      this.titleSubtextRenderer.domElement.style.scale = '0.90';
      this.titleSubtextRenderer.domElement.style.top = '25vh';
      this.pre.style.textShadow = '0 0 1px #fff';
      this.pre.style.fontSize = '0.85rem';
      this.titleEnterButton.scale.setLength(0.70);
      this.titleEnterButton.position.y = -6

      let soundButton = document.getElementById("sound");
      let returnButton = document.getElementById("return");
      soundButton?.setAttribute("width", "45px");
      returnButton!.setAttribute("width", "96px");
    } else {
      this.titleCard.geometry = new THREE.PlaneGeometry(25, 25);
      this.titleCard.position.setY(6);
      this.titleSubtextRenderer.domElement.style.scale = '1';
      this.titleSubtextRenderer.domElement.style.top = '38vh';
      this.pre.style.fontSize = '1.2rem';
      this.pre.style.textShadow = '0 0 1.5px #fff';
      this.titleEnterButton.scale.setLength(1);
      let returnButton = document.getElementById("return");
      returnButton!.setAttribute("width", "128px");
    }

    if (window.innerHeight < 500) {
      this.titleCard.geometry = new THREE.PlaneGeometry(18, 18);
      this.pre.style.fontSize = '0.55rem';
      this.titleSubtextRenderer.domElement.style.scale = '0.80';
      let soundButton = document.getElementById("sound");
      soundButton?.setAttribute("left", "30px");
      soundButton?.setAttribute("width", "35px");
      let returnButton = document.getElementById("return");
      returnButton!.setAttribute("width", "32px");
    }

    let component: WelcomeCardComponent = this;
    (function render() {
      // Taking the Math.floor(this.delta) counts seconds since page load
      component.deltaTime = component.clock.getDelta();
      component.delta += component.deltaTime;      
      component.renderer.render(component.scene, component.camera);
      component.titleSubtextRenderer.render(component.scene, component.camera);
      component.animate();
      requestAnimationFrame(render);
    }());

  }


  private animate() {
    /*console.log(Math.floor(this.delta));*/
    this.hoverMenuItem();
   
    if (this.currentScene < 2)
      this.animateMenuScreen();
    else if (this.currentScene == 2) {
      this.animateOptionScreen();
    } 
  }



  private animateMenuScreen() {
    if (Math.floor(this.delta) % 2 == 0)
      this.titleEnterButton.visible = true;
    else
      this.titleEnterButton.visible = false;

    if (this.camera.position.y >= -0.25 && this.camera.position.y <= 0.25) {
      this.camera.position.y -= this.deltaTime;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    } else if (this.camera.position.y >= 0.25 && this.camera.position.y <= 2) {
      this.camera.position.y -= this.deltaTime;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    } else if (this.camera.position.y >= 2) {
      this.camera.position.y -= this.deltaTime * 2;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }
/*    this.controls.autoRotate = true;*/
    if (this.rotateMenuLeft && Math.round((this.listOfMenuObjects[0].uniforms.pathOffset.value + Number.EPSILON) * 100) / 100 > -0.25) {
      this.listOfMenuObjects[0].moveAlongCurve(-this.deltaTime / 2);
      this.listOfMenuObjects[1].moveAlongCurve(-this.deltaTime / 2);
      this.listOfMenuObjects[2].moveAlongCurve(-this.deltaTime);
    } else if (this.rotateMenuRight && Math.round((this.listOfMenuObjects[0].uniforms.pathOffset.value + Number.EPSILON) * 100) / 100 < 0.25) {
      this.listOfMenuObjects[0].moveAlongCurve(this.deltaTime / 2);
      this.listOfMenuObjects[1].moveAlongCurve(this.deltaTime);
      this.listOfMenuObjects[2].moveAlongCurve(this.deltaTime / 2);
    } else {
      if (this.rotateMenuLeft) {

        if (this.currentMenuText == 0) {
          this.currentMenuText = 2;
          this.scene.remove(this.currentMenuMesh);
          this.currentMenuMesh = this.menuOptionMesh_contact;
          this.currentMenuMesh.position.set(0, -1.5, 6);
          this.currentMenuMesh.rotation.x = 3;
          this.scene.add(this.currentMenuMesh);
          this.pre.textContent = this.menuOptionTexts[this.currentMenuText];
        } else if (this.currentMenuText == 1) {
          this.scene.remove(this.currentMenuMesh);
          this.currentMenuMesh = this.menuOptionMesh_profile;
          this.currentMenuMesh.position.set(0, -1.5, 6);
          this.currentMenuMesh.rotation.x = 3;
          this.scene.add(this.currentMenuMesh);
          this.pre.textContent = this.menuOptionTexts[--this.currentMenuText];
        } else if (this.currentMenuText == 2) { 
          this.pre.textContent = this.menuOptionTexts[--this.currentMenuText];
          this.scene.remove(this.currentMenuMesh);
          this.currentMenuMesh = this.menuOptionMesh_system;
          this.currentMenuMesh.position.set(0, -1.5, 6);
          this.currentMenuMesh.rotation.x = 3;
          this.scene.add(this.currentMenuMesh);
        }

        let temp = this.listOfMenuObjects[0];
        for (let i = 0; i <= this.listOfMenuObjects.length - 1; i++) {
          if (i == this.listOfMenuObjects.length - 1)
            this.listOfMenuObjects[i] = temp;
          else
            this.listOfMenuObjects[i] = this.listOfMenuObjects[i + 1];
          this.listOfMenuObjects[i].uniforms.pathOffset.value = this.menuOptionsLocation[i];
        }
        this.rotateMenuLeft = false;
      } else if (this.rotateMenuRight) {
        if (this.currentMenuText == 2) {
          this.currentMenuText = 0;
          this.scene.remove(this.currentMenuMesh);
          this.currentMenuMesh = this.menuOptionMesh_profile
          this.currentMenuMesh.position.set(0, -1.5, 6);
          this.currentMenuMesh.rotation.x = 3;
          this.scene.add(this.currentMenuMesh);
          this.pre.textContent = this.menuOptionTexts[this.currentMenuText];
        } else if (this.currentMenuText == 1) {
          this.pre.textContent = this.menuOptionTexts[++this.currentMenuText];
          this.scene.remove(this.currentMenuMesh);
          this.currentMenuMesh = this.menuOptionMesh_contact;
          this.currentMenuMesh.position.set(0, -1.5, 6);
          this.currentMenuMesh.rotation.x = 3;
          this.scene.add(this.currentMenuMesh);
        } else if (this.currentMenuText == 0) { 
          this.pre.textContent = this.menuOptionTexts[++this.currentMenuText];
          this.scene.remove(this.currentMenuMesh);
          this.currentMenuMesh = this.menuOptionMesh_system;
          this.currentMenuMesh.position.set(0, -1.5, 6);
          this.currentMenuMesh.rotation.x = 3;
          this.scene.add(this.currentMenuMesh);
        }

        let temp = this.listOfMenuObjects[2];
        for (let i = this.listOfMenuObjects.length - 1; i >= 0; i--) {
          if (i == 0)
            this.listOfMenuObjects[i] = temp;
          else
            this.listOfMenuObjects[i] = this.listOfMenuObjects[i - 1];
          this.listOfMenuObjects[i].uniforms.pathOffset.value = this.menuOptionsLocation[i];
        }
        this.rotateMenuRight = false;
      }
    }
    this.grid.rotation.y += 0.0002;
  }


  private animateOptionScreen() {
/*    this.swapReturnButtonMesh();*/
    let x, y, z;
    x = this.currentMenuMesh.position.x;
    y = this.currentMenuMesh.position.y;
    z = this.currentMenuMesh.position.z;
/*    if (window.innerWidth < 900) {
      if (this.currentMenuMesh.position.x > this.canvas.clientLeft - 3) {
        this.currentMenuMesh.position.set(x - 0.08, y + 0.15, z);
      } else {

      }
    } else {
      if (this.currentMenuMesh.position.x > this.canvas.clientLeft - 7) {
        this.currentMenuMesh.position.set(x - 0.15, y + 0.09, z);
      }
    }*/

    if (this.animateProfileOption) {
      let content = document.getElementById("option-profile");
      content!.style.top = this.startingVirtualHeight.toString() + "vh";
      let contentShadow = document.getElementById("option-shadow");
      contentShadow!.style.top = this.startingVirtualHeight_Shadow.toString() + "vh";
      if (content!.style.top != "20vh") {
        this.startingVirtualHeight -= 4;
        this.startingVirtualHeight_Shadow -= 4;
      } else {
        this.animateProfileOption = false;
        this.startingVirtualHeight = 100;
        this.startingVirtualHeight_Shadow = 102;
      }
    } else if (this.animateSystemOption) {
      let content = document.getElementById("option-system");
      content!.style.top = this.startingVirtualHeight.toString() + "vh";
      let contentShadow = document.getElementById("option-shadow");
      contentShadow!.style.top = this.startingVirtualHeight_Shadow.toString() + "vh";
      if (content!.style.top != "20vh") {
        this.startingVirtualHeight -= 4;
        this.startingVirtualHeight_Shadow -= 4;
      } else {
        this.animateSystemOption = false;
        this.startingVirtualHeight = 100
        this.startingVirtualHeight_Shadow = 102;
      }
    } else if (this.animateContactOption) {
      let content = document.getElementById("option-contact");
      content!.style.top = this.startingVirtualHeight.toString() + "vh";
      let contentShadow = document.getElementById("option-shadow");
      contentShadow!.style.top = this.startingVirtualHeight_Shadow.toString() + "vh";
      if (content!.style.top != "20vh") {
        this.startingVirtualHeight -= 4;
        this.startingVirtualHeight_Shadow -= 4;
      } else {
        this.animateContactOption = false;
        this.startingVirtualHeight = 100
        this.startingVirtualHeight_Shadow = 102;
      }
    }




    if (this.camera.position.y >= -0.25 && this.camera.position.y <= 0.25) {
      this.camera.position.y -= this.deltaTime;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    } else if (this.camera.position.y >= 0.25 && this.camera.position.y <= 2) {
      this.camera.position.y -= this.deltaTime;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    } else if (this.camera.position.y >= 2) {
      this.camera.position.y -= this.deltaTime * 2;
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }
    this.grid.rotation.y += 0.0002;
  }


  // Hover
  private hoverMenuItem() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0 && !this.hoverSoundIcon && !this.hoverReturnIcon) {
/*
      if (this.currentScene > 0) {
        if (intersects[0].object == this.listOfMenuObjects.)
          document.body.style.cursor = 'pointer';
      } */


/*      if (intersects[0].object ==) {
        document.body.style.cursor = 'pointer';
      }*/

      if (intersects[0].object == this.titleEnterButton || intersects[0].object == this.rightMenuArrow
        || intersects[0].object == this.leftMenuArrow || (intersects[0].object == this.currentMenuMesh && this.currentScene == 1)) {
        this.INTERSECTED = intersects[0].object;
        document.body.style.cursor = 'pointer';
/*        if (this.INTERSECTED == this.returnButton) {
          this.hoverReturnIcon = true;
        } else {
          this.hoverReturnIcon = false;
        }*/
      } else {
        document.body.style.cursor = 'default';
      }
      let returnButton = document.getElementById("return");
      returnButton!.setAttribute("src", "/assets/backButton_Unselected.png")
    } else {
      document.body.style.cursor = 'default';
      if (this.hoverSoundIcon)
        document.body.style.cursor = 'pointer';
      if (this.hoverReturnIcon) {
        document.body.style.cursor = 'pointer';
        let returnButton = document.getElementById("return");
        returnButton!.setAttribute("src", "/assets/backButton_selected.png")
      } else {
        let returnButton = document.getElementById("return");
        returnButton!.setAttribute("src", "/assets/backButton_Unselected.png")
      }
/*      else
        document.body.style.cursor = 'default';*/

    }

  }


  // Resize Listener
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (this.currentScene == 0)
      this.resizeTitleScreen();
    else {
      this.resizeMenuScreen();
      this.resizeMenuOptionScreen();
    }
  }

  private resizeMenuOptionScreen() {
    let soundButton = document.getElementById("sound");
    let returnButton = document.getElementById("return");
    if (window.innerWidth < 900) {
      soundButton?.setAttribute("width", "45px");
      returnButton!.setAttribute("width", "96px");
    } else {
      this.camera.fov = this.initFOV;
      soundButton?.setAttribute("width", "55px");
      returnButton!.setAttribute("width", "128px");

    }
    if (window.innerHeight < 500) {
      soundButton?.setAttribute("width", "25px");
      returnButton!.setAttribute("width", "64px");
/*      this.pre.style.fontSize = '2rem';*/
    } else {
/*      this.pre.style.fontSize = '6rem';*/
    }


    this.titleSubtextRenderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / (window.innerHeight);
    this.camera.fov = 4;
    this.camera.updateProjectionMatrix();
  }

  private resizeMenuScreen() {

/*      if (this.camera.aspect > this.planeAspectRatio) {
        // window too large
        const cameraHeight = Math.tan(MathUtils.degToRad(this.fov / 2));
        const ratio = this.camera.aspect / this.planeAspectRatio;
        const newCameraHeight = cameraHeight / ratio;
        this.camera.fov = MathUtils.radToDeg(Math.atan(newCameraHeight)) * 2;
        this.rightMenuArrow.scale.set(1, 1, 1);
        this.leftMenuArrow.scale.set(1, 1, 1);

*//*        this.camera.fov = this.initFOV;*//*
      } else {
        // window too narrow
        this.camera.fov = this.fov;

        this.pre.style.top = "-2vh";
        this.pre.style.fontSize = "2rem";
        this.rightMenuArrow.scale.set(2.5, 2.5, 2.5);
        this.leftMenuArrow.scale.set(2.5, 2.5, 2.5);
        
      }*/
    let soundButton = document.getElementById("sound");
    if (window.innerWidth < 900) {
      this.pre.style.textShadow = '0 0 1px #fff'; 
      this.pre.style.top = "-6.5vh";
      soundButton?.setAttribute("width", "45px");
    } else {
      this.camera.fov = this.initFOV;
      this.pre.style.top = "-4vh";
      this.pre.style.fontSize = '6rem';
      soundButton?.setAttribute("width", "55px");
    }
    if (window.innerHeight < 500) {
      soundButton?.setAttribute("width", "25px");
      this.pre.style.fontSize = '2rem';
    } else {
      this.pre.style.fontSize = '6rem';
    }


    this.titleSubtextRenderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / (window.innerHeight);
    this.camera.fov = 4;
    this.camera.updateProjectionMatrix();
  }

  private resizeTitleScreen() {
    let soundButton = document.getElementById("sound");
    if (window.innerWidth < 900) {
      this.titleCard.geometry = new THREE.PlaneGeometry(12, 12);
      this.titleSubtextRenderer.domElement.style.scale = '0.90';  
      this.titleSubtextRenderer.domElement.style.top = '17.5vh';
      this.pre.style.textShadow = '0 0 1px #fff';
      this.pre.style.fontSize = '0.85rem';
      this.titleEnterButton.scale.setLength(1);
      this.titleEnterButton.position.y = -6;
      soundButton?.setAttribute("width", "35px");
    } else  {
      this.titleCard.geometry = new THREE.PlaneGeometry(25, 25);
      this.titleSubtextRenderer.domElement.style.scale = '0.75';
      this.titleSubtextRenderer.domElement.style.top = '30vh';
      this.pre.style.fontSize = '1.6rem';
      this.pre.style.textShadow = '0 0 1.5px #fff';
      this.titleEnterButton.scale.setLength(1);
      this.titleEnterButton.position.y = -11;

      soundButton?.setAttribute("width", "55px");
      soundButton?.setAttribute("left", "85vw");
      soundButton?.setAttribute("top", "83vh");
    }
    if (window.innerHeight < 500) {
      soundButton?.setAttribute("width", "35px");
      this.titleSubtextRenderer.domElement.style.scale = '0.80';
      this.pre.style.textShadow = '0 0 1px #fff';
      this.pre.style.fontSize = '0.65rem';
      soundButton?.setAttribute("left", "20vw");
      soundButton?.setAttribute("top", "20vh");
      this.titleCard.geometry = new THREE.PlaneGeometry(18, 18);
    }

    this.titleSubtextRenderer.setSize(window.innerWidth, window.innerHeight * 2 / 3);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / (window.innerHeight * 2 / 3);
    this.camera.updateProjectionMatrix();


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
  click(event: MouseEvent) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let intersects = this.raycaster.intersectObjects(this.scene.children, true);
    if (intersects.length > 0) {
      this.INTERSECTED = intersects[0].object;
      if (this.INTERSECTED == this.leftMenuArrow && this.rotateMenuRight == false && this.rotateMenuLeft == false) {
        this.currentMenuMesh.visible = false;
        this.rotateMenuLeft = true;
      } else if (this.INTERSECTED == this.rightMenuArrow && this.rotateMenuRight == false && this.rotateMenuLeft == false) {
        this.currentMenuMesh.visible = false;
        this.rotateMenuRight = true;
      } else if (this.INTERSECTED == this.titleEnterButton) {
        //vvvvv   THIS can be used on a click event to load another scene
        this.scene_menu = new THREE.Scene();
        this.titleSubtextRenderer.domElement.remove();
        this.createSceneMenuObjects();
        this.resizeMenuScreen();
        this.currentScene += 1;
      } else if (this.INTERSECTED == this.titleScreenSubtext) {
        console.log('clicked');
        this.sound.play();
      } else if (this.INTERSECTED == this.currentMenuMesh && this.currentScene == 1) {
        this.currentScene += 1;
        this.createSelectedMenuOptionScene(this.currentMenuMesh);
      } /*else if (intersects[0].object == this.returnButton) {
        this.scene_menuOption = new THREE.Scene();
        this.hoverReturnIcon = true;
        this.scene = this.scene_menu;
        for (let i = 0; i < this.listOfMenuObjects.length; i++) {
          this.scene.add(this.listOfMenuObjects[i].object3D);
        }
        this.scene.add(this.titleScreenSubtext);
        this.currentMenuMesh.visible = false;
        this.scene.add(this.leftMenuArrow);
        this.scene.add(this.rightMenuArrow);
        this.scene.remove(this.returnButton);
        this.currentScene -= 1;
        this.currentMenuMesh.position.set(0, -1.5, 6);
        this.currentMenuMesh.rotation.x = 3;
      }*/
    }
  }

  private reloadMenu() {
    let returnButton = document.getElementById("return");
    returnButton!.style.visibility = "hidden";

    let contentProfile = document.getElementById("option-profile");
    contentProfile!.style.top = "100vh";
    this.animateProfileOption = false;
    let contentSystem = document.getElementById("option-system");
    contentSystem!.style.top = "100vh";
    this.animateSystemOption = false;
    let contentContact = document.getElementById("option-contact");
    contentContact!.style.top = "100vh";
    this.animateContactOption = false;
    let contentShadow = document.getElementById("option-shadow");
    contentShadow!.style.top = "102vh";

    this.startingVirtualHeight = 100;
    this.startingVirtualHeight_Shadow = 102;


    this.scene_menuOption = new THREE.Scene();
    this.hoverReturnIcon = true;
    this.scene = this.scene_menu;
    for (let i = 0; i < this.listOfMenuObjects.length; i++) {
      this.scene.add(this.listOfMenuObjects[i].object3D);
    }
    this.scene.add(this.titleScreenSubtext);
    this.currentMenuMesh.visible = false;
    this.scene.add(this.leftMenuArrow);
    this.scene.add(this.rightMenuArrow);
    this.scene.remove(this.returnButton);
    this.currentScene = 1;
    this.currentMenuMesh.position.set(0, -1.5, 6);
    this.currentMenuMesh.rotation.x = 3;  
  }


  private getAspectRatio() {
    return window.innerWidth / (window.innerHeight * 2 / 3);
  }

  private play() {
    if (this.isMusicPlaying) {
      this.sound.pause();
      this.isMusicPlaying = false;
      try {
        let soundButton = document.getElementById("sound");
        soundButton?.setAttribute("src", "/assets/muteIcon.png")
      } catch (e) {
        console.error(e);
      }
    } else {
      this.sound.play();
      this.isMusicPlaying = true;
      try {
        let soundButton = document.getElementById("sound");
        soundButton?.setAttribute("src", "/assets/soundPlayingIcon.png")
      } catch (e) {
        console.error(e);
      }
    }
  }



  private createSelectedMenuOptionScene(selectedOption: THREE.Mesh) {
    let returnButton = document.getElementById("return");
    returnButton!.style.visibility = "visible";
    for (let i = 0; i < this.listOfMenuObjects.length; i++) {
      this.scene.remove(this.listOfMenuObjects[i].object3D);
    }
    this.scene.remove(this.titleScreenSubtext);
    this.currentMenuMesh.visible = false;
    this.scene.remove(this.leftMenuArrow);
    this.scene.remove(this.rightMenuArrow);

    if (selectedOption == this.menuOptionMesh_profile) {
      this.animateProfileOption = true;
    } else if (selectedOption == this.menuOptionMesh_contact) {
      this.animateContactOption = true;
    } else if (selectedOption == this.menuOptionMesh_system) {
      this.animateSystemOption = true;
    }

    

    //create return button
/*    const returnButtonGeometry = new THREE.PlaneGeometry(1.25, 0.75)
    const returnButtonMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    let texture;
    try {
      if (window.innerWidth < 900) {
        texture = this.loader.load('./assets/backButton_Unselected.png');

      } else
        texture = this.loader.load('./assets/backButton_Unselected.png');
      returnButtonMaterial.map = texture;
      returnButtonMaterial.transparent = true;
      returnButtonMaterial.needsUpdate = true;
    } catch (e) {
      console.error(e);
    }
    this.returnButton = new THREE.Mesh(returnButtonGeometry, returnButtonMaterial);

    this.returnButton.position.setX(this.canvas.clientLeft - 5);
    this.scene.add(this.returnButton);*/


    this.scene_menuOption = this.scene;
  }

  private swapReturnButtonMesh() {
    this.scene.remove(this.returnButton);
    if (this.hoverReturnIcon) {
      const returnButtonGeometry = new THREE.PlaneGeometry(1.25, 0.75)
      const returnButtonMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      let texture;
      try {
        if (window.innerWidth < 900) {
          texture = this.loader.load('./assets/backButton_selected.png');

        } else
          texture = this.loader.load('./assets/backButton_selected.png');
        returnButtonMaterial.map = texture;
        returnButtonMaterial.transparent = true;
        returnButtonMaterial.needsUpdate = true;
      } catch (e) {
        console.error(e);
      }
      this.returnButton = new THREE.Mesh(returnButtonGeometry, returnButtonMaterial);
      this.hoverReturnIcon = false;
/*      this.scene.add(this.returnButton);*/
/*      this.returnButton.position.setX(5);*/
    } else {
      const returnButtonGeometry = new THREE.PlaneGeometry(1.25, 0.75)
      const returnButtonMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      let texture;
      try {
        if (window.innerWidth < 900) {
          texture = this.loader.load('./assets/backButton_Unselected.png');

        } else
          texture = this.loader.load('./assets/backButton_Unselected.png');
        returnButtonMaterial.map = texture;
        returnButtonMaterial.transparent = true;
        returnButtonMaterial.needsUpdate = true;
      } catch (e) {
        console.error(e);
      }
      this.returnButton = new THREE.Mesh(returnButtonGeometry, returnButtonMaterial);
/*      this.scene.add(this.returnButton);*/
/*      this.returnButton.position.setX(5);*/
    }
 /*   this.returnButton.position.setX(this.canvas.clientLeft - (5));*/
    this.scene.add(this.returnButton);
  }
}


/*=========================================================

TODO: upon menu option click, drop current scene (except for grid on bottom),
      spawn same menu option img in same spot, animate to new spot with
      trailing effects

      div should be displayed as overlaying background scene.
      div should grow, shrink, and display text intelligently based on screen size



==========================================================*/

