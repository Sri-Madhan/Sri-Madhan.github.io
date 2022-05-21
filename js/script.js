(function () {
    // Set our main variables
    let scene,
        renderer,
        camera,
        houseModel,
        model,
        neck,
        waist,
        possibleAnims,
        mixer,
        idle,
        clock = new THREE.Clock(),
        currentlyAnimating = false,
        raycaster = new THREE.Raycaster(),
        loaderAnim = document.getElementById('js-loader');
    audioControl = document.getElementById('mute');

    //audio
    const listener = new THREE.AudioListener();
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();

    audioControl.addEventListener("click", () => {
        if (audioControl.value === "mute") {
            sound.stop();
            audioControl.value = "unmute";
        } else {
            sound.play();
            audioControl.value = "mute";
        }
    });

    init();

    function init() {

        const canvas = document.querySelector('#c');
        const backgroundColor = 0x000000;//0xf1f1f1(w)  0x302F2F(cement)

        // Init the scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(backgroundColor);

        // Init the renderer
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        // Add a camera
        camera = new THREE.PerspectiveCamera(
            30,
            window.innerWidth / window.innerHeight,
            1,
            1000
        );
        camera.add(listener);

        // Model load
        var modelLoader = new THREE.GLTFLoader();
        modelLoader.load(
            'asserts/madhan.glb',
            function (gltf) {
                model = gltf.scene;
                let fileAnimations = gltf.animations;

                model.traverse(o => {
                    if (o.isMesh) {
                        o.castShadow = true;
                        o.receiveShadow = true;
                    }

                    if (o.isBone && o.name == 'Neck') {
                        neck = o;
                    }
                    if (o.isBone && o.name == 'Spine') {
                        waist = o;
                    }

                });

                model.scale.set(7, 7, 7);
                model.position.z = -60;
                model.position.y = -11;

                scene.add(model);

                mixer = new THREE.AnimationMixer(model);

                let clips = fileAnimations.filter(val => val.name !== 'idle');
                possibleAnims = clips.map(val => {
                    let clip = THREE.AnimationClip.findByName(clips, val.name);

                    clip.tracks.splice(3, 3);
                    clip.tracks.splice(9, 3);

                    clip = mixer.clipAction(clip);
                    return clip;
                });

                let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');

                idleAnim.tracks.splice(3, 3);
                idleAnim.tracks.splice(9, 3);

                idle = mixer.clipAction(idleAnim);
                idle.play();

                sound.pause();
                audioLoader.load('asserts/audio/bgAudio.mp3', function (buffer) {
                    sound.setBuffer(buffer);
                    sound.setLoop(true);
                    sound.setVolume(0.5);
                    sound.play();
                });

            },
            undefined,
            function (error) {
                console.error(error);
            }
        );

        //load house
        var houseLoader = new THREE.GLTFLoader();
        houseLoader.load(
            "https://drive.google.com/file/d/1UtVUc3cSCi9Z_OMDDpY2zEuNgs0W0q9q/view?usp=sharing",
            function (gltf) {
                houseModel = gltf.scene;
                houseModel.position.z = -600;
                // houseModel.position.x = -40;
                houseModel.position.y = -50;
                houseModel.scale.set(15, 15, 15);
                scene.add(houseModel);
                console.log("loaded");
                loaderAnim.remove();
            },
            undefined,
            function (error) {
                console.error(error);
            }
        );

        // Add lights
        let hemiLight = new THREE.HemisphereLight(0xa5f0d3, 0xa5f0d3, 0.3);
        hemiLight.position.set(0, 1, 500);
        scene.add(hemiLight);

        //spot light
        const spotLight = new THREE.PointLight(0xffffff, Math.PI / 4);
        spotLight.position.set(0, 15, 0);
        spotLight.castShadow = true;
        scene.add(spotLight);

        //skybox
        let materialArray = [];
        let texture_ft = new THREE.TextureLoader().load('asserts/skybox/sky_ft.png');
        let texture_bk = new THREE.TextureLoader().load('asserts/skybox/sky_bk.png');
        let texture_up = new THREE.TextureLoader().load('asserts/skybox/sky_up.png');
        let texture_dn = new THREE.TextureLoader().load('asserts/skybox/sky_dn.png');
        let texture_rt = new THREE.TextureLoader().load('asserts/skybox/sky_rt.png');
        let texture_lf = new THREE.TextureLoader().load('asserts/skybox/sky_lf.png');

        materialArray.push(new THREE.MeshBasicMaterial({ map: texture_ft }));
        materialArray.push(new THREE.MeshBasicMaterial({ map: texture_bk }));
        materialArray.push(new THREE.MeshBasicMaterial({ map: texture_up }));
        materialArray.push(new THREE.MeshBasicMaterial({ map: texture_dn }));
        materialArray.push(new THREE.MeshBasicMaterial({ map: texture_rt }));
        materialArray.push(new THREE.MeshBasicMaterial({ map: texture_lf }));

        for (let i = 0; i < 6; i++)
            materialArray[i].side = THREE.BackSide;

        let skyboxGeo = new THREE.BoxGeometry(2000, 2000, 2000);
        let skybox = new THREE.Mesh(skyboxGeo, materialArray);
        scene.add(skybox);

    }

    function update() {
        if (mixer) {
            mixer.update(clock.getDelta());
        }
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
        renderer.render(scene, camera);
        requestAnimationFrame(update);
    }
    update();

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        let width = window.innerWidth;
        let height = window.innerHeight;
        let canvasPixelWidth = canvas.width / window.devicePixelRatio;
        let canvasPixelHeight = canvas.height / window.devicePixelRatio;

        const needResize =
            canvasPixelWidth !== width || canvasPixelHeight !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    window.addEventListener('click', e => raycast(e));
    window.addEventListener('touchend', e => raycast(e, true));

    function raycast(e, touch = false) {
        var mouse = {};
        if (touch) {
            mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
            mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
        } else {
            mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
            mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
        }
        // update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // calculate objects intersecting the picking ray
        var intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects[0]) {
            var object = intersects[0].object;
            // console.log(object.name);
            if (object.name === 'Wolf3D_Outfit_Top') {
                if (!currentlyAnimating) {
                    currentlyAnimating = true;
                    playOnClick();
                }
            }
        }
    }

    function playOnClick() {
        let anim = Math.floor(Math.random() * possibleAnims.length) + 0;
        playModifierAnimation(idle, 0.25, possibleAnims[anim], 0.25);
    }

    function playModifierAnimation(from, fSpeed, to, tSpeed) {
        to.setLoop(THREE.LoopOnce);
        to.reset();
        to.play();
        from.crossFadeTo(to, fSpeed, true);
        setTimeout(function () {
            from.enabled = true;
            to.crossFadeTo(from, tSpeed, true);
            currentlyAnimating = false;
        }, to._clip.duration * 1000 - ((tSpeed + fSpeed) * 1000));
    }

    document.addEventListener('mousemove', function (e) {
        var mousecoords = getMousePos(e);
        if (neck && waist) {
            moveJoint(mousecoords, neck, 50);
            moveJoint(mousecoords, waist, 30);
        }
    });

    function getMousePos(e) {
        return { x: e.clientX, y: e.clientY };
    }

    function moveJoint(mouse, joint, degreeLimit) {
        let degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
        joint.rotation.y = THREE.Math.degToRad(degrees.x);
        joint.rotation.x = THREE.Math.degToRad(degrees.y);
    }

    function getMouseDegrees(x, y, degreeLimit) {
        let dx = 0,
            dy = 0,
            xdiff,
            xPercentage,
            ydiff,
            yPercentage;

        let w = { x: window.innerWidth, y: window.innerHeight };

        if (x <= w.x / 2) {

            xdiff = w.x / 2 - x;

            xPercentage = (xdiff / (w.x / 2)) * 100;

            dx = ((degreeLimit * xPercentage) / 100) * -1;
        }

        if (x >= w.x / 2) {
            xdiff = x - w.x / 2;
            xPercentage = (xdiff / (w.x / 2)) * 100;
            dx = (degreeLimit * xPercentage) / 100;
        }

        if (y <= w.y / 2) {
            ydiff = w.y / 2 - y;
            yPercentage = (ydiff / (w.y / 2)) * 100;

            dy = (((degreeLimit * 0.5) * yPercentage) / 100) * -1;
        }

        if (y >= w.y / 2) {
            ydiff = y - w.y / 2;
            yPercentage = (ydiff / (w.y / 2)) * 100;
            dy = (degreeLimit * yPercentage) / 100;
        }
        return { x: dx, y: dy };
    }

})();