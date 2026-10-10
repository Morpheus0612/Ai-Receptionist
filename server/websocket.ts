import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { db, broadcastHardwareState } from './state';
import { startCall, processUtterance, endCall } from './api-router';

export function setupWebSockets(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

    if (pathname === '/ws/dashboard' || pathname === '/ws/call') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (ws: WebSocket, request) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

    if (pathname === '/ws/dashboard') {
      db.dashboardClients.add(ws);

      // Send initial hardware state
      ws.send(JSON.stringify({
        type: 'hardware_update',
        data: db.hardware,
        timestamp: new Date().toISOString()
      }));

      ws.on('close', () => {
        db.dashboardClients.delete(ws);
      });

      ws.on('error', () => {
        db.dashboardClients.delete(ws);
      });

      ws.on('message', (data) => {
        // Keepalive / ping
      });
    } else if (pathname === '/ws/call') {
      // Browser phone line
      const session = await startCall('Browser Caller', '+1-555-DEMO', 'Web Simulator');
      const callSid = session.call_sid;

      ws.send(JSON.stringify({
        type: 'call_connected',
        call_sid: callSid,
        session
      }));

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'utterance') {
            const callerText = msg.text || '';
            const result = await processUtterance(callSid, callerText);
            ws.send(JSON.stringify({
              type: 'receptionist_turn',
              text: result.response_text,
              analysis: result.analysis,
              action_executed: result.action_executed
            }));
          } else if (msg.type === 'hangup') {
            const res = await endCall(callSid);
            ws.send(JSON.stringify({
              type: 'call_ended',
              result: res
            }));
          }
        } catch (e) {
          console.error('Error handling ws call message:', e);
        }
      });

      ws.on('close', async () => {
        await endCall(callSid);
      });

      ws.on('error', async () => {
        await endCall(callSid);
      });
    }
  });

  return wss;
}
