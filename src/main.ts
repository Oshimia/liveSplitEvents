import { Firebot, RunRequest } from "@crowbartools/firebot-custom-scripts-types";
import { Logger } from "@crowbartools/firebot-custom-scripts-types/types/modules/logger";
import * as net from 'net';

let server: net.Server | null = null;
let scriptLogger: Logger | null = null;

const commandToEventMap: Record<string, { id: string; name: string; }> = {
    'starttimer': { id: 'start', name: 'Start Timer' },
    'pause':      { id: 'pause', name: 'Pause' },
    'resume':     { id: 'resume', name: 'Resume' },
    'reset':      { id: 'reset', name: 'Reset' },
    'split':      { id: 'split', name: 'Split' },
    'unsplit':    { id: 'unsplit', name: 'Undo Split' },
    'skipsplit':  { id: 'skipsplit', name: 'Skip Split' }
};

const script: Firebot.CustomScript<{ host: string; port: number; }> = {
    getScriptManifest: () => {
        return {
            name: "LiveSplit Event Listener",
            description: "Listens for commands from the LiveSplitRemote plugin and triggers Firebot events.",
            author: "Oshimia",
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
                secondaryDescription: "The IP address for the TCP server to listen on. '127.0.0.1' is recommended."
            },
            port: {
                type: "number",
                default: 16834,
                description: "Port",
                secondaryDescription: "The port for the LiveSplitRemote plugin. The default is 16834."
            }
        };
    },

    run: (runRequest: RunRequest<{ host: string; port: number; }>): void => {
        const { logger, eventManager } = runRequest.modules;
        const { host, port } = runRequest.parameters;
        
        scriptLogger = logger;

        eventManager.registerEventSource({
            id: 'livesplit-server',
            name: 'LiveSplit',
            events: Object.entries(commandToEventMap).map(([command, eventInfo]) => ({
                id: eventInfo.id,
                name: `LiveSplit: ${eventInfo.name}`,
                description: `Triggered when LiveSplit sends the '${command}' command.`
            }))
        });

        try {
            server = net.createServer((socket: net.Socket) => {
                logger.info(`LiveSplitRemote client connected from ${socket.remoteAddress}:${socket.remotePort}`);

                socket.on('data', (data) => {
                    const message = data.toString().trim();
                    const commands = message.split('\n');

                    commands.forEach(command => {
                        const cleanCommand = command.trim().toLowerCase();
                        if (!cleanCommand) return;

                        const eventInfo = commandToEventMap[cleanCommand];

                        if (eventInfo) {
                            logger.info(`Received LiveSplit command: ${cleanCommand}. Triggering event: ${eventInfo.name}`);
                            eventManager.triggerEvent(
                                'livesplit-server',
                                eventInfo.id,
                                { username: 'LiveSplit' }
                            );
                        }
                    });
                });

                socket.on('close', () => {
                    logger.info(`LiveSplitRemote client disconnected.`);
                });

                socket.on('error', (err) => {
                    logger.error(`LiveSplitRemote socket error: ${err.message}`);
                });
            });

            server.listen(port, host, () => {
                logger.info(`TCP server for LiveSplit is listening on ${host}:${port}`);
            });
        } catch (e: any) {
            logger.error(`Failed to start TCP server for LiveSplit: ${e.message}`);
        }
    },

    stop: () => {
        if (server) {
            server.close(() => {
                scriptLogger?.info('LiveSplit TCP server has been shut down.');
            });
            server = null;
        }
    },
};

export default script;