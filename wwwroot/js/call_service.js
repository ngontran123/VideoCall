

let peerConnection;

const signalRConnection = new signalR.HubConnectionBuilder()
.withUrl("/chatHub")
.build();



function getMessageData()
{

    const now = new Date();
const timestampSec2 = Math.floor(now.getTime() / 1000);
    const messageData = {
        "dest": "callcenter",
        "signal": "res_customer_info",
        "type_call": "video",
        "time": timestampSec2,
        "data": {
            "name": "0919386795",
            "call_id": "ios-dfdf-3bea51c7-37f3-4b99-aae4-c800710e5f34-1729160226000",
            "sip_call_id": "092805fa-0f34-4067-af8b-bc8291613260",
            "data_options": {
                "msisdn": "0919386795",
                "request_id": "dfaa71cb-6bd0-4449-feefe484-584488"
            }
        }
    };

    return messageData;
}


const agg="ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8d-c2722ab60458";
const j = {
    sipml: {
        impi: "ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8f-c27744ac68456" // Replace with your actual SIP identifier
    }
};



let sipStack;

let callSession;

let localStream;

let request_id='dfaa71cb-6bd0-4449-acc5-306359fb1194';

const localVideo = document.getElementById("localVideo");


const remoteVideo = document.getElementById("remoteVideo");


const status_value = document.getElementById("status");


const endCallBtn = document.getElementById("endCallBtn");


const cameraBtn = document.getElementById("cameraBtn");


const voiceBtn = document.getElementById("voiceBtn");


const ringTone = document.getElementById("ringTone");

let isCameraOn = true;


let isVoiceOn = true;

let hotline='';



function toggleCamera()
{
    // const videoTrack = localStream.getVideoTracks()[0];
    console.log('In this toggle camera');
    // var videoTrack = localStream.getVideoTracks();
    // if (!videoTrack) 
    //     {  console.log('video track is null');
    //         return;
    //     }

    if (!callSession) 
        {
            status_value.textContent = "No active call to toggle camera.";
            
            return;
        }

isCameraOn=!isCameraOn;


// if (videoTrack.length > 0) 
// {
//     videoTrack.forEach(track => {
//       track.enabled = isCameraOn; 
//     });
// }

   
 
    if(callSession)
    { 
        localStream = callSession.o_session.o_stream_local;
        videoTrack = localStream.getVideoTracks();
        if (videoTrack.length > 0) 
{    console.log('video track is not null during call session');
    videoTrack.forEach(track => {
      track.enabled = isCameraOn; 
    });
}
    }


    videoTrack.enabled = isCameraOn;

    cameraBtn.classList.toggle('off',!isCameraOn);

    cameraBtn.innerHTML = isCameraOn 
        ? '<i class="bi bi-camera-video-fill me-1"></i> Camera' 
        : '<i class="bi bi-camera-video-off-fill me-1"></i> Camera';
    status_value.textContent = `Camera ${isCameraOn ? "on" : "off"}`;
}

function toggleVoice()
{

    // if(!callSession)
    // {
    //     status_value.textContent = "No active call to toggle voice.";

    //     return;
    // }

    // var audioTrack = localStream.getAudioTracks()[0];    

    // if(!audioTrack) return;
    if (!callSession) 
        {
            status_value.textContent = "No active call to toggle voice.";
            
            return;
        }

    isVoiceOn=!isVoiceOn;

    // audioTrack.enabled=isVoiceOn;

    if(callSession)
    {   
        localStream=callSession.o_session.o_stream_local;
        audioTrack=localStream.getAudioTracks();
        if(audioTrack.length>0)
        {  console.log('audio track is not null during call session');
            audioTrack.forEach(track=>
            {
                track.enabled=isVoiceOn;
            });
        }
    }

    voiceBtn.classList.toggle("off", !isVoiceOn);

    voiceBtn.innerHTML = isVoiceOn 
        ? '<i class="bi bi-mic-fill me-1"></i> Voice' 
        : '<i class="bi bi-mic-mute-fill me-1"></i> Voice';

    status_value.textContent = `Voice ${isVoiceOn ? "on" : "off"}`;    

}

