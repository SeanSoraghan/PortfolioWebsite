uniform float time;
uniform float centroid;
uniform float rms;
uniform vec2  resolution;
uniform float mouseX;
uniform float mouseY;

uniform vec4 yPointsLeft;
uniform vec4 yPointsRight;

varying vec2 vertexPosition;

const float pi = 3.14159265359;

void warpExp(in float x, out float xWarped)
{
	xWarped =  (pow(10.0, 3.0*x) - 1.0) / (pow(10.0, 3.0) - 1.0);
}

void AddLine(in vec2 pos, in vec2 p1, in vec2 p2, in float attenuation, out float col)
{
	float m = (p2.y - p1.y) / (p2.x - p1.x);
	float c = p1.y - m*p1.x;
	float yForPosX = m * pos.x + c;
	float dist = abs(pos.y - yForPosX);
	float lineIntensity = pow(clamp(1.0 - dist, 0.0, 1.0), attenuation);

	float limLeft = min(p1.x, p2.x);
	float limRight = max(p1.x, p2.x);
	float lineEdge = 1.0 / attenuation;
	float wLeft = smoothstep(limLeft - lineEdge, limLeft, pos.x);
	float wRight = 1.0 - smoothstep(limRight, limRight + lineEdge, pos.x);

	col += lineIntensity * wLeft * wRight;
}

void AddPoint(in vec2 pos, in vec2 pCentre, in float attenuation, out float col)
{
	float dist = distance(pos, pCentre);
	float d = clamp(1.0 - dist, 0.0, 1.0);
	col += pow(d, attenuation);
}

void AddString(in vec2 pos, in vec4 stringPointsX, in vec4 stringPointsY, in float attenuation, out float col)
{
	AddPoint(pos, vec2(stringPointsX.x, stringPointsY.x), attenuation, col);
	AddLine(pos, vec2(stringPointsX.x, stringPointsY.x), vec2(stringPointsX.y, stringPointsY.y), attenuation, col);
	AddLine(pos, vec2(stringPointsX.x, stringPointsY.x), vec2(stringPointsX.z, stringPointsY.z), attenuation*3.0, col);

	AddPoint(pos, vec2(stringPointsX.y, stringPointsY.y), attenuation, col);
	AddLine(pos, vec2(stringPointsX.y, stringPointsY.y), vec2(stringPointsX.z, stringPointsY.z), attenuation, col);
	AddLine(pos, vec2(stringPointsX.y, stringPointsY.y), vec2(stringPointsX.w, stringPointsY.w), attenuation * 3.0, col);

	AddPoint(pos, vec2(stringPointsX.z, stringPointsY.z), attenuation, col);
	AddLine(pos, vec2(stringPointsX.z, stringPointsY.z), vec2(stringPointsX.w, stringPointsY.w), attenuation, col);

	AddPoint(pos, vec2(stringPointsX.w, stringPointsY.w), attenuation, col);
}

void main() 
{ 
	vec2 pos = vec2 (gl_FragCoord.xy / resolution.xy) * 2.0 - 1.0;
	float c = 0.0;

	float attenuation = 50.0;
	vec4 xPointsLeft = vec4(-0.7, -0.5, -0.3, -0.1);
	vec4 xPointsRight = vec4(0.1, 0.3, 0.5, 0.7);

	AddString(pos, xPointsLeft, yPointsLeft, attenuation, c);
	AddLine(pos, vec2(xPointsLeft.z, yPointsLeft.z), vec2(xPointsRight.x, yPointsRight.x), attenuation * 3.0, c);
	AddLine(pos, vec2(xPointsLeft.w, yPointsLeft.w), vec2(xPointsRight.x, yPointsRight.x), attenuation, c);
	AddLine(pos, vec2(xPointsLeft.w, yPointsLeft.w), vec2(xPointsRight.y, yPointsRight.y), attenuation * 3.0, c);

	AddString(pos, xPointsRight, yPointsRight, attenuation, c);

	

	vec3 col = vec3(c);
	gl_FragColor = vec4 (col, 1.0); 
}