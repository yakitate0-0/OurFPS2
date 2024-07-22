import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let camera, scene, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = true;
let isJumping = false;
let isCrouching = false; // しゃがみ状態のフラグ
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let spotLight;
let loadedModels = 0;
let gunModel;
let isShooting = false;
let ammo = 10; //球の数
let isReloading = false;
let lastShotTime = 0;
let nowEnemyPositions = {};
let bearModel;
let enemySpotLight; // 敵のスポットライト
let enemySpotLightHed;
let bullets = []; // 弾丸を格納する配列
let collisionBoxes = []; // 衝突判定の対象となるオブジェクトのバウンディングボックス配列
let playerHp = 110; // 初期HP
let pitchObject = new THREE.Object3D();
let yawObject = new THREE.Object3D();
let playerName = window.myname;
let enemyName = window.enemyName;
let shaking = 1; //横の球ブレ
let damegepala = 10; //球のダメージ数
let nomalLight = 0; //太陽の強さ
let normalSpeed = 60.0;  //走る速さ
let reloadTime = 2500; // リロード時間（ミリ秒）
let heal = false;
let jumpSpeed = 9.0;
let ant = 0;
let ant1 = 0;

const bulletSpeed = 100;//　弾丸スピード
const socket = io();
const fireRate = 100; // 連射の間隔（ミリ秒）
const totalModels = 5; // 読み込むモデルの総数
const gravity = 30.0;
const clock = new THREE.Clock();
const crouchSpeed = 20.0; // しゃがみ時の速度
const normalHeight = 1.5; // 通常時の高さ
const crouchHeight = 1.1; // しゃがみ時の高さ
const lightSize = 6;
const FLOOR_SIZE_x = 26;
const FLOOR_SIZE_z = 20;
const shoot_sound = new Audio("/assets/sounds/shoot.mp3");
const shoot1_sound = new Audio("/assets/sounds/shoot.mp3");
const reload_sound = new Audio("/assets/sounds/reload.mp3");
const ready_sound = new Audio("/assets/sounds/ready.mp3");
const set_sound = new Audio("/assets/sounds/set.mp3");
const params = new URLSearchParams(window.location.search);
const char = params.get('char');
const url = new URL(window.location);
url.searchParams.delete('char');
window.history.replaceState({}, document.title, url);

console.warn(char);

if (char == 0) {
    normalSpeed = 70;
    jumpSpeed = 10.0;
    reloadTime = 2000;
    nomalLight = 0.15;
    console.log("you are nomal.");
} else if (char == 1) {
    normalSpeed = 90;
} else if (char == 2) {
    ammo = 30;
} else if (char == 3) {
    ammo = 1;
    damegepala = 90;
    reloadTime = 5000;
} else if (char == 4) {
    jumpSpeed = 15.0;
} else if (char == 5) {
    heal = true;
} else if (char == 6) {
    nomalLight = 2;
    socket.emit('breaker');
} else if (char == 7) {
    ammo = 3;
    damegepala = 20;
    reloadTime = 4000;
    ant = 1;
} else {
    // Do nothing or handle default case
}

let wallBoxes = []; // 壁のバウンディングボックスを格納する配列
const guntimes = ammo;

