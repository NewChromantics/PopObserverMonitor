Pop.Include = function(Filename)
{
	let Source = Pop.LoadFileAsString(Filename);
	return Pop.CompileAndRun( Source, Filename );
}

//	auto setup global
function SetGlobal()
{
	Pop.Global = this;
	Pop.Debug(Pop.Global);
}
SetGlobal.call(this);


const GeoTextureShader = RegisterShaderAssetFilename('Texture.frag.glsl','Geo.vert.glsl');
const GeoColourShader = RegisterShaderAssetFilename('Colour.frag.glsl','Geo.vert.glsl');
const CameraFrustumShader = RegisterShaderAssetFilename('CameraFrustum.frag.glsl','Geo.vert.glsl');
const QuadTextureShader = RegisterShaderAssetFilename('Texture.frag.glsl','Quad.vert.glsl');
const SceneFilename = 'Assets/parallax_test_02.obj';
const SceneTextureFilename = '2cats.png';

Pop.AsyncCacheAssetAsString('Texture.frag.glsl');
Pop.AsyncCacheAssetAsString('Colour.frag.glsl');
Pop.AsyncCacheAssetAsString('Geo.vert.glsl');
Pop.AsyncCacheAssetAsString('Quad.vert.glsl');
Pop.AsyncCacheAssetAsString('CameraFrustum.frag.glsl');
Pop.AsyncCacheAssetAsImage(SceneTextureFilename);
Pop.AsyncCacheAssetAsString(SceneFilename);


let MirrorImage = null;
let MirrorCamera = new Pop.Camera();	//	camera calculated from poses


var Params = {};
function OnParamsChanged()
{
	
}
Params.Fov = 52;
Params.GeoColour = [0,0,1];
Params.CameraColour = [0,1,0];
Params.BackgroundColour = [0,0,0];
Params.GeoColour = [1,0,1];
Params.GeoScale = 0.1;
Params.SceneScale = 0.1;
Params.GeoYaw = 90;
Params.GeoX = 0;
Params.GeoY = -2;
Params.GeoZ = 0;
Params.RenderScene = false;

Params.MirrorFov = 50;
Params.MirrorFar = 10;
Params.MirrorNear = 0.1;

const ParamsWindowRect = [1200,20,350,200];
var ParamsWindow = new CreateParamsWindow(Params,OnParamsChanged,ParamsWindowRect);

ParamsWindow.AddParam('MirrorFov',10,90);
ParamsWindow.AddParam('MirrorFar',0.001,100);
ParamsWindow.AddParam('MirrorNear',0.001,100);


ParamsWindow.AddParam('Fov',10,90);
ParamsWindow.AddParam('GeoColour','Colour');
ParamsWindow.AddParam('CameraColour','Colour');
ParamsWindow.AddParam('BackgroundColour','Colour');
ParamsWindow.AddParam('GeoScale',0.001,10);
ParamsWindow.AddParam('SceneScale',0.001,10);
ParamsWindow.AddParam('RenderScene');
ParamsWindow.AddParam('GeoX',-10,10);
ParamsWindow.AddParam('GeoY',-10,10);
ParamsWindow.AddParam('GeoZ',-10,10);
ParamsWindow.AddParam('GeoYaw',-180,180);


let LastPoses = [];

class TMoonApp
{
	constructor()
	{
		this.Camera = new Pop.Camera();
		//this.Camera.LookAt = [71.5,-5,-30.3];
		//this.Camera.Position = [69.8,3.35,-48.7];

	}
}


const RandomNumberCache = [];

function GetRandomNumberArray(Count)
{
	if ( RandomNumberCache.length < Count )
		Pop.Debug("calculating random numbers x"+Count);
	while ( RandomNumberCache.length < Count )
	{
		RandomNumberCache.push( Math.random() );
	}
	return RandomNumberCache;
}


