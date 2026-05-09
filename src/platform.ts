import { API, DynamicPlatformPlugin, Logger, PlatformAccessory } from "homebridge";
import { LitterRobotAccessory } from "./accessory.js";
import { LitterRobotClient } from "./client.js";
import { LitterRobotConfig } from "./config.js";
import { LitterRobotDevice } from "./device.js";

const DEFAULT_POLL_RATE = 300;

export const PLATFORM_NAME = "LitterRobot";
export const PLUGIN_NAME = "@ddgold/homebridge-litter-robot";

export class LitterRobotPlatform implements DynamicPlatformPlugin {
	private readonly accessories = new Map<string, [PlatformAccessory, LitterRobotAccessory | undefined]>();
	readonly client = new LitterRobotClient();

	constructor(
		readonly log: Logger,
		readonly config: LitterRobotConfig,
		readonly api: API,
	) {
		this.api.on("didFinishLaunching", () => {
			void this.initializePolling();
		});
	}

	// Called by Homebridge once per cached accessory on startup — before didFinishLaunching
	configureAccessory(accessory: PlatformAccessory): void {
		this.log.info("Loading accessory from cache:", accessory.displayName);
		this.accessories.set(accessory.UUID, [accessory, undefined]);
	}

	private async initializePolling(): Promise<void> {
		try {
			await this.client.connect(this.config);
		} catch (error) {
			this.log.error("Failed to authenticate with Whisker API:", error);
			return;
		}

		await this.syncDevices();

		const pollRate = this.config.pollRate ?? DEFAULT_POLL_RATE;
		setInterval(() => {
			void this.syncDevices();
		}, pollRate * 1000);
	}

	private async syncDevices(): Promise<void> {
		let devices: LitterRobotDevice[];
		try {
			devices = await this.client.getDevices();
		} catch (error) {
			this.log.error("Failed to fetch devices from Whisker API:", error);
			return;
		}

		const discoveredUUIDs = new Set<string>();
		for (const device of devices) {
			const uuid = this.api.hap.uuid.generate(device.serial);
			discoveredUUIDs.add(uuid);

			const existingAccessory = this.accessories.get(uuid);
			if (existingAccessory) {
				const [platformAccessory, robotAccessory] = existingAccessory;
				if (robotAccessory) {
					this.log.debug("Updating existing accessory:", device.name);
					robotAccessory.update(device);
				} else {
					const robotAccessory = new LitterRobotAccessory(this, platformAccessory, device);
					this.log.debug("Restoring existing accessory:", device.name);
					this.accessories.set(uuid, [platformAccessory, robotAccessory]);
				}
			} else {
				this.log.info("Adding new accessory:", device.name);
				const accessory = new this.api.platformAccessory(device.name, uuid);
				this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
				const robotAccessory = new LitterRobotAccessory(this, accessory, device);
				this.accessories.set(uuid, [accessory, robotAccessory]);
			}
		}

		for (const [uuid, [accessory]] of this.accessories) {
			if (!discoveredUUIDs.has(uuid)) {
				this.log.info("Removing stale accessory:", accessory.displayName);
				this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
				this.accessories.delete(uuid);
			}
		}
	}
}
