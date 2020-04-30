import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway()
export class ChatGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly service: ChatService) {}

  @SubscribeMessage('addRoom')
  async handleAddRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { username, roomName },
  ): Promise<void> {
    const room = this.getClientCurrentRoom(client);
    if (room) client.leave(room);
    const roomInfo = await this.service.createChat(roomName);
    client.join(roomName);
    this.server.to(client.id).emit('joinedRoom', { username, roomName , roomInfo });
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { username, roomName },
  ): Promise<void> {
    const room = this.getClientCurrentRoom(client);
    if (room) client.leave(room);
    const roomInfo = await this.service.getRoomInformation(roomName);
    client.join(roomName);
    this.server.to(room).emit('joinedRoom', { username, roomName , roomInfo })
  }

  @SubscribeMessage('toRoom')
  handleMessageToRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { username, message },
  ) {
    const room = this.getClientCurrentRoom(client);
    if (room) {
      this.service.addMessage(room, { sender: client.id,  message });
      this.server.to(room).emit('toClient', { username, message });
    }
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() username
  ) {
    const room = this.getClientCurrentRoom(client);
    if (room) {
      client.leave(room);
      this.server.to(room).emit('leftRoom', username)
    }
  }

  @SubscribeMessage('exitRoom')
  handleExitRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() username
  ) {
    const room = this.getClientCurrentRoom(client);
    if (room) {
      this.service.removeMember(room, client.id);
      client.leave(room);
      this.server.to(room).emit('exitedRoom', username)
    }
  }

  private getClientCurrentRoom(client: Socket) {
    return Object.keys(client.rooms).filter(room => room !== client.id)[0];
  }
}
