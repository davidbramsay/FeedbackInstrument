var audios = [];
var audioIDs = [];
var gainState = [{'id':'audioyou', 'gain':0.2, 'mute':true}]; 
var gainObject = [];
var eqObject =[];
var delay = [];

var PeerConnection = window.PeerConnection 
    || window.webkitPeerConnection00 
    || window.webkitRTCPeerConnection 
    || window.mozRTCPeerConnection 
    || window.RTCPeerConnection;


if (!((typeof webkitAudioContext === "function")
      || (typeof AudioContext === "function")
      || (typeof webkitAudioContext === "object")
      || (typeof AudioContext === "object"))) {
  alert("Sorry! Web Audio not supported by this browser");
}
if (window.hasOwnProperty('webkitAudioContext') &&
    !window.hasOwnProperty('AudioContext')) {
    window.AudioContext = webkitAudioContext;
    window.OfflineAudioContext = webkitOfflineAudioContext;
}


function getNewAudioID(){
  var newAudioID = 1;

  while(audioIDs.filter(function(arrayObj){ return arrayObj == newAudioID })[0]){
    newAudioID++;
  }
  return newAudioID;
}

function cloneAudio(domId, socketId) {
  var audio = document.getElementById(domId);
  var clone = audio.cloneNode(false);
  var newID = getNewAudioID();
  console.log(newID);

  clone.id = "remote" + socketId;
  
  var htmlpre = '<div class="audioBox" id="audio' + newID + '">';
  $(htmlpre).appendTo("#audios");
  
  document.getElementById('audio' + newID).appendChild(clone);
  var htmlpost = '<span class="labelAudio">' + newID + '</span><div class="audioonoff">OFF</div><div class="sliderBoxRouting"><input type="range" min="0" max="1" step="0.01" data-rangeslider class="routeSlider"></div></div>';
  $(htmlpost).appendTo("#audio" + newID);
  
  initializeLoopSliders();
  initializeAudioToggles();

  $("#audio" + newID + " .routeSlider").val(0.2).change();

  audioIDs.push(newID);
  audios.push(clone);
  return clone;
}

function createAudioDiv() { //clone but without making the audio element and linking remote-id to it
  var newID = getNewAudioID();
  console.log(newID);

  var htmlpre = '<div class="audioBox" id="audio' + newID + '">';
  $(htmlpre).appendTo("#audios");
  
  var htmlpost = '<span class="labelAudio">' + newID + '</span><div class="audioonoff">OFF</div><div class="sliderBoxRouting"><input type="range" min="0" max="1" step="0.01" data-rangeslider class="routeSlider"></div></div>';
  $(htmlpost).appendTo("#audio" + newID);
  
  initializeLoopSliders();
  initializeAudioToggles();

  $("#audio" + newID + " .routeSlider").val(0.2).change();

  audioIDs.push(newID);
  return "audio" + newID;
}


function removeAudio(socketId) {
  var audio = document.getElementById('remote' + socketId);
  if(audio) {
    var ind = audios.indexOf(audio);
    audios.splice(ind, 1);
    
    audio.parentNode.removeChild(audio);
    $("#audio" + audioIDs[ind]).remove();
    
    audioIDs.splice(ind, 1);
  }
}

function addToChat(msg, color) {
  var messages = document.getElementById('messages');
  msg = sanitize(msg);
  if(color) {
    msg = '<span style="color: ' + color + '; padding-left: 15px">' + msg + '</span>';
  } else {
    msg = '<strong style="padding-left: 15px">' + msg + '</strong>';
  }
  messages.innerHTML = '>> ' + msg + '<br>' + messages.innerHTML;
  messages.scrollTop = 10000;
}

function sanitize(msg) {
  return msg.replace(/</g, '&lt;');
}

function initNewRoom() {
  var button = document.getElementById("newRoom");

  button.addEventListener('click', function(event) {

    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 8;
    var randomstring = '';
    for(var i = 0; i < string_length; i++) {
      var rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }

    window.location.hash = randomstring;
    location.reload();
  })
}


var websocketChat = {
  send: function(message) {
    rtc._socket.send(message);
  },
  recv: function(message) {
    return message;
  },
  event: 'receive_chat_msg'
};

var dataChannelChat = {
  send: function(message) {
    for(var connection in rtc.dataChannels) {
      var channel = rtc.dataChannels[connection];
      channel.send(message);
    }
  },
  recv: function(channel, message) {
    return JSON.parse(message).data;
  },
  event: 'data stream data'
};

function initChat() {
  var chat;

  if(rtc.dataChannelSupport) {
    console.log('initializing data channel chat');
    chat = dataChannelChat;
  } else {
    console.log('initializing websocket chat');
    chat = websocketChat;
  }

  var input = document.getElementById("chatinput");
  var room = window.location.hash.slice(1);
  var color = "#" + ((1 << 24) * Math.random() | 0).toString(16);

  

  input.addEventListener('keydown', function(event) {
    var key = event.which || event.keyCode;
    if(key === 13) {
      chat.send(JSON.stringify({
        "eventName": "chat_msg",
        "data": {
          "messages": input.value,
          "room": room,
          "color": color
        }
      }));
      addToChat(input.value);
      input.value = "";
    }
  }, false);

  rtc.on(chat.event, function() {
    var data = chat.recv.apply(this, arguments);
    console.log(data.color);
    addToChat(data.messages, data.color.toString(16));
  });
}