function CreateRandomSphereImage(Width,Height)
{
	let Channels = 4;
	let Format = 'Float4';
	
	const TimerStart = Pop.GetTimeNowMs();
	
	let Pixels = new Float32Array( Width * Height * Channels );
	const Rands = GetRandomNumberArray(Pixels.length*Channels);
	for ( let i=0;	i<Pixels.length;	i+=Channels )
	{
		let xyz = Rands.slice( i*Channels, (i*Channels)+Channels );
		let w = xyz[3];
		xyz = Math.Subtract3( xyz, [0.5,0.5,0.5] );
		xyz = Math.Normalise3( xyz );
		xyz = Math.Add3( xyz, [1,1,1] );
		xyz = Math.Multiply3( xyz, [0.5,0.5,0.5] );
		
		Pixels[i+0] = xyz[0];
		Pixels[i+1] = xyz[1];
		Pixels[i+2] = xyz[2];
		Pixels[i+3] = w;
	}
	
	Pop.Debug("CreateRandomSphereImage() took", Pop.GetTimeNowMs() - TimerStart);
	
	let Texture = new Pop.Image();
	Texture.WritePixels( Width, Height, Pixels, Format );
	return Texture;
}

const MoonApp = new TMoonApp();
//let MoonHeightmap = CreateRandomSphereImage(32,32);
//op.AsyncCacheAssetAsString('Quad.vert.glsl');
let SceneTexture = null;



var SceneGeos;
function GetSceneGeos(RenderTarget)
{
	if ( SceneGeos )
		return SceneGeos;
	
		function OnGeometry(Geometry)
	{
		if ( !SceneGeos )
			SceneGeos = [];
		
		if ( !Geometry.Positions || !Geometry.Positions.length )
		{
			Pop.Debug("Skipping empty geometry" + Geometry.Name, Geometry );
			return;
		}
		
		Pop.Debug("Geo " + Geometry.Name);
		
		//	convert to triangle buffer
		const VertexAttribs = [];
		
		const LocalPos = {};
		LocalPos.Size = 3;
		LocalPos.Data = new Float32Array( Geometry.Positions );
		VertexAttribs['LocalPosition'] = LocalPos;
		
		if ( Geometry.TexCoords )
		{
			const Uv0 = {};
			Uv0.Size = 3;
			Uv0.Data = new Float32Array( Geometry.TexCoords );
			VertexAttribs['LocalUv'] = Uv0;
		}
		
		//const TriangleIndexes = new Int32Array( Geometry.TriangleIndexes );
		const TriangleIndexes = undefined;
		const TriangleBuffer = new Pop.Opengl.TriangleBuffer( RenderTarget, VertexAttribs, TriangleIndexes );
		
		TriangleBuffer.Name = Geometry.Name;
		
		SceneGeos.push( TriangleBuffer );
	}
	const Contents = Pop.LoadFileAsString( SceneFilename );
	Pop.Obj.ParseGeometry( Contents, OnGeometry );
	
	Pop.Debug( SceneFilename + " parsed " + SceneGeos.length + " objects");
	return SceneGeos;
}


function RenderScene(RenderTarget)
{
	const Camera = MoonApp.Camera;
	if ( !SceneTexture )
	{
		SceneTexture = new Pop.Image(SceneTextureFilename);
	}
	
	const Geos = GetSceneGeos( RenderTarget );
	const Position = [Params.GeoX,Params.GeoY,Params.GeoZ];
	const Scale = Params.SceneScale;
	const Colour = Params.GeoColour;
	
	const RotationTransform = Math.CreateAxisRotationMatrix( [0,1,0], Params.GeoYaw );
	
	const Shader = GetAsset( GeoTextureShader, RenderTarget );
	const LocalToWorldTransform = Math.MatrixMultiply4x4( RotationTransform, Math.CreateTranslationScaleMatrix( Position, [Scale,Scale,Scale] ) );
	
	const WorldToCameraTransform = Camera.GetWorldToCameraMatrix();
	const ViewRect = RenderTarget.GetRenderTargetRect();//[-1,-1,1,1];
	const CameraProjectionTransform = Camera.GetProjectionMatrix(ViewRect);
	
	function SetUniforms(Shader)
	{
		Shader.SetUniform('LocalToWorldTransform',LocalToWorldTransform);
		Shader.SetUniform('WorldToCameraTransform',WorldToCameraTransform);
		Shader.SetUniform('CameraProjectionTransform',CameraProjectionTransform);
		Shader.SetUniform('Colour',Colour);
		Shader.SetUniform('Texture',SceneTexture);
	}
	function RenderGeo(Geo)
	{
		RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
	}
	Geos.forEach( RenderGeo );
	
}

