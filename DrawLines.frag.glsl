in vec2 uv;
uniform float		LineWidth;// = 0.013;
const float4		BackgroundColour = float4(0,0,0,0);
uniform float		ScoreMax;	//	=1

#define LINE_COUNT	100
#define	LineCount	LINE_COUNT
uniform vec4		Lines[LINE_COUNT];
uniform float		Scores[LINE_COUNT];

#define endofheader

float TimeAlongLine2(vec2 Position,vec2 Start,vec2 End)
{
	vec2 Direction = End - Start;
	float DirectionLength = length(Direction);
	float Projection = dot( Position - Start, Direction) / (DirectionLength*DirectionLength);
	
	return Projection;
}

float3 NormalToRedGreen(float Normal)
{
	if ( Normal < 0 )
	{
		return float3( 1,0,1 );
	}
	else if ( Normal < 0.5 )
	{
		Normal = Normal / 0.5;
		return float3( 1, Normal, 0 );
	}
	else if ( Normal <= 1 )
	{
		Normal = (Normal-0.5) / 0.5;
		return float3( 1-Normal, 1, 0 );
	}
	
	//	>1
	return float3( 0,0,1 );
}


vec2 NearestToLine2(vec2 Position,vec2 Start,vec2 End)
{
	float Projection = TimeAlongLine2( Position, Start, End );
	
	//	past start
	Projection = max( 0, Projection );
	//	past end
	Projection = min( 1, Projection );
	
	//	is using lerp faster than
	//	Near = Start + (Direction * Projection);
	float2 Near = mix( Start, End, Projection );
	return Near;
}

float DistanceToLine2(vec2 Position,vec2 Start,vec2 End)
{
	vec2 Near = NearestToLine2( Position, Start, End );
	return length( Near - Position );
}

float Range(float Min,float Max,float Value)
{
	return (Value-Min) / (Max-Min);
}

void main()
{
	float NearestDistance = 999;
	float Score = -1;

	for ( int a=0;	a<LINE_COUNT && a<LineCount;	a++)
	{
		vec2 Linea = Lines[a].xy;
		vec2 Lineb = Lines[a].zw;
		float Distance = DistanceToLine2( uv, Linea, Lineb );
		NearestDistance = min( NearestDistance, Distance );
		if ( Distance <= LineWidth )
			Score = max( Score, Scores[a] );
	}

	Score /= ScoreMax;
	
	if ( NearestDistance <= LineWidth )
	{
		gl_FragColor.xyz = NormalToRedGreen( Score );
		gl_FragColor.w = 1;
	}
	else
	{
		gl_FragColor = BackgroundColour;
	}
}
