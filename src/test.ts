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
await client.connect({ username, password });

switch (command) {
	case "get": {
		const devices = await client.getDevices();
		console.log(JSON.stringify(devices, null, 2));
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
