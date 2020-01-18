uniform float time;

varying vec3 norm;
varying vec3 vert;
void main() 
{
	float r = sqrt (pow (position.x, 2.0) + pow (position.y, 2.0) + pow (position.z, 2.0));
	float inclination = acos (position.z / r);
	float azimuth 	  = atan (position.y / position.x);

	float rotAngle = time * 0.5;
	mat2 rotation = mat2 (cos (rotAngle*0.2), -sin(rotAngle*0.2), sin (rotAngle*0.2), cos (rotAngle*0.2));
	
	vec3 rotatedPos = vec3 (position.x, rotation * position.yz);
	vec3 rotatedNorm = vec3 (normal.x, rotation * normal.yz);

	vec2 newXZPos = rotation * rotatedPos.xz;
	vec2 newXZNorm = rotation * rotatedNorm.xz;
	rotatedPos = vec3 (newXZPos.x, rotatedPos.y, newXZPos.y);
	rotatedNorm = vec3 (newXZNorm.x, rotatedNorm.y, newXZNorm.y);

	float azimuthAmp = 10.5;
	float inclinationAmp = 10.5;
	float inclinationAmpEnv = (sin (time * 0.15) * 3.0);
	float azimuthAmpEnv = (sin (time * 0.1) * 0.5 + 0.5);
	vec3 extruded = rotatedPos + rotatedNorm * sin (azimuth * 20.0 + time * azimuth) * azimuthAmp * azimuthAmpEnv
							   + rotatedNorm * sin (inclination * 5.0 + time) * (inclinationAmp + inclinationAmpEnv); 

	norm = rotatedNorm;
	vert = extruded;

	gl_Position = projectionMatrix * modelViewMatrix * vec4 (extruded, 1.0); 
}