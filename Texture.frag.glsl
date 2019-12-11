precision highp float;
varying float3 FragColour;
varying float3 FragLocalPosition;
uniform sampler2D CarTexture;


void main()
{
	float2 uv = fract(FragColour.xy);
	
	float4 Sample = texture2D( CarTexture, uv );
	gl_FragColor = Sample;
	//gl_FragColor = float4( FragColour, 1 );
	//gl_FragColor = float4( FragLocalPosition, 1 );
}


