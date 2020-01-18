uniform float time;
uniform vec2  resolution;
uniform float mouseX;
uniform float mouseY;

varying vec2 vertexPosition;

const float pi = 3.14159265359;

float getRForCentre (in vec2 centre, in vec2 pos)
{
	return sqrt( pow(abs(pos.x - centre.x), 2.0) + pow (abs(pos.y - centre.y), 2.0) );
}

float warpExp(in float x)
{
	return (pow(10.0, 3.0*x) - 1.0) / (pow(10.0, 3.0) - 1.0);
}

void main() 
{ 
	vec2 pos = vec2 (gl_FragCoord.xy / resolution.xy);
	pos = pos * 2.0 -1.0;
	vec3 col = vec3 (0.0);

	vec2 mouse = vec2(mouseX*2.0-1.0, -(mouseY*2.0-1.0));
	float r = getRForCentre(mouse, pos);
	float circ1 = clamp(1.0 - r, 0.0, 1.0);

	float mX = (mouse.x * 0.5 + 0.5);
	float mY = (mouse.y * 0.5 + 0.5);
	float pX = (pos.x * 0.5 + 0.5);
	float pY = (pos.y * 0.5 + 0.5);
		
	float freq = pi * 5.0;
	float halfPi = pi * 0.5;
	float modBand = (floor(((pos.y + 1.0) * freq) / halfPi) + 1.0) * halfPi;
	float normedModBand = modBand / (2.0 * freq);
	float mouseModBand = (floor(((mouse.y + 1.0) * freq) / halfPi) + 1.0) * halfPi;
	float normedMouseModBand = mouseModBand / (2.0 * freq);
	float dist = normedModBand - normedMouseModBand;
	float signDist = sign(dist);
	float c = normedModBand - signDist * pow(circ1, 9.0) * 0.3;

	col = vec3(c);

	gl_FragColor = vec4 (col, 1.0); 
}