// 初期化関数
export function init(receivedEnemyName, receivedPlayername) {

    enemyName = receivedEnemyName;
    playerName = receivedPlayername;
    console.log(playerName);
    console.log('Initializing game with enemyName:', enemyName);

    if (document.body) {
        document.body.style.cursor = 'none';
    }


    // ロード画面の表示
    showLoadingScreen();
    document.getElementById('aiming').style.display = 'none';

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // スポットライトの初期化
    spotLight = new THREE.SpotLight(0xffffff, 3.5, 100, Math.PI / lightSize, 0.1, 1);
    spotLight.position.set(0, 0, 0);
    spotLight.target.position.set(0, 0, -1);
    spotLight.visible = false; // 初期状態はオフ

    camera.add(spotLight);
    camera.add(spotLight.target);

    pitchObject.add(camera);
    yawObject.add(pitchObject);
    scene.add(yawObject);

    yawObject.position.y = normalHeight;

    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#FPSCanvas'),
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute'; // 追加: canvasの位置を絶対位置に設定
    renderer.domElement.style.top = '0'; // 追加: canvasのトップ位置を0に設定

    const ambientLight = new THREE.AmbientLight(0xffffff, nomalLight);
    scene.add(ambientLight);

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    loader.setDRACOLoader(dracoLoader);

    function onProgress(xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = Math.round((xhr.loaded / xhr.total) * 100);
            // document.getElementById('loading-screen').style.display = "flex";
            document.getElementById('loading-text').innerText = `Loading: ${percentComplete}%`;
        }
    }

    function modelLoaded() {
        loadedModels++;
        if (loadedModels === totalModels) {
            hideLoadingScreen();
            console.log("load completed.");
            document.getElementById('aiming').style.display = 'block';
            document.getElementById('ammo-counter').style.display = 'block';
            updateAmmoCount();
            animate();
        }
    }

    loader.load(
        'assets/models/piller.glb',
        function (gltf) {
            const wall1 = gltf.scene.clone();
            wall1.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall1);
            wall1.updateMatrixWorld(); // 位置を更新
            wall1.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });

            const wall2 = gltf.scene.clone();
            wall2.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall2);
            wall2.updateMatrixWorld(); // 位置を更新
            wall2.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });

            const wall3 = gltf.scene.clone();
            wall3.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall3);
            wall3.updateMatrixWorld(); // 位置を更新
            wall3.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });

            const wall4 = gltf.scene.clone();
            wall4.position.set(0, 0, 0); // 壁2の位置を設定
            scene.add(wall4);
            wall4.updateMatrixWorld(); // 位置を更新
            wall4.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/main.glb',
        function (gltf) {
            const wall1 = gltf.scene.clone();
            wall1.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall1);
            wall1.updateMatrixWorld(); // 位置を更新
            wall1.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });

            const wall2 = gltf.scene.clone();
            wall2.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall2);
            wall2.updateMatrixWorld(); // 位置を更新
            wall2.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/block.glb',
        function (gltf) {
            const wall1 = gltf.scene.clone();
            wall1.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall1);
            wall1.updateMatrixWorld(); // 位置を更新
            wall1.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });

            const wall2 = gltf.scene.clone();
            wall2.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall2);
            wall2.updateMatrixWorld(); // 位置を更新
            wall2.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });


            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/fut.glb',
        function (gltf) {
            const wall1 = gltf.scene.clone();
            wall1.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall1);
            wall1.updateMatrixWorld(); // 位置を更新
            wall1.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });

            const wall2 = gltf.scene.clone();
            wall2.position.set(0, 0, 0); // 壁1の位置を設定
            scene.add(wall2);
            wall2.updateMatrixWorld(); // 位置を更新
            wall2.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

                    // バウンディングボックスの可視化用
                    const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/floor.glb',
        function (gltf) {
            gltf.scene.position.set(0, 0, 0); // floorの位置を設定
            scene.add(gltf.scene);
            // ロード完了後にロード画面を非表示にする
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/bear_nomal.glb',
        function (gltf) {
            bearModel = gltf.scene;
            bearModel.scale.set(0.5, 0.5, 0.5);
            scene.add(bearModel);

            // 敵のスポットライトを初期化
            enemySpotLight = new THREE.SpotLight(0xffffff, 3.5, 100, Math.PI / lightSize, 0.1, 1);
            enemySpotLight.visible = false; // 初期状態はオフ
            scene.add(enemySpotLight);
            scene.add(enemySpotLight.target);

            enemySpotLightHed = new THREE.SpotLight(0xffffff, 3.5, 100, Math.PI / 10, 0.2, 1); // 照射範囲を狭く
            enemySpotLightHed.visible = false; // 初期状態はオフ
            scene.add(enemySpotLightHed);
            scene.add(enemySpotLightHed.target);

            // ロード完了後にロード画面を非表示にする
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/gun.glb',
        function (gltf) {
            gunModel = gltf.scene;
            gunModel.scale.set(0.5, 0.5, 0.5);

            gunModel.traverse((child) => {
                if (child.isMesh) {
                    // 現在のマテリアルのテクスチャを取得
                    const texture = child.material.map;

                    // 光の影響を受けないマテリアルに変更
                    child.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        color: 0x005243, // 黒色
                        metalness: 1.0, // 金属っぽさ
                        roughness: 0.2 // 表面の粗さを調整
                    });
                }
            });

            // カメラに追加してプレイヤー視点にする
            camera.add(gunModel);
            gunModel.position.set(1, -0.5, -1); // カメラからの相対位置を設定
            gunModel.rotation.set(0, Math.PI * 3 / 2, 0); // 銃の向きを調整（必要に応じて調整）
            modelLoaded();
        },
        onProgress
    );

    const SIZE = 3000;
    const LENGTH = 1000;
    const vertices = [];
    for (let i = 0; i < LENGTH; i++) {
        const x = SIZE * (Math.random() - 0.5);
        const y = SIZE * (Math.random() - 0.5);
        const z = SIZE * (Math.random() - 0.5);

        vertices.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
        size: 10,
        color: 0xffffff,
    });

    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);

    window.addEventListener('resize', onWindowResize, false);

    const canvas = document.querySelector('#FPSCanvas');
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    updateHpBar();//HPの初期化

}

