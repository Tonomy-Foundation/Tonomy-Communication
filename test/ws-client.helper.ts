import { io, Socket } from 'socket.io-client';
import { HttpStatus } from '@nestjs/common';
import { WebsocketReturnType } from 'src/communication/communication.gateway';

export const SOCKET_TIMEOUT = 1000;

export async function connectSocket(): Promise<Socket> {
    const socket = io('http://localhost:5000', {
        autoConnect: false,
        transports: ['websocket'],
    });

    socket.connect();
    let resolved = false;

    await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
            resolved = true;
            resolve();
        });

        setTimeout(() => {
            if (resolved) return;
            reject(new Error('Websocket connection event timed out'));
        }, SOCKET_TIMEOUT);
    });
    return socket;
}

export async function emitMessage(
    socket: Socket,
    event: string,
    body: any,
): Promise<any> {
    const res: WebsocketReturnType = await new Promise((resolve, reject) => {
        socket
            .timeout(SOCKET_TIMEOUT)
            .emit(event, body, (error: any, response: any) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(response);
            });
    });

    if (res.status !== HttpStatus.OK) {
        const err = new Error(res.error);

        // @ts-expect-error - code is not a property of Error
        err.code = res.status;
        throw err;
    } else {
        return res.details;
    }
}

// export async function emitMessage(
//     socket: Socket,
//     event: string,
//     body: any,
// ): Promise<any> {
//     return await new Promise((resolve, reject) => {
//         let resolved = false;

//         const res = socket.emit(event, body, (response: any) => {
//             console.log('response', response);

//             if (response.error) {
//                 reject(response.error);
//                 return;
//             }

//             resolved = true;
//             resolve(response);
//             return;
//         });

//         // console.log('res', res);

//         setTimeout(() => {
//             if (resolved) return;
//             reject(new Error('Websocket event timed out'));
//         }, 1000);
//     });
// }