function RenderPoses(RenderTarget,Poses,Camera)
{
	const Geo = GetAsset( 'Cube', RenderTarget );
	const Colour = Params.GeoColour;
	
	const Shader = GetAsset( GeoColourShader, RenderTarget );
	
	const WorldToCameraTransform = Camera.GetWorldToCameraMatrix();
	const ViewRect = RenderTarget.GetRenderTargetRect();//[-1,-1,1,1];
	const CameraProjectionTransform = Camera.GetProjectionMatrix(ViewRect);
	
	function RenderPose(Pose)
	{
		const PoseMatrix = Pose.LocalToWorld;
		//const PoseMatrix = Math.CreateTranslationMatrix(0,0,0);
		const ScaleMatrix = Math.CreateScaleMatrix( Params.GeoScale );
		const LocalToWorldTransform = Math.MatrixMultiply4x4( PoseMatrix, ScaleMatrix );
		
		function SetUniforms(Shader)
		{
			Shader.SetUniform('LocalToWorldTransform',LocalToWorldTransform);
			Shader.SetUniform('WorldToCameraTransform',WorldToCameraTransform);
			Shader.SetUniform('CameraProjectionTransform',CameraProjectionTransform);
			Shader.SetUniform('Colour',Colour);
		}
		RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
	}
	
	Poses.forEach( RenderPose );
}

function RenderTexture(RenderTarget,Texture,Rect)
{
	const Quad = GetAsset('Quad',RenderTarget);
	const Shader = GetAsset(QuadTextureShader,RenderTarget);
	
	function SetUniforms(Shader)
	{
		Shader.SetUniform('VertexRect', Rect);
		Shader.SetUniform('Texture', Texture);
	}
	
	RenderTarget.DrawGeometry( Quad, Shader, SetUniforms );
}

function UpdateMirrorCamera()
{
	//	grab eye pose to get position, rotation
	MirrorCamera.FovVertical = Params.MirrorFov;
	MirrorCamera.NearDistance = Params.MirrorNear;
	MirrorCamera.FarDistance = Params.MirrorFar;
	
	function MatchEyePose(Pose)
	{
		return Pose.Class == "TrackedDeviceClass_HMD";
	}
	const EyePoses = LastPoses.filter(MatchEyePose);
	if ( !EyePoses.length )
	{
		Pop.Debug("Didn't find hmd pose", JSON.stringify(LastPoses) );
		return;
	}

	const Pose = EyePoses[0];
	//	get pos, get rotation
	MirrorCamera.Position = Math.GetMatrixTranslation(Pose.LocalToWorld);
	MirrorCamera.Rotation4x4 = Pose.LocalToWorld.slice();
	//	remove pos from rotation matrix
	Math.SetMatrixTranslation( MirrorCamera.Rotation4x4, 0,0,0 );
}

function RenderCameraDebug(RenderTarget,RenderCamera,DebugCamera)
{
	const Geo = GetAsset( 'Cube', RenderTarget );
	const Colour = Params.CameraColour;
	
	const Shader = GetAsset( CameraFrustumShader, RenderTarget );
	
	const WorldToCameraTransform = RenderCamera.GetWorldToCameraMatrix();
	const ViewRect = RenderTarget.GetRenderTargetRect();//[-1,-1,1,1];
	const CameraProjectionTransform = RenderCamera.GetProjectionMatrix(ViewRect);
	
	const DebugViewRect = [-1,-1,1,1];
	const LocalToWorldTransform = DebugCamera.GetLocalToWorldFrustumTransformMatrix(DebugViewRect);
	
	function SetUniforms(Shader)
	{
		Shader.SetUniform('LocalToWorldTransform',LocalToWorldTransform);
		Shader.SetUniform('WorldToCameraTransform',WorldToCameraTransform);
		Shader.SetUniform('CameraProjectionTransform',CameraProjectionTransform);
		Shader.SetUniform('Colour',Colour);
	}
	RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
}

function RenderMirrorView(RenderTarget,Camera)
{
	//	render the mirror frustum
	RenderCameraDebug( RenderTarget, Camera, MirrorCamera );
	
	//	render some geo and project the mirror camera onto it
	RenderProjection( RenderTarget, Camera, MirrorCamera );
}

