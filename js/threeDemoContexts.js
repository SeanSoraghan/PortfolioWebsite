function mouseCursorStrummer(plucker)
{
    this.contactPoint = 0.0;
    this.prevY = 0.0;
    this.velocity = 0.0;

    this.velocityMultiplier = -500.0;
    this.setY = function(newY)
    {
        this.velocity = (newY - this.prevY) * this.velocityMultiplier;
        if (plucker && Math.sign(this.prevY - this.contactPoint) != Math.sign(newY - this.contactPoint))
            plucker.pluck();
        this.prevY = newY;
    }
}

function wavesContext()
{
    this.uniforms =
    {
        time: {type: 'f', value: 0.0},
        resolution: {type: 'v2', value: new THREE.Vector2 (0.0, 0.0)},
        mouseX: {type: 'f', value: 0.0},
        mouseY: {type: 'f', value: 0.0},
        rms: {type: 'f', value: 0.0},
        pitch: {type: 'f', value: 0.0},
        detune: {type: 'f', value: 0.0}
    };

    this.updateUniforms = function()
    {
        if (this.updateSynthParams)
            this.updateSynthParams();
        this.uniforms.time.value += 0.1;
    }
}

function sphereContext()
{
    this.uniforms =
    {
        time: {type: 'f', value: 0.0},
        resolution: {type: 'v2', value: new THREE.Vector2 (0.0, 0.0)},
        mouseX: {type: 'f', value: 0.0},
        mouseY: {type: 'f', value: 0.0},
        rms: {type: 'f', value: 0.0},
        envTime: {type: 'f', value: 0.0}
    };

    this.updateUniforms = function()
    {
        if (this.updateSynthParams)
            this.updateSynthParams();
        this.uniforms.time.value += 0.1;
    }
}

function massSpringStringContext()
{
    this.numPoints = 8;
    // Y positions of 8 points on a vibrating string.
    this.posArray = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    // X positions of the 8 points. These remain static and are NOT sent to the GPU.
    // They are used here for mouse interaction purposes.
    this.xPosArray = [-0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7];
    // Y velocity values of 8 points on a vibrating string.
    this.velArray = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    // Y force values acting on the 8 points.
    this.forceArray = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

    this.stiffness = 30.0;
    var s = this.stiffness;
    this.stiffnessArray = [0.25*s, 0.5*s, 1.0*s, 2.0*s, 2.0*s, 1.0*s, 0.5*s, 0.25*s];
    this.dampingFactor = 1.0;
    var d = this.dampingFactor;
    this.dampingArray = [2.0 * d, 0.25 * d, 0.05 * d, 0.01 * d, 0.01 * d, 0.05 * d, 0.25 * d, 2.0 * d];
    this.mass = 0.6;
    this.maxForce = 10.0;

    this.applyInputForce = false;

    this.clock = new THREE.Clock();

    this.findClosestXPointIndex = function(x)
    {
        var minDist = 0.3;
        var closestIndex = 0;
        for (var i = 0; i < this.numPoints; i++)
        {
            var d = Math.abs(x - this.xPosArray[i]);
            if (d < minDist)
            {
                closestIndex = i;
                minDist = d;
            }
        }
        return closestIndex;
    }

    this.pluck =  function()
    {
        var x = this.uniforms.mouseX.value * 2.0 - 1.0;
        if (x > this.xPosArray[0] && x < this.xPosArray[this.numPoints - 1])
        {
            var index = this.findClosestXPointIndex(x);
            this.forceArray[index] = this.strummer.velocity;
        }
    }

    this.strummer = new mouseCursorStrummer(this);

    this.uniforms =
    {
        time: {type: 'f', value: 0.0},
        resolution: {type: 'v2', value: new THREE.Vector2 (0.0, 0.0)},
        mouseX: {type: 'f', value: 0.0},
        mouseY: {type: 'f', value: 0.0},
        yPointsLeft : { type: "v4", value: new THREE.Vector4( 0.0, 0.0, 0.0, 0.0 )},
        yPointsRight: { type: "v4", value: new THREE.Vector4( 0.0, 0.0, 0.0, 0.0 )}
    };

    function getForce(yPos, neighbourYPos, yVel, neighbourYVel, stiffness, dampingFactor)
    {
        var dist = neighbourYPos - yPos;
        var force = stiffness * dist + dampingFactor * (neighbourYVel - yVel);
        return force;
    }

    this.updatePoints = function(deltaTime)
    {
        var forces = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

        //this.stiffness = this.uniforms.mouseX.value * 89.0 + 1.0;
        var i
        for (i = 1; i < this.numPoints - 1; ++i) // keep the end points static
        {
            var internalForce = 0.0;
            var p = this.posArray[i];
            var v = this.velArray[i];
            var s = this.stiffnessArray[i];
            var d = this.dampingArray[i];

            internalForce += getForce(p, this.posArray[i + 1], v, this.velArray[i + 1], s, d);

            if (i < this.numPoints - 2)
            {
                internalForce += getForce(p, this.posArray[i + 2], v, this.velArray[i + 2], s, d);
            }

            internalForce += getForce(p, this.posArray[i - 1], v, this.velArray[i - 1], s, d);

            if (i > 2)
            {
                internalForce += getForce(p, this.posArray[i - 2], v, this.velArray[i - 2], s, d);
            }
            var externalForce = this.forceArray[i];
            if (externalForce < -this.maxForce || externalForce > this.maxForce)
            {
                externalForce = 0.0;
                //it could blow up because of junk positions as well!
            }
            forces[i] = internalForce + this.forceArray[i];
        }
        for (i = 0; i < this.numPoints; ++i)
        {
            var acceleration = forces[i] / this.mass;
            //console.log("acc: " + acceleration);
            this.velArray[i] += acceleration * deltaTime;
            this.posArray[i] += this.velArray[i] * deltaTime;
        }
        this.forceArray = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    }

    this.updateUniforms = function()
    {
        var deltaTime = this.clock.getDelta();

        var y = this.uniforms.mouseY.value * 2.0 - 1.0;
        var x = this.uniforms.mouseX.value * 2.0 - 1.0;

        if (y < -1.0 || y > 1.0 || x < -1.0 || x > 1.0)
            this.applyInputForce = false;
        if (this.applyInputForce)
        {

            if (y >= -1.0 && y <= 1.0 && x >= this.xPosArray[0] && x <= this.xPosArray[this.numPoints - 1])
            {
                index = this.findClosestXPointIndex(x);
                // ensure we don't change the position of the end points.
                index = Math.max(index, 1);
                index = Math.min(index, this.numPoints - 2);
                this.forceArray[index] =  -y * this.maxForce;
            }
        }

        this.updatePoints(deltaTime);
        //console.log(this.posArray);
        var posLeft = new THREE.Vector4();
        posLeft.fromArray(this.posArray, 0);
        var posRight = new THREE.Vector4();
        posRight.fromArray(this.posArray, 4);
        this.uniforms.yPointsLeft.value = posLeft;
        this.uniforms.yPointsRight.value = posRight;
        if (this.updateSynthParams)
            this.updateSynthParams();
        this.uniforms.time.value += deltaTime;
    }
}