async function initializeSipClient() 
{   
    if (typeof SIPml === "undefined") 
    {
        status_value.textContent = "SIPml5 library not loaded!";
        console.error("SIPml5 is not defined. Check script loading.");
        return;
    }

    // try 
    // {
    //     localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: false });
    //     localVideo.srcObject = localStream;
    //     status_value.textContent = "Camera preview enabled";
    // } catch (err) 
    // {
    //     status_value.textContent = "Failed to access camera: " + err.message;
    //     console.error(err);
    //     return;
    // }

//    await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//     .then(stream => console.log("Permissions granted"))
//     .catch(error => console.error("Permission denied:", error));


    endCallBtn.disabled=false;
    cameraBtn.disabled=false;
    voiceBtn.disabled=false;
    var entry_point='https://portal-ccbs.mobimart.xyz/api/get-data';
    var data_hash='eyJpdiI6IjQ0QmFhMG9KcGZ5emdhOW0rcjdYWVE9PSIsInZhbHVlIjoibENLK0V3SXFJODVPYjloREZRVDB6UT09IiwibWFjIjoiNTJjN2EwMmYzMjEwMjA5YjRiMThmOWMxMDVhNGYyYmE2ZDEwZmNmZjAxOGI4NjZlMzkyMDRmMjIwYWY3ZTI3ZiIsInRhZyI6IiJ9';
    var data=
    {
        'data':data_hash
    };
    
    var response=await postData(entry_point,data)
        var data=response.data;
        var message = response.message;
        var data_obj=data.data;

        sipStack = new SIPml.Stack({
            realm: data_obj.realm,
            impi: data_obj.impi,
            impu: data_obj.impu,
            password: data_obj.password,
            display_name: data_obj.display_name,
            websocket_proxy_url: data_obj.websocket_server_url,
            outbound_proxy_url: null,
            ice_servers: null,
            enable_rtcweb_breaker: false,
            events_listener: { events: "*", listener: onSipEventStack },
            enable_early_ims: true,
            enable_media_stream_cache: false,
            bandwidth:{audio:null,video:null},
            // video_size:{minWidth:640,minHeight:480,maxWidth:1280,maxHeight:720},
            sip_headers: [{ name: "User-Agent", value: "IM-client/OMA1.0 sipML5-v1.2016.03.04" },{name:"Organization",value:"VNPT-IT"}]
        });

        hotline=data_obj.hotline;


    const mqttClient = new MQTTClient(data_obj.call_id,data_obj.sip_call_id,data_obj.request_id,data_obj.phone);

    mqttClient.connect();

   setTimeout(()=>{
    mqttClient.subscribe(`UCC/VCall/${data_obj.call_id}`);
},2000);



// mqttClient.setMessageCallback((message) => 
    {
//     console.log('Received message:', message);
//     console.log('Topic:', message.topic);
//     console.log('Data:', message.data);
//     const now = new Date();
// const timestampSec2 = Math.floor(now.getTime() / 1000);
//     const messageData = {
//         "dest": "callcenter",
//         "signal": "ping/pong",
//         "type_call": "video",
//         "time": timestampSec2,
//         "data": {
//             "name": "0919262555",
//             "call_id": "ios-dfdf-3bea51c7-37f3-4b99-aae4-c800710e5f34-1729160226000",
//             "sip_call_id": "092805fa-0f34-4067-af8b-bc8291613260",
//             "data_options": {
//                 "msisdn": "0919262555",
//                 "request_id": "dfaa71cb-6bd0-4449-acc5-306359fb1194"
//             }
//         }
//     };

//     const encodedResult = mqttClient.sendMessage(messageData, j);
//     });

    // sipStack = new SIPml.Stack({
    //     realm: "vcc.vnpt.vn",
    //     impi: "ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8d-c2722ab60458",
    //     impu: "sip:ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8d-c2722ab60458@vcc.vnpt.vn:5060",
    //     password: "Anb07vl2YGy5BpQH",
    //     display_name: "vttnttuyen15_vtag",
    //     websocket_proxy_url: "wss://vcc.vnpt.vn:4443/ws",
    //     outbound_proxy_url: null,
    //     ice_servers: null,
    //     enable_rtcweb_breaker: false,
    //     events_listener: { events: "*", listener: onSipEventStack },
    //     enable_early_ims: true,
    //     enable_media_stream_cache: false,
    //     bandwidth: null,
    //     video_size: null,
    //     sip_headers: [{ name: "User-Agent", value: "dart-sip-ua v0.2.2" }]
    // });



    sipStack.start();
    
    status_value.textContent = "SIP client initialized here";

}
}