function RenderProjection(RenderTarget,RenderCamera,DebugCamera)
{
	//	render a cube around the camera,
	//	and use a shader which sample the projected texture
	const Geo = GetAsset( 'Cube', RenderTarget );
	
	const Shader = GetAsset( ProjectionShader, RenderTarget );
	
	const WorldToCameraTransform = RenderCamera.GetWorldToCameraMatrix();
	const ViewRect = RenderTarget.GetRenderTargetRect();//[-1,-1,1,1];
	const CameraProjectionTransform = RenderCamera.GetProjectionMatrix(ViewRect);
	
	const DebugViewRect = [-1,-1,1,1];
	const LocalToWorldTransform = DebugCamera.GetLocalToWorldFrustumTransformMatrix(DebugViewRect);
	
	function SetUniforms(Shader)
	{
		Shader.SetUniform('LocalToWorldTransform',LocalToWorldTransform);
		Shader.SetUniform('WorldToCameraTransform',WorldToCameraTransform);
		Shader.SetUniform('CameraProjectionTransform',CameraProjectionTransform);
		Shader.SetUniform('Colour',Colour);
	}
	RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
}


function Render(RenderTarget)
{
	RenderTarget.ClearColour( ...Params.BackgroundColour );
	
	
	//	clear to frame
	if ( MirrorImage )
	{
		RenderTexture( RenderTarget, MirrorImage, [0,0,1,1] );
		RenderTarget.ClearDepth();
	}
	
	
	let MoonColour = SceneTexture;
	
	const Camera = MoonApp.Camera;
	Camera.FovVertical = Params.Fov;

	if ( Params.RenderScene )
		RenderScene( RenderTarget );
	
	RenderPoses( RenderTarget, LastPoses, Camera );
	
	//	render the mirror sphere
	UpdateMirrorCamera();
	RenderMirrorView( RenderTarget, Camera );
	
	/*
	
	
	
	
	const Quad = GetAsset('Quad',RenderTarget);
	const Shader = GetAsset(RenderGeoShader,RenderTarget);
	const WorldToCameraMatrix = Camera.GetWorldToCameraMatrix();
	const CameraProjectionMatrix = Camera.GetProjectionMatrix( RenderTarget.GetScreenRect() );
	const ScreenToCameraTransform = Math.MatrixInverse4x4( CameraProjectionMatrix );
	const CameraToWorldTransform = Math.MatrixInverse4x4( WorldToCameraMatrix );
	const LocalToWorldTransform = Camera.GetLocalToWorldFrustumTransformMatrix();
	//const LocalToWorldTransform = Math.CreateIdentityMatrix();
	const WorldToLocalTransform = Math.MatrixInverse4x4(LocalToWorldTransform);
	//Pop.Debug("Camera frustum LocalToWorldTransform",LocalToWorldTransform);
	//Pop.Debug("Camera frustum WorldToLocalTransform",WorldToLocalTransform);
	const SetUniforms = function(Shader)
	{
		Shader.SetUniform('VertexRect',[0,0,1,1.0]);
		Shader.SetUniform('ScreenToCameraTransform',ScreenToCameraTransform);
		Shader.SetUniform('CameraToWorldTransform',CameraToWorldTransform);
		Shader.SetUniform('LocalToWorldTransform',LocalToWorldTransform);
		Shader.SetUniform('WorldToLocalTransform',WorldToLocalTransform);
		Shader.SetUniform('HeightmapTexture',MoonHeightmap);
		Shader.SetUniform('ColourTexture',MoonColour);
		
		function SetUniform(Key)
		{
			Shader.SetUniform( Key, Params[Key] );
		}
		Object.keys(Params).forEach(SetUniform);
	}
	//RenderTarget.EnableBlend(true);
	RenderTarget.DrawGeometry( Quad, Shader, SetUniforms );
*/
}


//	window now shared from bootup
const Window = new Pop.Opengl.Window("Lunar");

const FpsCounter = new Pop.FrameCounter("fps");
const PoseCounter = new Pop.FrameCounter("Poses");
const MirrorCounter = new Pop.FrameCounter("Mirror");
const MirrorKb = new Pop.FrameCounter("Mirror Kb");

