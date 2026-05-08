import { API, DynamicPlatformPlugin, Logger, PlatformAccessory } from "homebridge";
import { LitterRobotAccessory } from "./accessory.js";
import { LitterRobotClient } from "./client.js";
import { LitterRobotConfig } from "./config.js";
import { LitterRobotDevice } from "./device.js";

const DEFAULT_POLL_RATE = 300;

export const PLATFORM_NAME = "LitterRobot";
export const PLUGIN_NAME = "@ddgold/homebridge-litter-robot";

export class LitterRobotPlatform implements DynamicPlatformPlugin {
	private readonly accessories: Map<string, PlatformAccessory>;
	private readonly litterRobotAccessories: Map<string, LitterRobotAccessory>;
	public readonly client: LitterRobotClient;

	constructor(
		public readonly log: Logger,
		public readonly config: LitterRobotConfig,
		public readonly api: API,
	) {
		this.accessories = new Map<string, PlatformAccessory>();
		this.litterRobotAccessories = new Map<string, LitterRobotAccessory>();
		this.client = new LitterRobotClient();

		this.api.on("didFinishLaunching", () => {
			void this.initializePolling();
		});
	}

	// Called by Homebridge once per cached accessory on startup — before didFinishLaunching
	configureAccessory(accessory: PlatformAccessory): void {
		this.log.info("Loading accessory from cache:", accessory.displayName);
		this.accessories.set(accessory.UUID, accessory);
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

			const existingLRAccessory = this.litterRobotAccessories.get(uuid);
			if (existingLRAccessory) {
				existingLRAccessory.update(device);
			} else {
				const existingPlatformAccessory = this.accessories.get(uuid);
				if (existingPlatformAccessory) {
					this.log.debug("Restoring existing accessory:", device.name);
					this.litterRobotAccessories.set(uuid, new LitterRobotAccessory(this, existingPlatformAccessory, device));
				} else {
					this.log.info("Adding new accessory:", device.name);
					const accessory = new this.api.platformAccessory(device.name, uuid);
					this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
					this.accessories.set(uuid, accessory);
					this.litterRobotAccessories.set(uuid, new LitterRobotAccessory(this, accessory, device));
				}
			}
		}

		for (const [uuid, accessory] of this.accessories) {
			if (!discoveredUUIDs.has(uuid)) {
				this.log.info("Removing stale accessory:", accessory.displayName);
				this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
				this.accessories.delete(uuid);
				this.litterRobotAccessories.delete(uuid);
			}
		}
	}
}