function onSipEventStack(e) 
{
    console.log("SIP Event:",e.type);
    switch (e.type) 
    {   
        case "started": 
            status_value.textContent = "SIP client started"; 
            break;
        case "failed_to_start": 
            status_value.textContent = "SIP client failed: " + e.description; 
            break;
    }
}



function initializeWebRTC(localVideoId, remoteVideoId) 
{
    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl("/chatHub")
        .build();

    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }] 
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            document.getElementById(localVideoId).srcObject = stream;
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        })
        .catch(err => console.error("Media error:", err));

    peerConnection.ontrack = (event) => 
    {
        document.getElementById(remoteVideoId).srcObject = event.streams[0];
        
    };

    peerConnection.onicecandidate = (event) => 
    {
        if (event.candidate) 
        {
            signalRConnection.invoke("SendIceCandidate", "vnpt-endpoint", JSON.stringify(event.candidate));
        }
    };

    signalRConnection.on("ReceiveOffer", async (senderId, sdpOffer) => {
        await peerConnection.setRemoteDescription(JSON.parse(sdpOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalRConnection.invoke("SendAnswer", senderId, JSON.stringify(answer));
    });

    signalRConnection.on("ReceiveAnswer", async (senderId, sdpAnswer) => {
        await peerConnection.setRemoteDescription(JSON.parse(sdpAnswer));
    });

    signalRConnection.on("ReceiveIceCandidate", async (senderId, candidate) => {
        await peerConnection.addIceCandidate(JSON.parse(candidate));
    });

    signalRConnection.on("CallInitiated", (message) => {
        console.log(message);
    });

    signalRConnection.start().then(() => console.log("SignalR Connected"));
}

async function startCall(hotline) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalRConnection.invoke("SendOffer", "vnpt-endpoint", JSON.stringify(offer));
    signalRConnection.invoke("InitiateCall", hotline); 
}

function startRingTone()
{
    try{
  ringTone.play();
    }
    catch(e)
    {
        console.log('Play ringtone exception:'+e);
    }
}

function stopRingTone()
{
    try
    {
    ringTone.pause();
    }
    catch(e)
    {
        console.log('Stop playing ringtone',e);
    }
}


