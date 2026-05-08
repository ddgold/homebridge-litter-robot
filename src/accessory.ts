import { PlatformAccessory } from "homebridge";
import { LitterRobotDevice } from "./device.js";
import { LitterRobotPlatform } from "./platform.js";

export class LitterRobotAccessory {
	constructor(
		private readonly platform: LitterRobotPlatform,
		private readonly accessory: PlatformAccessory,
		private readonly device: LitterRobotDevice,
	) {
		// TODO: configure HomeKit services (OccupancySensor, FilterMaintenance, Switch, etc.)
	}
}