// ロード画面を表示する関数
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex'; // 表示
    }
}

// ロード画面を非表示にする関数
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none'; // 非表示
    }
    document.getElementById('aiming').style.display = 'block';
}

// ウィンドウサイズ変更の処理
export function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// マウス移動の処理
export function onMouseMove(event) {
    if (document.pointerLockElement === document.querySelector('#FPSCanvas')) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitchObject.rotation.x));
    }
}

// キーボードの押下処理
export function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (canJump) {
                velocity.y = jumpSpeed;
                canJump = false;
                isJumping = true;
            }
            break;
        case 'ShiftLeft':
            if (!isJumping) {
                isCrouching = true; // しゃがみ状態を有効化
                yawObject.position.y = crouchHeight; // 直接高さを変更
            }
            break;
        case 'KeyR':
            reload();
            break;
        case 'KeyX':
            if (heal == true) {
                console.warn("healing");
                heal = false;
                playerHp += 50;
                updateHpBar();
                socket.emit('heal', { playerName: playerName, healAmount: 50 }); // サーバに回復を伝える
                setTimeout(() => {
                    heal = true;
                }, 30000);

            }
    }
}

// キーボードの解放処理
export function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
        case 'ShiftLeft':
            isCrouching = false; // しゃがみ状態を解除
            if (!isJumping) {
                yawObject.position.y = normalHeight; // 直接高さを変更
            }
            break;
    }
}

function onMouseDown(event) {
    if (event.button === 0) { // 左クリック
        isShooting = true;
    } else if (event.button === 2) { // 右クリック
        spotLight.visible = !spotLight.visible;
        // スポットライトの状態をサーバーに送信
        updatePlayerPosition();
    }
}

function onMouseUp(event) {
    if (event.button === 0) { // 左クリック
        isShooting = false;
    }
}


function shoot() {
    if (ammo > 0 && !isReloading) {
        shoot_sound.currentTime = 0;
        shoot_sound.play();
        socket.emit('gunsound');
        // 実際の発砲処理をここに追加
        createBullet();
        ammo--;
        updateAmmoCount(); // Update ammo count display
        applyRecoil();
        if (ammo === 0) {
            reload();
        }
    }
}

