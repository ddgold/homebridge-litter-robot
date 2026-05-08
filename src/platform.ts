import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from "homebridge";
import { LitterRobotAccessory } from "./accessory.js";
import { LitterRobotClient } from "./client.js";
import { LitterRobotDevice } from "./device.js";
import { PLUGIN_NAME, PLATFORM_NAME } from "./settings.js";

export class LitterRobotPlatform implements DynamicPlatformPlugin {
	private readonly accessories: Map<string, PlatformAccessory>;
	private readonly client: LitterRobotClient;

	constructor(
		public readonly log: Logger,
		public readonly config: PlatformConfig,
		public readonly api: API,
	) {
		this.accessories = new Map<string, PlatformAccessory>();
		this.client = new LitterRobotClient(config);

		this.api.on("didFinishLaunching", () => {
			void this.discoverDevices();
		});
	}

	// Called by Homebridge once per cached accessory on startup — before didFinishLaunching
	configureAccessory(accessory: PlatformAccessory): void {
		this.log.info("Loading accessory from cache:", accessory.displayName);
		this.accessories.set(accessory.UUID, accessory);
	}

	private async discoverDevices(): Promise<void> {
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

			const existing = this.accessories.get(uuid);
			if (existing) {
				this.log.debug("Restoring existing accessory:", device.name);
				new LitterRobotAccessory(this, existing, device);
			} else {
				this.log.info("Adding new accessory:", device.name);
				const accessory = new this.api.platformAccessory(device.name, uuid);
				this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
				this.accessories.set(uuid, accessory);
				new LitterRobotAccessory(this, accessory, device);
			}
		}

		// Unregister any cached accessories that no longer exist in the API
		for (const [uuid, accessory] of this.accessories) {
			if (!discoveredUUIDs.has(uuid)) {
				this.log.info("Removing stale accessory:", accessory.displayName);
				this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
				this.accessories.delete(uuid);
			}
		}
	}
}
