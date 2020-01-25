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
	//float dist = distance(pos, pCentre);
    //float d = clamp(1.0 - dist, 0.0, 1.0);
    //float r = mouseX;
    //col += clamp (smoothstep(r - 0.01, r, d), 0.0, 1.0);
    //col += pow(d, attenuation);

    float dist = clamp(distance(pos, pCentre), 0.0, 1.0);
    float r = 0.009;
    float edgeLength = 0.0025;
    col += clamp(1.0 - smoothstep(r, r + edgeLength, dist), 0.0, 1.0);
}

void AddString(in vec2 pos, in vec4 stringPointsX, in vec4 stringPointsY, in float pointAttenuation, in float lineAttenuation, out float col)
{
	AddPoint(pos, vec2(stringPointsX.x, stringPointsY.x), pointAttenuation, col);
	AddLine(pos, vec2(stringPointsX.x, stringPointsY.x), vec2(stringPointsX.y, stringPointsY.y), lineAttenuation, col);
	AddLine(pos, vec2(stringPointsX.x, stringPointsY.x), vec2(stringPointsX.z, stringPointsY.z), lineAttenuation*3.0, col);

	AddPoint(pos, vec2(stringPointsX.y, stringPointsY.y), pointAttenuation, col);
	AddLine(pos, vec2(stringPointsX.y, stringPointsY.y), vec2(stringPointsX.z, stringPointsY.z), lineAttenuation, col);
	AddLine(pos, vec2(stringPointsX.y, stringPointsY.y), vec2(stringPointsX.w, stringPointsY.w), lineAttenuation * 3.0, col);

	AddPoint(pos, vec2(stringPointsX.z, stringPointsY.z), pointAttenuation, col);
	AddLine(pos, vec2(stringPointsX.z, stringPointsY.z), vec2(stringPointsX.w, stringPointsY.w), lineAttenuation, col);

	AddPoint(pos, vec2(stringPointsX.w, stringPointsY.w), pointAttenuation, col);
}

void main()
{
	vec2 pos = vec2 (gl_FragCoord.xy / resolution.xy) * 2.0 - 1.0;
	float c = 0.0;

    float lineAttenuation = 100.0;
    float pointAttenuation = 50.0;
	vec4 xPointsLeft = vec4(-0.7, -0.5, -0.3, -0.1);
	vec4 xPointsRight = vec4(0.1, 0.3, 0.5, 0.7);

	AddString(pos, xPointsLeft, yPointsLeft, pointAttenuation, lineAttenuation, c);
	AddLine(pos, vec2(xPointsLeft.z, yPointsLeft.z), vec2(xPointsRight.x, yPointsRight.x), lineAttenuation * 3.0, c);
	AddLine(pos, vec2(xPointsLeft.w, yPointsLeft.w), vec2(xPointsRight.x, yPointsRight.x), lineAttenuation, c);
	AddLine(pos, vec2(xPointsLeft.w, yPointsLeft.w), vec2(xPointsRight.y, yPointsRight.y), lineAttenuation * 3.0, c);

	AddString(pos, xPointsRight, yPointsRight, pointAttenuation, lineAttenuation, c);



    vec3 col = vec3(c);
    vec3 green = vec3 (0.3, 0.5, 0.4);
    vec3 blue = vec3 (0.3, 0.48, 0.7);
    // 0 - 1 between -0.7 - 0.7 (the two edge circles).
    float normedPos = clamp((pos.x + 0.7) / 1.4, 0.0, 1.0);
    vec3 tint = (1.0 - normedPos) * green + normedPos * blue;
    col *= tint;
	gl_FragColor = vec4 (col, 1.0);
}