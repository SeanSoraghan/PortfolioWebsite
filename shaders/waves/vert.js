varying vec2 vertexPosition;

void main() 
{ 
	gl_Position = projectionMatrix * modelViewMatrix * vec4 (position, 1.0); 
	vertexPosition = gl_Position.xy;
}