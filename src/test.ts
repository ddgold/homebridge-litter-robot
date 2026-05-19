import { readFileSync } from "fs";
import { LitterRobotClient } from "./client.js";

const [command, ...args] = process.argv.slice(2);
if (!command || command === "help" || command === "--help" || command === "-h") {
	console.log(`Commands:
  get                  Fetch and print all devices
  subscribe <serial>   Subscribe to device updates by serial number
  clean <serial>       Trigger a cleaning cycle for a device
  help                 Show this help message`);
	process.exit(0);
}

const credentials = readFileSync(".whiskerCredentials", "utf-8").trim();
const [username, password] = credentials.split("\n").map((line) => line.trim());
if (!username || !password) {
	console.error(".whiskerCredentials must contain username on line 1 and password on line 2");
	process.exit(1);
}

const client = new LitterRobotClient();
try {
	await client.connect({ username, password });
} catch (error) {
	const detail = error instanceof Error ? error.message : String(error);
	console.error(`Failed to authenticate with Whisker API (${detail})`);
	process.exit(1);
}

switch (command) {
	case "get": {
		try {
			const devices = await client.getDevices();
			console.log(JSON.stringify(devices, null, 2));
		} catch (error) {
			const cause = error instanceof Error ? (error.cause as NodeJS.ErrnoException) : undefined;
			const detail = cause?.code ?? (error instanceof Error ? error.message : String(error));
			console.error(`Failed to fetch devices from Whisker API (${detail}), will retry`);
		}
		break;
	}
	case "subscribe": {
		const [serial] = args;
		if (!serial) {
			console.error("Usage: subscribe <serial>");
			process.exit(1);
		}
		const ts = () => new Date().toISOString();
		client.subscribeToDevice(
			serial,
			(device) => console.log(`[${ts()}]`, JSON.stringify(device, null, 2)),
			(msg) => console.log(`[${ts()}]`, msg),
			(msg, ...params) => console.error(`[${ts()}]`, msg, ...params),
		);
		break;
	}
	case "clean": {
		const [serial] = args;
		if (!serial) {
			console.error("Usage: clean <serial>");
			process.exit(1);
		}
		console.log(`Cleaning cycle started for ${serial}`);
		await client.startCleaning(serial);
		break;
	}
	default: {
		console.error(`Unknown command: ${command}\n`);
		process.exit(1);
	}
}
