import { Firebot, RunRequest } from "@crowbartools/firebot-custom-scripts-types";
import { Logger } from "@crowbartools/firebot-custom-scripts-types/types/modules/logger";
import * as net from 'net';

let server: net.Server | null = null;
let scriptLogger: Logger | null = null;

const script: Firebot.CustomScript<{ host: string; port: number; }> = {
    getScriptManifest: () => {
        return {
            name: "TCP Event Server",
            description: "Starts a TCP server to listen for events from external programs and triggers a custom Firebot event.",
            author: "User Request",
            version: "1.0",
            firebotVersion: "5",
            startupOnly: true,
        };
    },

    getDefaultParameters: () => {
        return {
            host: {
                type: "string",
                default: "127.0.0.1",
                description: "Host/IP Address",
                secondaryDescription: "The IP address for the TCP server to listen on. '127.0.0.1' is recommended for local applications on the same machine."
            },
            port: {
                type: "number",
                default: 16834,
                description: "Port",
                secondaryDescription: "The port for the TCP server to listen on. Ensure it's not used by another application."
            }
        };
    },

    run: (runRequest: RunRequest<{ host: string; port: number; }>): void => {
        const { logger, eventManager } = runRequest.modules;
        const { host, port } = runRequest.parameters;
        
        scriptLogger = logger;

        eventManager.registerEventSource({
            id: 'livesplit-events',
            name: 'Livesplit Events',
            events: [
                {
                    id: 'data-received',
                    name: 'Data Received',
                    description: 'Triggered when data is received by the TCP server.',
                    manualMetadata: {
                        tcpData: { "exampleKey": "exampleValue" }
                    }
                }
            ]
        });

        try {
            server = net.createServer((socket: net.Socket) => {
                logger.info(`TCP client connected from ${socket.remoteAddress}:${socket.remotePort}`);

                socket.on('data', (data) => {
                    const message = data.toString().trim();
                    logger.info(`Received TCP data: ${message}`);

                    const messages = message.split('\n');
                    messages.forEach(msg => {
                        if (!msg) return;
                        try {
                            const eventData = JSON.parse(msg);
                            eventManager.triggerEvent(
                                'tcp-server',
                                'data-received',
                                {
                                    username: 'TCPServer',
                                    tcpData: eventData
                                }
                            );
                        } catch (e) {
                            logger.error(`Failed to parse incoming TCP data as JSON: "${msg}"`);
                        }
                    });
                });

                socket.on('close', () => {
                    logger.info(`TCP client disconnected.`);
                });

                socket.on('error', (err) => {
                    logger.error(`TCP socket error: ${err.message}`);
                });
            });

            server.listen(port, host, () => {
                logger.info(`TCP server is listening for events on ${host}:${port}`);
            });
        } catch (e: any) {
            logger.error(`Failed to start TCP server: ${e.message}`);
        }
    },

    stop: () => {
        if (server) {
            server.close(() => {
                scriptLogger?.info('TCP server has been shut down.');
            });
            server = null;
        }
    },
};

export default script;