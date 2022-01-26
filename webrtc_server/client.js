// get DOM elements
var dataChannelLog = document.getElementById('data-channel'),
    iceConnectionLog = document.getElementById('ice-connection-state'),
    iceGatheringLog = document.getElementById('ice-gathering-state'),
    signalingLog = document.getElementById('signaling-state');

// peer connection
var pc = null;

// data channel
var dc = null, dcInterval = null;

function addRow(tableId, userId, userName) {
  // Get a reference to the table
  let tableRef = document.getElementById(tableId);

  // Insert a row at the end of the table
  let newRow = tableRef.insertRow(-1);
  newRow.id = userId

  // Insert a cell in the row at index 0
  let newCell = newRow.insertCell(0);

  // Append a text node to the cell
  let newText = document.createTextNode(userName);
  newCell.appendChild(newText);
}

function removeRow(userId) {
  // Get a reference to the table
  row = document.getElementById(userId);
  row.parentNode.removeChild(row);
}

function removeAllRow(tableId){
  var tableHeaderRowCount = 1;
  var table = document.getElementById(tableId);
  var rowCount = table.rows.length;
  for (var i = tableHeaderRowCount; i < rowCount; i++) {
    table.deleteRow(tableHeaderRowCount);
  }
}

function updateTable(tableId, content) {
    removeAllRow(tableId);
    for (const [key, value] of Object.entries(content)) {
      addRow(tableId, key, value.userName)
      console.log(key, value);

    }

}

function createPeerConnection() {
    var config = {
        sdpSemantics: 'unified-plan'
    };

    if (document.getElementById('use-stun').checked) {
        config.iceServers = [
        {urls: ['stun:stun.l.google.com:19302']},
        ];
    }

    pc = new RTCPeerConnection(config);

    // register some listeners to help debugging
    pc.addEventListener('icegatheringstatechange', function() {
        iceGatheringLog.textContent += ' -> ' + pc.iceGatheringState;
    }, false);
    iceGatheringLog.textContent = pc.iceGatheringState;

    pc.addEventListener('iceconnectionstatechange', function() {
        iceConnectionLog.textContent += ' -> ' + pc.iceConnectionState;
    }, false);
    iceConnectionLog.textContent = pc.iceConnectionState;

    pc.addEventListener('signalingstatechange', function() {
        signalingLog.textContent += ' -> ' + pc.signalingState;
    }, false);
    signalingLog.textContent = pc.signalingState;

    // connect audio / video
    pc.addEventListener('track', function(evt) {
        if (evt.track.kind == 'video')
            document.getElementById('video').srcObject = evt.streams[0];
        else
            document.getElementById('audio').srcObject = evt.streams[0];
    });

    return pc;
}

function negotiate() {
    pc.addTransceiver('video', {direction: 'recvonly'});
//    pc.addTransceiver('audio', {direction: 'recvonly'});
    return pc.createOffer().then(function(offer) {
        return pc.setLocalDescription(offer);
    }).then(function() {
        // wait for ICE gathering to complete
        return new Promise(function(resolve) {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });
    }).then(function() {
        var offer = pc.localDescription;
        var codec;

        document.getElementById('offer-sdp').textContent = offer.sdp;
        return fetch('/offer', {
            body: JSON.stringify({
                sdp: offer.sdp,
                type: offer.type
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
    }).then(function(response) {
        return response.json();
    }).then(function(answer) {

        document.getElementById('answer-sdp').textContent = answer.sdp;
        return pc.setRemoteDescription(answer);
    }).catch(function(e) {
        alert(e);
    });
}

function start() {
    document.getElementById('start').style.display = 'none';

    pc = createPeerConnection();

    var time_start = null;

    function current_stamp() {
        if (time_start === null) {
            time_start = new Date().getTime();
            return 0;
        } else {
            return new Date().getTime() - time_start;
        }
    }

    // var dataChannelLog = document.getElementById('user-online')

        dc = pc.createDataChannel('info', {"ordered": true});
        dc.onclose = function() {
            clearInterval(dcInterval);
            // dataChannelLog.textContent += '- close\n';
        };
        dc.onopen = function() {

        };
        dc.onmessage = function(evt) {
          // dataChannelLog.textContent += evt.data + '\n';
           data = JSON.parse(evt.data)
           updateTable("user-tab", data)

        };


    var constraints = {
//        audio: document.getElementById('use-audio').checked,
           audio: true
    };
    document.getElementById('media').style.display = 'block';
    console.log("Asking for media access")
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function(stream) {
        console.log("Microphone access ok")
        stream.getTracks().forEach(function(track) {
            pc.addTrack(track, stream);
            el = document.getElementById('use-audio')
            track.enabled = el.checked
            el.addEventListener('change', function() {
              if (this.checked) {
                track.enabled = true
              } else {
                track.enabled = false
              }
            });
        });
        return negotiate();
  } , function(err) {
          alert('Could not acquire media: ' + err);
      });

    document.getElementById('stop').style.display = 'inline-block';
}

function stop() {
    document.getElementById('stop').style.display = 'none';

    // close data channel
    if (dc) {
        dc.close();
    }

    // close transceivers
    if (pc.getTransceivers) {
        pc.getTransceivers().forEach(function(transceiver) {
            if (transceiver.stop) {
              console.log("Closing transceiver")
              console.log(transceiver)
                transceiver.stop();
            }
        });
    }

    // close local audio / video
    pc.getSenders().forEach(function(sender) {
        console.log("Closing track")
        sender.track.stop();
    });

    // close peer connection
    setTimeout(function() {
        pc.close();
    }, 500);
    document.getElementById('start').style.display = 'inline-block';
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