function applyRecoil() {
    const recoilAmount = 0.05;
    pitchObject.rotation.x += recoilAmount;
    yawObject.rotation.y += (Math.random() - 0.5) * recoilAmount * shaking; // 左右のブレを少し小さくする
}

function reload() {
    if (!isReloading) {
        isReloading = true;
        console.log("Reloading...");
        reload_sound.currentTime = 0;
        reload_sound.play();
        set_sound.play();
        setTimeout(() => {
            ammo = guntimes;
            isReloading = false;
            console.log("Reload complete!");
            updateAmmoCount(); // Update ammo count display after reloading
            ready_sound.play();
        }, reloadTime);
    }
}

socket.on('soundofgun', () => {
    shoot1_sound.currentTime = 0;
    shoot1_sound.play();
});

function createBullet() {
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.scale.set(0.1, 0.1, 0.1);

    // 弾丸の初期位置をカメラに設定
    bullet.position.copy(camera.position);

    // カメラの方向を取得
    const bulletDirection = new THREE.Vector3();
    camera.getWorldDirection(bulletDirection);
    bullet.userData.velocity = bulletDirection.clone().multiplyScalar(bulletSpeed);

    // カメラに弾丸を追加
    camera.add(bullet);
    bullets.push(bullet);
}



function moveBullets(delta) {
    bullets.forEach((bullet, index) => {
        // カメラの位置に基づいて弾丸を移動
        const worldPosition = new THREE.Vector3();
        bullet.getWorldPosition(worldPosition);
        const direction = new THREE.Vector3();
        direction.copy(bullet.userData.velocity).multiplyScalar(delta);

        worldPosition.add(direction);

        bullet.position.copy(camera.worldToLocal(worldPosition));

        // 弾丸が一定距離を超えたら削除
        if (worldPosition.length() > 500) {
            camera.remove(bullet);
            bullets.splice(index, 1);
        }
    });
}

socket.on('updatePositions', data => {
    // console.log('Received updated positions:', data); 
    nowEnemyPositions = data; // すべてのプレイヤーの位置情報を更新

    // 敵の位置情報をBearモデルに反映
    if (bearModel && enemyName) {
        // console.log(`Updating enemy position for ${enemyName}`); 
        const enemyPosition = data[enemyName].position;
        const enemyRotation = data[enemyName].rotation;

        bearModel.position.set(enemyPosition.x, enemyPosition.y, enemyPosition.z);
        bearModel.rotation.set(enemyRotation.x, enemyRotation.y + Math.PI, enemyRotation.z);

        // 敵のスポットライトの位置と方向をBearモデルと同期
        enemySpotLight.position.copy(bearModel.position);
        enemySpotLight.target.position.set(
            enemyPosition.x + Math.sin(enemyRotation.y + Math.PI),
            enemyPosition.y,
            enemyPosition.z + Math.cos(enemyRotation.y + Math.PI)
        );
        enemySpotLight.target.updateMatrixWorld();

        // サーバーから受信したスポットライトの状態を反映
        enemySpotLight.visible = data[enemyName].spotLightState;

        enemySpotLightHed.position.set(enemyPosition.x, enemyPosition.y + 2.0, enemyPosition.z);
        enemySpotLightHed.target.position.set(enemyPosition.x, enemyPosition.y + 0.2, enemyPosition.z);
        enemySpotLightHed.target.updateMatrixWorld();

        // サーバーから受信したスポットライトの状態を反映
        enemySpotLightHed.visible = data[enemyName].spotLightState;
    }
});

