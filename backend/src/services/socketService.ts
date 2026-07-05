import { Server } from 'socket.io';
import logger from '../utils/logger';

class SocketService {
    private io: Server | null = null;

    init(io: Server) {
        this.io = io;
        logger.info('SocketService initialized with Socket.io server');
    }

    emit(event: string, data: any) {
        if (this.io) {
            this.io.emit(event, data);
            logger.debug('WebSocket global event emitted', { event, data });
        } else {
            logger.warn('SocketService.emit called before initialization');
        }
    }

    emitToQueue(queueId: string, event: string, data: any) {
        if (this.io) {
            this.io.to(`queue:${queueId}`).emit(event, data);
            logger.debug('WebSocket room event emitted', { queueId, event, data });
        } else {
            logger.warn('SocketService.emitToQueue called before initialization');
        }
    }
}

export default new SocketService();
