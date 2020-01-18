uniform float time;
uniform vec2  resolution;
uniform float mouseX;
uniform float mouseY;
uniform float rms;
uniform float detune;
uniform float pitch;

varying vec2 vertexPosition;

const float pi = 3.14159265359;
const float l10 = 1.0 / log(10.0);

float log10 (in float x) { return l10 * log(x); }

float gauss (in float x, in float amp, in float m, in float s)
{
	float squaredD = (x - m) * (x - m);
	float div      = 2.0 * s * s;
	float expTerm  = exp (-squaredD / div);

	return amp*expTerm;
}

vec2 getGaussianReferencePoint (in float x, in float amp, in float m, in float s, in float yOffset)
{
	return vec2 (x, gauss (x, amp, m, s) + yOffset);
}

vec2 getGaussianMultiplicationReferencePoint (in float x, in float amp, in float m1, 
											  in float s1, in float m2, in float s2)
{
	return vec2 (x, gauss (x, 1.0, m1, s1) * gauss (x, 1.0, m2, s2) * amp);
}

float getGaussianCurveColour (in vec2 pos, in vec2 gaussianReferencePoint, in float attenuation)
{
	return clamp (1.0 - distance (pos, gaussianReferencePoint) * attenuation, 0.0, 1.0);
}

void addGaussianCurve (inout vec3 col, in vec2 pos, in float amp, in float m, in float s, 
					   in float yOffset, in float lineAttenuation)
{
	vec2 gPoint = getGaussianReferencePoint (pos.x, amp, m, s, yOffset);
	float dist  = getGaussianCurveColour (pos, gPoint, lineAttenuation);
	col += dist;
}

void addGaussianMultiplicationCurve (inout vec3 col, in vec2 pos, in float amp, 
									 in float m1, in float s1, in float m2, in float s2,
									 in float lineAttenuation)
{
	vec2 gPoint = getGaussianMultiplicationReferencePoint (pos.x, amp, m1, s1, m2, s2);
	float dist = getGaussianCurveColour (pos, gPoint, lineAttenuation);
	col += dist;
}

void main() 
{ 
	//float max = max(resolution.x, resolution.y);
	vec2 pos = vec2 (vertexPosition / resolution);
	vec3 col = vec3 (0.0);

	float inputAmp = rms;
	float inputFreq = pitch;
	float inputSpeed = pitch;
	float inputHarmonicity = 1.0 - detune;

	float swayAmpAnimation = (sin (time * 0.012) * 0.001);
	float globalAmpAnimation = inputAmp;
	float globalVAnimation = 0.05 + inputHarmonicity * 0.45;
	float maxSpeed = 5.0;
	float minSpeed = 0.3;
	float mappedSpeed = (pow(10.0, 3.0*inputSpeed) - 1.0) / (pow(10.0, 3.0) - 1.0);
	float globalSpeed = minSpeed + mappedSpeed * (maxSpeed - minSpeed);

	float globalFreq = pow(10.0, inputFreq - 2.0);
	float freq = 5.0 + 1000.0 * globalFreq;
	float zeroLine = 0.0;// sin (pos.x * 3.0 + time) * 0.01;

	for (float i = 7.0; i < 21.0; i++)
	{
		float ampAnimation = sin (globalSpeed * time + pos.x * freq);
		float amp = (i * 0.03);

		float m = (i) / resolution.x * 10.0;
		float mAnimation = sin (time * 0.05 + i * 0.2) * 0.5;

		float attenuationAnimation = sin (time * 0.001);
		float attenuation = 100.0 + attenuationAnimation * 10.0; 
		addGaussianCurve (col, pos, (amp * ampAnimation + swayAmpAnimation) * globalAmpAnimation, 
						  m * mAnimation, globalVAnimation, zeroLine, attenuation);
	}

	float zeroLineEdge = 0.000001;
	float posCol = smoothstep (zeroLine, zeroLine + zeroLineEdge, pos.y);
	float negCol = smoothstep (zeroLine, zeroLine - zeroLineEdge, pos.y);
	//col *= posCol + negCol;
	col *= vec3 (0.3, 0.48, 0.7);

	float d = clamp (1.0 - abs (pos.x)*2.0, 0.0, 1.0);
	col *= d;
	gl_FragColor = vec4 (col, 0.0); 
}