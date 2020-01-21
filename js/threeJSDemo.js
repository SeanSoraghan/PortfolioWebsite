function ShaderLoader(vertex_url, fragment_url, onLoad, onProgress, onError)
{
    var vertex_loader = new THREE.FileLoader(THREE.DefaultLoadingManager);
    vertex_loader.setResponseType('text');
    vertex_loader.load(vertex_url, function (vertex_text) {
      var fragment_loader = new THREE.FileLoader(THREE.DefaultLoadingManager);
      fragment_loader.setResponseType('text');
      fragment_loader.load(fragment_url, function (fragment_text) {
        onLoad(vertex_text, fragment_text);
      });
    }, onProgress, onError);
}

function ThreeJSDemo (containerID, canvasID, fragURL, vertURL, shadersLoadedCallback, customUniformsContext)
{
    this.customUniformsContext = customUniformsContext;
    this.swap = null; //swap function to load a different demo.
    function updateDemoDimensions(threeDemo, forceUpdate)
    {
        var container = document.getElementById (containerID);
        var contW = container.clientWidth;
        var contH = container.clientHeight;
        console.log('Update dimensions: ' + contW + ' ' + contH);
        if (forceUpdate || threeDemo.canvas.width != contW || threeDemo.canvas.height != contH)
        {
            threeDemo.width = contW;
            threeDemo.height = contH;
            threeDemo.aspect = contW / contH;
        }
    }

    initialiseMembers (this, shadersLoadedCallback);
    initialiseScene (this);
    initShaders (this, vertURL, fragURL);

    var t = this;
    function animate()
    {
        if(t.swap)
        {
            // Remove input handling
            if (document.attachEvent)
            {
                document.detachEvent('onmousemove', mouseMoved);
                document.detachEvent('onmousedown', mouseDown);
            }
            else
            {
                document.removeEventListener('mousemove', mouseMoved);
                document.removeEventListener('mousedown', mouseDown);
            }
            t.swap();
            //t = null;
        }
        else
        {
            requestAnimationFrame (animate);
            t.updateUniforms();
            t.renderer.render (t.scene, t.camera);
        }
    }

    animate();

    window.addEventListener( 'resize', onWindowResize, false );

    function onWindowResize()
    {
        updateDemoDimensions(t, false);
        t.camera.aspect = t.aspect;
        t.camera.updateProjectionMatrix();
        t.renderer.setSize ( t.width, t.height );
        console.log("w: " + t.width + " h: " + t.height + " aspect: " + t.aspect);
        if (t.customUniformsContext)
        {
            t.customUniformsContext.uniforms.resolution.value = new THREE.Vector2 (t.width, t.height);
        }
        else
        {
            t.uniforms.resolution.value = new THREE.Vector2 (t.width, t.height);
        }
    }

    function initialiseMembers (threeDemo, shadersLoadedCallback)
    {
        threeDemo.shadersLoadedCallback = shadersLoadedCallback;
        threeDemo.scene    = {};
        threeDemo.camera   = {};
        threeDemo.renderer = {};
        threeDemo.uniforms = {};
        threeDemo.raycaster = new THREE.Raycaster();
        threeDemo.width = 0;
        threeDemo.height = 0;
        threeDemo.aspect = 0;
        threeDemo.mouseX = 0;
        threeDemo.mouseY = 0;
    }

    function getMousePos(canvas, containerDims, mousePos)
    {
        scaleX = canvas.width / containerDims.width;    // relationship bitmap vs. element for X
        scaleY = canvas.height / containerDims.height;  // relationship bitmap vs. element for Y
        return {
            x: (mousePos.x - containerDims.left) * scaleX,   // scale mouse coordinates after they have
            y: (mousePos.y - containerDims.top) * scaleY     // been adjusted to be relative to element
        }
    }

    var projectMouseIntoWorld = function (mousePos, threeDemo)
    {
        var mouseInWorld = new THREE.Vector2();

        mouseInWorld.set
        (
            (mousePos.x / threeDemo.canvas.width) * 2 - 1,
            - (mousePos.y / threeDemo.canvas.height) * 2 + 1
            // old method of dealing with mouse input uses Vector3 above value
            //, 0.5
        );

        // New way of dealing with  mouse click intersecting objects...

        //raycaster.setFromCamera( mouse, threeDemo.camera );
        //var intersects = raycaster.intersectObjects( objects, recursiveFlag );

        // Old way, with calculation of distance using z.

        //threeDemo.projector.unprojectVector (mouseInWorld, threeDemo.camera);
        //var dir = mouseInWorld.sub (threeDemo.camera.position).normalize();
        //var distance = - threeDemo.camera.position.z / dir.z;
        //var pos = threeDemo.camera.position.clone().add (dir.multiplyScalar (distance));

        return mouseInWorld;
    }

    this.getNormedMousePos = function(mouseEvent)
    {
        var mousePos = new THREE.Vector2 (mouseEvent.x, mouseEvent.y);
        var rect = t.canvas.getBoundingClientRect(); // abs. size of element
        // screen coordinates
        var mousePosInCanvas = getMousePos(t.canvas, rect, mousePos);
        // -1 - 1 (can be used for object interaction in three, see projectMouseIntoWorld())
        var mouseInWorld = projectMouseIntoWorld (mousePosInCanvas, t);
        // 0 - 1
        var mappedMouse = new THREE.Vector2();
        mappedMouse.set
        (
            mouseInWorld.x * 0.5 + 0.5,
            1.0 - (mouseInWorld.y * 0.5 + 0.5)
        );

        return mappedMouse;
    }

    function mouseMoved(mouseEvent)
    {
        var mappedMouse = t.getNormedMousePos(mouseEvent);
        if (mappedMouse.x <= 1.0 && mappedMouse.y <= 1.0 && mappedMouse.x >= 0.0 && mappedMouse.y >= 0.0)
        {
            t.mouseX = mappedMouse.x
            t.mouseY = mappedMouse.y
        }
        if (t.mouseHandler != null)
        {
            t.mouseHandler.mouseMoved(mappedMouse);
        }
    }

    function mouseDown(mouseEvent)
    {
        if (t.mouseHandler)
        {
            var mappedMouse = t.getNormedMousePos(mouseEvent);
            if (mappedMouse.x <= 1.0 && mappedMouse.y <= 1.0 && mappedMouse.x >= 0.0 && mappedMouse.y >= 0.0)
            {
                t.mouseHandler.mouseDown(mappedMouse);
            }
        }
    }

    function mouseUp(mouseEvent)
    {
        if (t.mouseHandler)
        {
            var mappedMouse = t.getNormedMousePos(mouseEvent);
            if (mappedMouse.x <= 1.0 && mappedMouse.y <= 1.0 && mappedMouse.x >= 0.0 && mappedMouse.y >= 0.0)
            {
                t.mouseHandler.mouseUp(mappedMouse);
            }
        }
    }

    function initialiseScene (threeDemo)
    {
        threeDemo.canvas = document.getElementById (canvasID);

        threeDemo.scene = new THREE.Scene();
        threeDemo.renderer = new THREE.WebGLRenderer ({antialias:true, canvas:threeDemo.canvas});
        updateDemoDimensions(threeDemo, true);
        threeDemo.renderer.setSize (threeDemo.width, threeDemo.height);
        threeDemo.renderer.setClearColor( 0x00, 1);

        threeDemo.camera = new THREE.PerspectiveCamera (45, threeDemo.aspect, 0.1, 20000);
        threeDemo.camera.position.set (0,0,300);
        threeDemo.scene.add (threeDemo.camera);

        // Input handling
        if (document.attachEvent)
        {
            document.attachEvent('onmousemove', mouseMoved);
            document.attachEvent('onmousedown', mouseDown);
            document.attachEvent('onmouseup', mouseUp);
        }
        else
        {
            document.addEventListener('mousemove', mouseMoved);
            document.addEventListener('mousedown', mouseDown);
            document.addEventListener('mouseup', mouseUp);
        }
    }

    function initShaders (threeDemo, vertString, fragString)
    {
        if (threeDemo.customUniformsContext)
        {
            threeDemo.customUniformsContext.uniforms.resolution.value = new THREE.Vector2 (threeDemo.width, threeDemo.height);
            threeDemo.uniforms = threeDemo.customUniformsContext.uniforms;
        }
        else
        {
            threeDemo.uniforms =
            {
                time: {type: 'f', value: 0.0},
                resolution: {type: 'v2', value: new THREE.Vector2 (threeDemo.width, threeDemo.height)},
                mouseX: {type: 'f', value: threeDemo.mouseX},
                mouseY: {type: 'f', value: threeDemo.mouseY}
            };
        }
        function onProgress(){}
        function onError(){console.log("Failed to load shaders...");}

        function onLoad(vert, frag)
        {
            if (threeDemo.customUniformsContext)
                shadersLoadedCallback(vert, frag, threeDemo, threeDemo.customUniformsContext.uniforms);
            else
                shadersLoadedCallback(vert, frag, threeDemo);
        }

        ShaderLoader(vertString, fragString, onLoad, onProgress, onError)

        if (threeDemo.customUniformsContext)
        {
            threeDemo.updateUniforms = function()
            {
                threeDemo.customUniformsContext.uniforms.mouseX.value = threeDemo.mouseX;
                threeDemo.customUniformsContext.uniforms.mouseY.value = threeDemo.mouseY;
                threeDemo.customUniformsContext.updateUniforms();
            }
        }
        else
        {
            threeDemo.updateUniforms = function()
            {
                threeDemo.uniforms.time.value += 0.1;
                t.uniforms.mouseX.value = t.mouseX;
                t.uniforms.mouseY.value = t.mouseY;
            }
        }
    }
}

//var container = document.getElementById ('threejsCanvas');
    //document.body.appendChild (container);
    // Set up the scene, camera, and renderer as global variables.