function checkCollisions() {
    bullets.forEach((bullet, bulletIndex) => {
        const bulletBox = new THREE.Box3().setFromObject(bullet);
        let bulletRemoved = false;

        // 各衝突対象オブジェクトのバウンディングボックスに対して判定を行う
        collisionBoxes.forEach((objectBox) => {
            if (bulletBox.intersectsBox(objectBox) && !bulletRemoved) {
                console.log('Bullet hit an object!');
                // 弾丸を削除
                bullet.parent.remove(bullet); // カメラ以外に追加された場合に対応
                bullets.splice(bulletIndex, 1);
                bulletRemoved = true; // すでに衝突した弾丸についてはこれ以上処理しない
            }
        });

        // Bearモデルとの衝突判定
        if (!bulletRemoved && bearModel) {
            const bearBox = new THREE.Box3().setFromObject(bearModel);
            if (bulletBox.intersectsBox(bearBox)) {
                showHitIndicator();
                // 弾丸を削除
                bullet.parent.remove(bullet); // カメラ以外に追加された場合に対応
                bullets.splice(bulletIndex, 1);
                bulletRemoved = true; // すでに衝突した弾丸についてはこれ以上処理しない

                // 敵にダメージを通告
                if (enemyName) {
                    console.log('Hit bear! Sending hit to enemyName:', enemyName); // デバッグログを追加
                    socket.emit('hit', {
                        enemyName: enemyName,
                        damage: damegepala // ダメージ量を指定
                    });
                } else {
                    console.error("Do not have enemyName");
                    console.log(enemyName);
                }
            }
        }
    });
}


function updateHpBar() {
    const hpBar = document.getElementById('hp-bar');
    if (hpBar) {
        hpBar.style.width = playerHp + '%';
    } else {
        console.error("HP bar element not found");
    }
}

socket.on('damage', (data) => {
    const hp = data.damage;
    const playerId = data.enemyName.name;
    console.log(playerId);
    if (playerId === playerName) {
        console.log(`Player ${playerId} HP updated: ${hp}`);
        playerHp -= data.damage;
        showDamageOverlay();
        if (playerHp < 0) playerHp = 0;
        updateHpBar();
    } else {
        console.warn("I am not get damage");
    }
});

socket.on('healed', (data) => {
    const { playerName: healedPlayer, newHp } = data;
    if (healedPlayer === playerName) {
        playerHp = newHp;
        updateHpBar();
    }
});

function showHitIndicator() {
    const hitIndicator = document.getElementById('hit-indicator');
    hitIndicator.style.display = 'block';
    hitIndicator.style.opacity = '1';
    hitIndicator.style.animation = 'none'; // アニメーションをリセット
    requestAnimationFrame(() => {
        hitIndicator.style.animation = '';
    });
    setTimeout(() => {
        hitIndicator.style.display = 'none';
    }, 500); // 0.5秒後に非表示にする
}

function showDamageOverlay() {
    const damageOverlay = document.getElementById('damage-overlay');
    damageOverlay.style.display = 'block';
    damageOverlay.style.opacity = '1';
    damageOverlay.style.animation = 'none'; // アニメーションをリセット
    requestAnimationFrame(() => {
        damageOverlay.style.animation = '';
    });
    setTimeout(() => {
        damageOverlay.style.display = 'none';
    }, 500); // 0.5秒後に非表示にする
}

// プレイヤの位置を送信する
function updatePlayerPosition() {
    let playerPosition = {
        x: yawObject.position.x,
        y: yawObject.position.y,
        z: yawObject.position.z
    };

    let playerRotation = {
        x: yawObject.rotation.x,
        y: yawObject.rotation.y,
        z: yawObject.rotation.z
    };

    socket.emit('positionUpdate', {
        name: playerName,
        position: playerPosition,
        rotation: playerRotation,
        spotLightState: spotLight.visible // スポットライトの状態を送信
    });
}


socket.on('spawn', (data) => {
    const { name, position, rotation } = data;
    if (name === playerName) {
        yawObject.position.set(position.x, position.y, position.z);
        yawObject.rotation.set(rotation.x, rotation.y, rotation.z);
        console.log(`Player ${name} spawned at position (${position.x}, ${position.y}, ${position.z})`);
    }
});

