var planeShadersUpdatedCallback = function (vertex, fragment, threeDemo, customUniforms)
{
    var planeGeometry = new THREE.PlaneGeometry (threeDemo.width, threeDemo.height);
    console.log('width: ' + threeDemo.width + ' | height: ' + threeDemo.height);
    var u = threeDemo.uniforms;
    if (customUniforms)
        u = customUniforms;
    var shaderMat = new THREE.ShaderMaterial 
    (
        {
            uniforms: u, 
            vertexShader: vertex,
            fragmentShader: fragment
        }
    );
    var fragPlane = new THREE.Mesh ( planeGeometry, shaderMat ); 
    threeDemo.scene.add (fragPlane);
}

var planeShadersLoadedCallback = function(vertex, fragment, threeDemo, customUniforms)
{
    planeShadersUpdatedCallback(vertex, fragment, threeDemo, customUniforms);
    //document.getElementById("frag").innerHTML = fragment;
}

var sphereShadersUpdatedCallback = function (vertex, fragment, threeDemo, customUniforms)
{
    var sphereGeometry = new THREE.SphereGeometry (50, 50, 50);
    var uniforms = threeDemo.uniforms;
    if (customUniforms)
        uniforms = customUniforms;
    var shaderMat = new THREE.ShaderMaterial 
    (
        {
            uniforms: uniforms, 
            vertexShader: vertex,
            fragmentShader: fragment
        }
    );
    var fragPlane = new THREE.Mesh ( sphereGeometry, shaderMat ); 
    threeDemo.scene.add (fragPlane);
}

var sphereShadersLoadedCallback = function(vertex, fragment, threeDemo, customUniforms)
{
    sphereShadersUpdatedCallback(vertex, fragment, threeDemo, customUniforms);
    //document.getElementById("frag").innerHTML = fragment;
}