function init() {

  if(PeerConnection) {
    rtc.createStream({
      audio: {
        mandatory: 
          {
          echoCancellation: false,  
          googAutoGainControl: false, 
          googAutoGainControl2: false, 
          googEchoCancellation: false,
          googEchoCancellation2: false,
          googNoiseSuppression: false,
          googNoiseSuppression2: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false}
      },
      video: false
    }, function(stream) {
      
      //attach input stream to audio tag element
      //document.getElementById('you').src = URL.createObjectURL(stream);
      //intercept audio element and make it a source node in web audio
      //audioElement = document.getElementById('you');
      //var inputStream = context.createMediaElementSource(audioElement);
      
      var inputStream = context.createMediaStreamSource(stream);
      var tempGain = context.createGain ? context.createGain() : context.createGainNode();
      tempGain.gain.value = 0;

      inputStream.connect(tempGain);

      tempGain.connect(eqObject[0]); 
      
      gainObject.push(tempGain);
   /* 
      //route the end of the processed stream to the audio tag, to use volume/mute controls after processing
      var tempDestination = context.createMediaStreamDestination();
      delay.connect(tempDestination);
      document.getElementById('you').src = URL.createObjectURL(tempDestination.stream);
  */

    });
  } else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }


  var room = window.location.hash.slice(1);

  rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);

  rtc.on('add remote stream', function(stream, socketId) {
    console.log("ADDING REMOTE STREAM...");
    //var clone = cloneAudio('you', socketId);
    //document.getElementById(clone.id).setAttribute("class", "");
    console.log("SOCKETID:" + socketId);

    var newid = createAudioDiv();

    //rtc.attachStream(stream, clone.id);
    gainState.push({'id':newid, 'gain':0.2, 'mute':true}); 
 
    var inputStream2 = context.createMediaStreamSource(stream); 
    var tempGain = context.createGain ? context.createGain() : context.createGainNode();
    tempGain.gain.value = 0;
    inputStream2.connect(context.destination);
    //tempGain.connect(context.destination);//eqObject[0]); 
    //gainObject.push(tempGain);
    
  });

  rtc.on('disconnect stream', function(data) {
    console.log('remove ' + data);
    removeAudio(data);
  });

  initNewRoom();
  initChat();

}






initializeLoopSliders = function(){

  $(".routeSlider").each(function (e) {

    var idAudio = $(this).parent().parent().attr("id");
    console.log("parentID" + idAudio);

    $(this).rangeslider({
            polyfill:false,
            rangeClass:'rangeslider',
            fillClass:'rangeslider__fill',
            handleClass:'rangeslider__handle',

            //console.log($(this).attr("class"));

            onSlide:function( pos, val){
                //write to console
                //console.log('slider:' + $(event.target).closest(".selectable").attr("id") + ' val:' + val);
                console.log('slider ' +  idAudio + ': ' + val);
                //update oscArray Gain
                $("#" + idAudio).prop("volume",val);
                
                var index = gainState.map(function(e) { return e.id; }).indexOf(idAudio);
                console.log('index:' + index);
 

                if( index !== -1){
                  gainState[index].gain = val;
                }

                if (typeof gainObject[index] !== 'undefined' && !gainState[index].mute){
                  gainObject[index].gain.value = val;
                }
        }

    });
  });
};

initializeAudioToggles = function() {
  //on/off button
    $('.audioonoff').last().click(function() {
        var idAudio = $(this).parent().attr("id");
        var index = gainState.map(function(e) { return e.id; }).indexOf(idAudio);
        //var aud = $(this).siblings("audio");
        if (gainState[index].mute){
          $(this).html('ON');
          //aud.trigger("play");
          gainState[index].mute = false;
          if(typeof gainObject[index] !== 'undefined'){
            gainObject[index].gain.value = gainState[index].gain;
            console.log(gainState);
          }
        }else {
          $(this).html('OFF');
          //aud.trigger("pause");
          gainState[index].mute = true;
          if(typeof gainObject[index] !== 'undefined'){
            gainState[index].mute = true;
            gainObject[index].gain.value = 0;
            console.log(gainState);
          }
        }
    });


}

initializeAudioEffects = function(){
  context = new window.AudioContext();

  analyser = context.createAnalyser();
  analyser.smoothingTimeConstant = 0.7;
  analyser.fftSize = 2048;


  for (var i=0; i <9; i++){
        var temp = context.createBiquadFilter();
        eqObject[i] = temp;
        eqObject[i].type = 'peaking'; //other opts: lowpass,highpass,bandpass, lowshelf, highshelf,notch,allpass
        eqObject[i].frequency.value = 100;
        eqObject[i].Q.value = 5;
        eqObject[i].gain.value = 0;
      
      }
 
      for (var i = 1; i < 9; i++){
        eqObject[i-1].connect(eqObject[i]); 
      } 

      eqObject[8].connect(analyser);

      delay = context.createDelay();
      delay.delayTime.value = 0;

      eqObject[8].connect(delay);
      delay.connect(context.destination);
     

}


$(function($) {
  
   initializeAudioEffects();
   initializeAudioToggles();
   initializeLoopSliders();
   $(".routeSlider").val(0.2).change();

});