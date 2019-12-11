precision highp float;
uniform float3 Colour;


void main()
{
	gl_FragColor = float4( Colour, 1 );
	//gl_FragColor = float4( FragLocalPosition, 1 );
}


