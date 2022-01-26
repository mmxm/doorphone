
import json
import asyncio
import aiortc


class PCHandler():
    def __init__(self):
        self._pcs = {}

    async def send_message_to_pc(self, message):
        to_remove = []
        for pc in self._pcs:
            try:
                if self._pcs[pc]["datachannel"] is not None:
                    self._pcs[pc]["datachannel"].send(message)
            except aiortc.InvalidStateError:
                to_remove.append(pc)
                pass
        [await self.remove_pc(pc) for pc in to_remove]

    def create_user_status_message(self):
        message = {}
        for pc in self._pcs:
            pcid = self._pcs[pc]["id"]
            message[str(pcid)] = {"userName": pcid}
        return json.dumps(message)

    async def send_status_message(self):
        message = self.create_user_status_message()
        await self.send_message_to_pc(message)

    async def add_pc(self, pc, pc_id, channel= None):
        self._pcs[pc] = {"id": pc_id, "datachannel" : channel}
        await self.send_status_message()

    async def remove_pc(self, pc):
        if pc in self._pcs.keys():
            print(f"remove pc {pc} ")
            del self._pcs[pc]

            await pc.close()
            await self.send_status_message()



    async def update_pc_info_channel(self, pc, channel):
        self._pcs[pc]["datachannel"] = channel
        await self.send_status_message()

    async def close_pc(self, pcs=None):
        if not pcs:
            pcs = self._pcs
        coros = [pc.close() for pc in pcs]
        await asyncio.gather(*coros)