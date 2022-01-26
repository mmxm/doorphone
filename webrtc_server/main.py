import argparse
import asyncio
import json
import logging
import os
import ssl
import uuid
from aiohttp import web
from DataChannelHandler import *
import aiohttp_cors

from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaPlayer, MediaRecorder, MediaRelay, MediaStreamError
from aiohttp_jwt import JWTMiddleware
ROOT = os.path.dirname(__file__)

logger = logging.getLogger("pc")
# logger.setLevel(logging.DEBUG)
relayvideo = None
relayaudio = None
# audio = None
# video = None
webcam = None
mic = None
relayaudiovideo = MediaRelay()
both = None
pcsHandler = PCHandler()
recorder = MediaRecorder('echoCancel_sink', format='pulse')
SECRET_KEY = 'i&fr%ls$uey%#0t7w=lbyyk#*zce=z2_1w0+t246q!zu$ruo7*'

def create_local_tracks():
    global relayvideo, relayaudio, webcam, mic
    options = {"framerate": "30", "video_size": "640x480"}
    # webcam = MediaPlayer("/dev/video0", format="v4l2", options=options)
    # mic = MediaPlayer("default", format="pulse")
    # mic = MediaPlayer("hw:0", format="alsa")
    if relayvideo is None:
        webcam = MediaPlayer("/dev/video0", format="v4l2", options=options)
        relayvideo = MediaRelay()
    if relayaudio is None:
        mic = MediaPlayer("default", format="pulse")
        relayaudio = MediaRelay()
    return relayaudio.subscribe(mic.audio),relayvideo.subscribe(webcam.video)

def create_both_local_tracks():
    options = {"framerate": "30", "video_size": "640x480"}
    webcam = MediaPlayer("/dev/video0", format="v4l2", options=options)
    mic = MediaPlayer("default", format="pulse")
    # mic = MediaPlayer("hw:0", format="alsa")
    relayaudiovideo.subscribe(webcam.video)
    return relayaudiovideo.subscribe(mic.audio)

async def index(request):
    content = open(os.path.join(ROOT, "index.html"), "r").read()
    return web.Response(content_type="text/html", text=content)


async def javascript(request):
    content = open(os.path.join(ROOT, "client.js"), "r").read()
    return web.Response(content_type="application/javascript", text=content)


async def offer(request):
    global pcsHandler
    params = await request.json()
    audio, video = create_local_tracks()
    print(params)
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    pc = RTCPeerConnection()
    pc_id = "PeerConnection(%s)" % uuid.uuid4()


    await pcsHandler.add_pc(pc, pc_id)
    def log_info(msg, *args):
        logger.info(pc_id + " " + msg, *args)

    log_info("Created for %s", request.remote)

    # prepare local media

    @pc.on("datachannel")
    async def on_datachannel(channel):
        await pcsHandler.update_pc_info_channel(pc, channel)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        log_info("Connection state is %s", pc.connectionState)
        if pc.connectionState in ("failed"):
            await pcsHandler.remove_pc(pc)


    @pc.on("track")
    async def on_track(track):
        global recorder
        log_info("Track %s received", track.kind)
        if track.kind == "audio":
            pass
            # pc.addTrack(audio)
            # print()
            # recorder.addTrack(track)
            # await recorder.start()


        @track.on("ended")
        async def on_ended():
            log_info("Track %s ended", track.kind)
            # await recorder.stop()
            await pcsHandler.remove_pc(pc)

    # pc.addTransceiver("video", direction="sendonly")

    pc.addTrack(video)
    pc.addTrack(audio)

    # handle offer
    await pc.setRemoteDescription(offer)


    # for t in pc.getTransceivers():
    #     print(t.kind)
    #     # if t.kind == "video":
    #     #     pc.addTrack(both)
    #     if t.kind == "video":
    #         pc.addTrack(video)
    #     elif t.kind == "audio":
    #         pc.addTrack(audio)

    # send answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return web.Response(
        content_type="application/json",
        text=json.dumps(
            {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
        ),
    )

async def on_start(app):
    print('creating audio, video')
    # global audio, video, both, pcsHandler
    # audio, video = create_local_tracks()
    # both = create_both_local_tracks()

async def on_shutdown(app):
    # close peer connections
    await pcsHandler.close_pc()


if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description="WebRTC audio / video / data-channels demo"
    )
    parser.add_argument("--cert-file", help="SSL certificate file (for HTTPS)")
    parser.add_argument("--key-file", help="SSL key file (for HTTPS)")
    parser.add_argument(
        "--host", default="0.0.0.0", help="Host for HTTP server (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port", type=int, default=5600, help="Port for HTTP server (default: 8080)"
    )
    parser.add_argument("--record-to", help="Write received media to a file."),
    parser.add_argument("--verbose", "-v", action="count")
    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    if args.cert_file:
        ssl_context = ssl.SSLContext()
        ssl_context.load_cert_chain(args.cert_file, args.key_file)
    else:
        ssl_context = None

    app = web.Application(
        middlewares=[
            JWTMiddleware(SECRET_KEY),
        ]
    )
    app.on_startup.append(on_start)
    app.on_shutdown.append(on_shutdown)
    app.router.add_get("/", index)
    app.router.add_get("/client.js", javascript)
    app.router.add_post("/offer", offer)

    web.run_app(
        app, access_log=None, host=args.host, port=args.port, ssl_context=ssl_context
    )




#--cert-file /home/francois/Téléchargements/cert.pem --key-file /home/francois/Téléchargements/key.pem
 ### If problem with alsa container, pip uninstall av, pip install av --no-binary av (sudo apt install sudo apt install libavformat-dev libavcodec-dev libavdevice-dev libavutil-dev libswscale-dev libavresample-dev libavfilter-dev)
# recorder = MediaRecorder('plughw', 'alsa', options={'channels': '1', 'sample_rate': '44000'})
# systemctl --user stop pulseaudio.socket
# systemctl --user stop pulseaudio.service
# systemctl --user start pulseaudio.socket
# systemctl --user start pulseaudio.service


# load-module module-echo-cancel use_master_format=1 aec_method=webrtc aec_args="analog_gain_control=0\ digital_gain_control=1\ noise_suppression=1" source_name=echoCancel_source sink_name=echoCancel_sink
# set-default-source echoCancel_source
# set-default-sink echoCancel_sink

    # recorder = MediaRecorder('alsa_output.pci-0000_00_1f.3.analog-stereo', format='pulse')
    # recorder = MediaRecorder('plughw:0', 'alsa', options={'channels': '1', 'sample_rate': '44000'})