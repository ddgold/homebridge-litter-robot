import { type Characteristic, CharacteristicValue, PlatformAccessory } from "homebridge";
import { LitterRobotDevice } from "./device.js";
import { LitterRobotPlatform } from "./platform.js";

export class LitterRobotAccessory {
	private readonly nameChar: Characteristic;
	private readonly cleanChar: Characteristic;
	private readonly motionChar: Characteristic;
	private readonly nightLightChar?: Characteristic;
	private readonly filterChangeChar?: Characteristic;
	private readonly filterLifeChar?: Characteristic;

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

		// Night light (optional)
		if (platform.config.showNightLight !== "false") {
			const nightLightService =
				accessory.getServiceById(Service.Lightbulb, "night-light") ??
				accessory.addService(Service.Lightbulb, "Night Light", "night-light");
			this.nightLightChar = nightLightService.getCharacteristic(Characteristic.On);
			this.nightLightChar.onGet((): CharacteristicValue => this.device.nightLightEnabled);
			this.nightLightChar.onSet(async (value: CharacteristicValue) => {
				try {
					const mode = value ? (platform.config.nightLight === "auto" ? "auto" : "on") : "off";
					await platform.client.setNightLight(device.serial, mode);
				} catch (error) {
					platform.log.error("Failed to set night light:", error);
				}
			});
		}

		// Filter maintenance — waste drawer (optional)
		if (platform.config.showWasteDrawer !== false) {
			const filterService =
				accessory.getService(Service.FilterMaintenance) ??
				accessory.addService(Service.FilterMaintenance, "Waste Drawer");
			this.filterChangeChar = filterService.getCharacteristic(Characteristic.FilterChangeIndication);
			this.filterChangeChar.onGet(
				(): CharacteristicValue =>
					this.device.isDrawerFull
						? Characteristic.FilterChangeIndication.CHANGE_FILTER
						: Characteristic.FilterChangeIndication.FILTER_OK,
			);
			this.filterLifeChar = filterService.getCharacteristic(Characteristic.FilterLifeLevel);
			this.filterLifeChar.onGet((): CharacteristicValue => 100 - this.device.drawerLevelPercent);
		}
	}

	update(device: LitterRobotDevice): void {
		const { Characteristic } = this.platform.api.hap;

		this.device = device;
		this.nameChar.updateValue(device.name);
		this.motionChar.updateValue(device.isCleaning);
		this.nightLightChar?.updateValue(device.nightLightEnabled);
		this.filterChangeChar?.updateValue(
			device.isDrawerFull
				? Characteristic.FilterChangeIndication.CHANGE_FILTER
				: Characteristic.FilterChangeIndication.FILTER_OK,
		);
		this.filterLifeChar?.updateValue(100 - device.drawerLevelPercent);
	}
}
