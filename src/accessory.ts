import { CharacteristicValue, PlatformAccessory } from "homebridge";
import { LitterRobotDevice } from "./device.js";
import { LitterRobotPlatform } from "./platform.js";

export class LitterRobotAccessory {
	private readonly nameChar;
	private readonly cleanChar;
	private readonly motionChar;

	constructor(
		private readonly platform: LitterRobotPlatform,
		accessory: PlatformAccessory,
		private device: LitterRobotDevice,
	) {
		const { Characteristic, HapStatusError, HAPStatus, Service } = platform.api.hap;

		// Accessory Information
		const infoService = accessory.getService(Service.AccessoryInformation)!;
		infoService
			.setCharacteristic(Characteristic.Manufacturer, "Whisker")
			.setCharacteristic(Characteristic.Model, "Litter Robot 4")
			.setCharacteristic(Characteristic.SerialNumber, device.serial)
			.setCharacteristic(Characteristic.FirmwareRevision, device.firmwareVersion);
		this.nameChar = infoService.getCharacteristic(Characteristic.Name);

		// Clean switch
		const cleanService =
			accessory.getServiceById(Service.Switch, "clean") ?? accessory.addService(Service.Switch, "Clean", "clean");
		this.cleanChar = cleanService.getCharacteristic(Characteristic.On);
		this.cleanChar.onGet((): CharacteristicValue => false);
		this.cleanChar.onSet(async (value: CharacteristicValue) => {
			if (value) {
				if (this.device.isCleaning || !this.device.isPoweredOn) {
					platform.log.error("Failed to start cleaning cycle: invalid state");
					throw new HapStatusError(HAPStatus.NOT_ALLOWED_IN_CURRENT_STATE);
				}

				try {
					await platform.client.startCleaning(device.serial);
				} catch (error) {
					platform.log.error("Failed to start cleaning cycle:", error);
					throw new HapStatusError(HAPStatus.NOT_ALLOWED_IN_CURRENT_STATE);
				}
				setTimeout(() => this.cleanChar.updateValue(false), 500);
			}
		});
		cleanService.setPrimaryService(true);

		// Motion sensor — cleaning cycle in progress
		const motionService =
			accessory.getService(Service.MotionSensor) ?? accessory.addService(Service.MotionSensor, "Cleaning");
		this.motionChar = motionService.getCharacteristic(Characteristic.MotionDetected);
		this.motionChar.onGet((): CharacteristicValue => device.isCleaning);
	}

	update(device: LitterRobotDevice): void {
		this.device = device;
		this.nameChar.updateValue(device.name);
		this.motionChar.updateValue(device.isCleaning);
	}
}