socket.on('anti', () => {
    console.log("I am anti");
    ant1 = 1;
});

function updateAmmoCount() {
    const ammoCounter = document.getElementById('ammo-counter');
    if (ammoCounter) {
        ammoCounter.textContent = `Magazine : ${ammo}`;
    }
}

export function animate() {
    requestAnimationFrame(animate);

    if (ant == 1 && ant1 == 1) {
        damegepala = 150;
    }

    const delta = clock.getDelta();
    const currentTime = Date.now();

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveLeft) - Number(moveRight);
    direction.normalize();

    const currentSpeed = isCrouching ? crouchSpeed : normalSpeed;

    // プレイヤーの向きに基づいて移動ベクトルを計算
    const moveVector = new THREE.Vector3();
    if (moveForward || moveBackward) moveVector.z -= direction.z * currentSpeed * delta;
    if (moveLeft || moveRight) moveVector.x -= direction.x * currentSpeed * delta;

    // 移動ベクトルをプレイヤーの向きに合わせて回転
    moveVector.applyQuaternion(yawObject.quaternion);

    velocity.add(moveVector);
    velocity.y -= gravity * delta;

    const oldPosition = yawObject.position.clone();

    // X軸とZ軸の移動を分離
    const newPosition = oldPosition.clone();
    newPosition.add(velocity.clone().multiplyScalar(delta));

    // プレイヤーのバウンディングボックスを作成
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(newPosition.x, newPosition.y - normalHeight / 2, newPosition.z),
        new THREE.Vector3(1, normalHeight, 1)
    );

    // 衝突判定
    let collisionX = false;
    let collisionZ = false;
    for (const box of collisionBoxes) {
        if (playerBox.intersectsBox(box)) {
            const xOverlap = Math.min(playerBox.max.x, box.max.x) - Math.max(playerBox.min.x, box.min.x);
            const zOverlap = Math.min(playerBox.max.z, box.max.z) - Math.max(playerBox.min.z, box.min.z);

            if (xOverlap < zOverlap) {
                collisionX = true;
            } else {
                collisionZ = true;
            }
        }
    }

    // 衝突していない軸のみ移動を適用
    if (!collisionX) {
        yawObject.position.x = newPosition.x;
    }
    if (!collisionZ) {
        yawObject.position.z = newPosition.z;
    }

    yawObject.position.y += velocity.y * delta;

    // 床との衝突判定
    if (yawObject.position.y < normalHeight && velocity.y < 0) {
        yawObject.position.y = Math.max(crouchHeight, normalHeight);
        velocity.y = 0;
        canJump = true;
        isJumping = false;
    }

    // フロアの境界チェック
    const halfFloorSize_x = FLOOR_SIZE_x / 2 - 0.5;
    const halfFloorSize_z = FLOOR_SIZE_z / 2 + 2;
    if (Math.abs(newPosition.x) > halfFloorSize_x) {
        newPosition.x = Math.sign(newPosition.x) * halfFloorSize_x;
        velocity.x *= -0.5; // x方向の速度を反転して減衰
    }

    if (Math.abs(newPosition.z) > halfFloorSize_z) {
        newPosition.z = Math.sign(newPosition.z) * halfFloorSize_z;
        velocity.z *= -0.5; // z方向の速度を反転して減衰
    }


    // しゃがみ状態を反映する
    if (isCrouching && !isJumping) {
        yawObject.position.y = crouchHeight;
    } else if (!isJumping) {
        yawObject.position.y = normalHeight;
    }

    // 以下は変更なし
    if (isShooting && currentTime - lastShotTime > fireRate) {
        shoot();
        lastShotTime = currentTime;
    }

    updatePlayerPosition();
    moveBullets(delta);
    checkCollisions();

    if (gunModel) {
        gunModel.updateMatrixWorld();
    }

    renderer.render(scene, camera);
}