async function onSipEventSession(e) 
{  console.log("SIP Event Session:",e.type);

    var entry_point='https://portal-ccbs.mobimart.xyz/api/update-status';
    
    var data_hash='eyJpdiI6IjQ0QmFhMG9KcGZ5emdhOW0rcjdYWVE9PSIsInZhbHVlIjoibENLK0V3SXFJODVPYjloREZRVDB6UT09IiwibWFjIjoiNTJjN2EwMmYzMjEwMjA5YjRiMThmOWMxMDVhNGYyYmE2ZDEwZmNmZjAxOGI4NjZlMzkyMDRmMjIwYWY3ZTI3ZiIsInRhZyI6IiJ9';

    switch (e.type) 
    {
    
        case "connecting":
            status_value.textContent = "Call connecting...";
            startRingTone();
            var data={
                'data':data_hash,
                'status_call':"Connecting"
            };
            await postData(entry_point,data);
            break;
        case "connected": 
        stopRingTone();
        status_value.textContent = "Call connected!"; 
            endCallBtn.disabled = false;
            cameraBtn.disabled = false;
            voiceBtn.disabled = false;

            var data={
                'data':data_hash,
                'status_call':"Connected"
            };
            await postData(entry_point,data);
           
    //         document.getElementById("remoteVideo").srcObject = e.session.getRemoteStreams()[0];
    // document.getElementById("remoteAudio").srcObject = e.session.getRemoteStreams()[0];
            // var data_obj={status:'Connected',message:'Call is connected'};
            // await postData('/create-call',data_obj);
            break;
        case "terminated": 
        stopRingTone();
        status_value.textContent = "Call ended"; 
            // endCallBtn.disabled = true;
            // cameraBtn.disabled = true;
            // voiceBtn.disabled = true;
            cameraBtn.classList.remove("off");
            voiceBtn.classList.remove("off");
            isCameraOn = true;
            isVoiceOn = true;
            callSession = null;
            var data={
                'data':data_hash,
                'status_call':"Terminated"
            };
            await postData(entry_point,data);
          
            break;
        case "i_ao_request":
            console.log("Is in out request");
            if (e.getSipResponseCode() === 180) status_value.textContent = "Ringing...";
            break;
        case "m_stream_video_local_added":
            console.log("Local Stream Added");
            break;
        case "m_stream_video_remote_added":
            console.log("Remote Stream Added");
            const remoteVideoElement = document.getElementById("remoteVideo");
console.log("Remote Video Element:", remoteVideoElement);
console.log("Assigned Stream:", remoteVideoElement ? remoteVideoElement.srcObject : "No srcObject assigned");
console.log("event video value",e);
            break;
        case "m_stream_audio_local_added":
            console.log("Local Audio Stream Added");
            break;
        case "m_stream_audio_remote_added":
            console.log("Remote Audio Stream Added");
            const remoteAudioElement = document.getElementById("remoteAudio");
            remoteAudioElement.play().catch(error => {
                console.error('Error playing audio:', error);
              });
console.log("Remote Audio Element:", remoteAudioElement);
console.log("Assigned Stream:", remoteAudioElement ? remoteAudioElement.srcObject : "No srcObject assigned");
console.log("here");
console.log("event value",e);
            break;
        default:
            console.log("Other Stream Event:",e.type);
            break;
    }
}
function startSipCall() 
{
    // const hotline = document.getElementById("hotline").value;
    
    
    if(!hotline) 
    {
        status_value.textContent = "Hotline is empty";
        
        return;
    }

  

    status_value.textContent = `Calling ${hotline}...`;
     
    localVideo.muted = true;    

    callSession = sipStack.newSession("call-audiovideo", 
    {   
        video_local:  document.getElementById("localVideo"),
        video_remote: document.getElementById("remoteVideo"),
        audio_remote: document.getElementById("remoteAudio"),
        bandwidth: { audio:null, video:null},
        //video_size:{minWidth:640,minHeight:480,maxWidth:5000,maxHeight:4000},
        events_listener: 
        { 
            events: "*", 
            listener:onSipEventSession
        },
        sip_caps:[{name:"+g.oma.sip-im"},{name:"language",value:"'en,fr'"}]
    });

    callSession.call(hotline);

    // const encodedResult = mqttClient.sendMessage(getMessageData(), j);
    // if (encodedResult) {
    //     console.log("Encoded data sent:", encodedResult);
    // }
    

    // signalRConnection.invoke("InitiateCall", hotline)
    //     .catch(err => console.error("SignalR error:", err));
}

function endCall() 
{
    if (callSession) 
    {
        callSession.hangup();
        endCallBtn.disabled = true;
        callSession = null;
    }
}

async function postData(entry_point,data)
{ 
  var response =await axios.post(entry_point,data);
  return response;
}

// window.startVideoCall = (hotline) => {
//     startCall(hotline);
// };

window.onload=()=>
{
    initializeSipClient();
};

// window.initializeWebRTC = () => initializeSipClient();

// window.startVideoCall = (hotline) => startSipCall(hotline);