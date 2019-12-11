var Assets = {};
var AssetFetchFunctions = {};


AssetFetchFunctions['Quad'] = GetQuadGeometry;
AssetFetchFunctions['Cube'] = CreateCubeGeometry;


//	for shaders (later more files?) multiple-filenames => asset name need to be identifiable/split/joined but we
//	need to distinguish them from valid filename chars. Not much in unix/osx is invalid...
const AssetFilenameJoinString = ':';

function OnAssetChanged()
{
	
}


function GetAsset(Name,RenderContext)
{
	let ContextKey = GetUniqueHash( RenderContext );
	if ( !Assets.hasOwnProperty(ContextKey) )
		Assets[ContextKey] = {};
	
	let ContextAssets = Assets[ContextKey];
	
	if ( ContextAssets.hasOwnProperty(Name) )
		return ContextAssets[Name];
	
	if ( !AssetFetchFunctions.hasOwnProperty(Name) )
		throw "No known asset named "+ Name;
	
	Pop.Debug("Generating asset "+Name+"...");
	const Timer_Start = Pop.GetTimeNowMs();
	ContextAssets[Name] = AssetFetchFunctions[Name]( RenderContext );
	const Timer_Duration = Math.floor(Pop.GetTimeNowMs() - Timer_Start);
	Pop.Debug("Generating asset "+Name+" took "+Timer_Duration + "ms");
	OnAssetChanged( Name );
	return ContextAssets[Name];
}


//	this returns the "asset name"
function RegisterShaderAssetFilename(FragFilename,VertFilename)
{
	function LoadAndCompileShader(RenderContext)
	{
		const FragShaderContents = Pop.LoadFileAsString(FragFilename);
		const VertShaderContents = Pop.LoadFileAsString(VertFilename);
		const Shader = Pop.GetShader( RenderContext, FragShaderContents, VertShaderContents );
		return Shader;
	}
	
	//	we use / as its not a valid filename char
	const AssetName = FragFilename+AssetFilenameJoinString+VertFilename;
	if ( AssetFetchFunctions.hasOwnProperty(AssetName) )
		throw "Shader asset name clash, need to change the name we use";
	AssetFetchFunctions[AssetName] = LoadAndCompileShader;
	return AssetName;
}



function GetQuadGeometry(RenderTarget)
{
	let VertexSize = 2;
	let l = 0;
	let t = 0;
	let r = 1;
	let b = 1;
	//let VertexData = [	l,t,	r,t,	r,b,	l,b	];
	let VertexData = [	l,t,	r,t,	r,b,	r,b, l,b, l,t	];
	let TriangleIndexes = [0,1,2,	2,3,0];
	
	const VertexAttributeName = "TexCoord";
	
	//	emulate webgl on desktop
	TriangleIndexes = undefined;
	
	let QuadGeometry = new Pop.Opengl.TriangleBuffer( RenderTarget, VertexAttributeName, VertexData, VertexSize, TriangleIndexes );
	return QuadGeometry;
}





function CreateCubeGeometry(RenderTarget)
{
	let VertexSize = 3;
	let VertexData = [];
	let TriangleIndexes = [];
	
	let AddTriangle = function(a,b,c)
	{
		let FirstTriangleIndex = VertexData.length / VertexSize;
		
		a.forEach( v => VertexData.push(v) );
		b.forEach( v => VertexData.push(v) );
		c.forEach( v => VertexData.push(v) );
		
		TriangleIndexes.push( FirstTriangleIndex+0 );
		TriangleIndexes.push( FirstTriangleIndex+1 );
		TriangleIndexes.push( FirstTriangleIndex+2 );
	}
	
	let tln = [-1,-1,-1];
	let trn = [ 1,-1,-1];
	let brn = [ 1, 1,-1];
	let bln = [-1, 1,-1];
	let tlf = [-1,-1, 1];
	let trf = [ 1,-1, 1];
	let brf = [ 1, 1, 1];
	let blf = [-1, 1, 1];
	
	
	//	near
	AddTriangle( tln, trn, brn );
	AddTriangle( brn, bln, tln );
	//	far
	AddTriangle( trf, tlf, blf );
	AddTriangle( blf, brf, trf );
	
	//	top
	AddTriangle( tln, tlf, trf );
	AddTriangle( trf, trn, tln );
	//	bottom
	AddTriangle( bln, blf, brf );
	AddTriangle( brf, brn, bln );
	
	//	left
	AddTriangle( tlf, tln, bln );
	AddTriangle( bln, blf, tlf );
	//	right
	AddTriangle( trn, trf, brf );
	AddTriangle( brf, brn, trn );
	
	
	//	convert to triangle buffer
	const VertexAttribs = [];
	
	const LocalPos = {};
	LocalPos.Size = 3;
	LocalPos.Data = new Float32Array( VertexData );
	VertexAttribs['LocalPosition'] = LocalPos;
	
	TriangleIndexes = undefined;
	
	let TriangleBuffer = new Pop.Opengl.TriangleBuffer( RenderTarget, VertexAttribs, TriangleIndexes );
	return TriangleBuffer;
}