Window.OnRender = function(RenderTarget)
{
	try
	{
		Render(RenderTarget);
		FpsCounter.Add();
	}
	catch(e)
	{
		console.warn(e);
	}
}

MoveCamera = function(x,y,Button,FirstDown)
{
	const Camera = MoonApp.Camera;
	
	//if ( Button == 0 )
	//	this.Camera.OnCameraPan( x, 0, y, FirstDown );
	if ( Button == 0 )
		Camera.OnCameraOrbit( x, y, 0, FirstDown );
	
	if ( Button == 2 )
		Camera.OnCameraPanLocal( x, y, 0, FirstDown );
	if ( Button == 1 )
		Camera.OnCameraPanLocal( x, 0, y, FirstDown );
}

Window.OnMouseDown = function(x,y,Button)
{
	MoveCamera( x,y,Button,true );
}

Window.OnMouseMove = function(x,y,Button)
{
	MoveCamera( x,y,Button,false );
}

Window.OnMouseScroll = function(x,y,Button,Delta)
{
	let Fly = Delta[1] * 50;
	//Fly *= Params.ScrollFlySpeed;

	const Camera = MoonApp.Camera;
	Camera.OnCameraPanLocal( 0, 0, 0, true );
	Camera.OnCameraPanLocal( 0, 0, Fly, false );
}


function OnExposeImage(Message)
{
	//	work out if it's H264, or png etc
	//	lets assume png for now
	if ( !MirrorImage )
	{
		MirrorImage = new Pop.Image();
	}
	MirrorKb.Add(Message.length);
	
	function OnWrittenImage()
	{
		MirrorCounter.Add();
	}
	MirrorImage.LoadPng(Message).then(OnWrittenImage);
}

function OnExposeMessage(Message)
{
	//	handle binary messages (images)
	if ( Message instanceof Uint8Array )
	{
		OnExposeImage(Message);
		return;
	}
	
	const PoseStates = JSON.parse(Message);
	PoseCounter.Add();
	
	const Poses = PoseStates.Devices;
	//Pop.Debug( "OnExposeMessage", Poses );
	
	LastPoses = Poses;
}

function GetWelcomeMessage()
{
	const Welcome = {};
	Welcome.Message = "Hello!";
	return JSON.stringify(Welcome);
}

const ServerHostnames = ['192.168.0.27','desktop-ln26a9s.local','localhost'];
const ServerPorts = [9002,9002,9003,9001];

async function SocketLoop(ServerAddress,OnMessage,GetWelcomeMessage)
{
	Pop.Debug("Connecting to " + ServerAddress + "...");
	const Socket = await Pop.Websocket.Connect( ServerAddress );
	
	Pop.Debug("Connected to " + ServerAddress);
	while ( true )
	{
		if ( GetWelcomeMessage )
		{
			const WelcomeMessage = GetWelcomeMessage();
			Socket.Send( WelcomeMessage );
			//	send once
			GetWelcomeMessage = null;
		}
		
		const Message = await Socket.WaitForMessage();
		OnMessage( Message );
	}
}

async function ClientLoop(OnMessage,GetWelcomeMessage)
{
	let HostnameIndex = 0;
	let PortIndex = false;	//	false++ = 0
	function GetNextAddress()
	{
		if ( PortIndex === false )
		{
			PortIndex = 0
		}
		else if ( ++PortIndex >= ServerPorts.length )
		{
			PortIndex = 0;
			HostnameIndex++;
		}
		
		if ( HostnameIndex >= ServerHostnames.length )
		{
			HostnameIndex = 0;
			PortIndex = 0;
		}
		
		const Hostname = ServerHostnames[ HostnameIndex % ServerHostnames.length ];
		const Port = ServerPorts[ PortIndex % ServerPorts.length ];
		return Hostname + ":" + Port;
	}
	
	while ( true )
	{
		const Address = GetNextAddress();
		try
		{
			await SocketLoop( Address, OnMessage, GetWelcomeMessage );
		}
		catch(e)
		{
			Pop.Debug("Error with socket client " + Address + ": " + e );
		}
		await Pop.Yield(500);
	}
}


ClientLoop( OnExposeMessage, GetWelcomeMessage ).then( Pop.Debug ).catch( Pop.Debug );

