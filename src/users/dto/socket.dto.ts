import { Socket } from 'socket.io';
import { Client } from './login-user.dto';

export class SocketDto extends Socket {
  platform: Client;
}
