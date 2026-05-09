import { CharacteristicValue, PlatformAccessory } from "homebridge";
import { LitterRobotDevice } from "./device.js";
import { LitterRobotPlatform } from "./platform.js";

export class LitterRobotAccessory {
	private readonly cleanChar;
	private readonly powerChar;
	private readonly panelLockCurrentChar;
	private readonly panelLockTargetChar;
	private readonly nightLightChar;
	private readonly occupancyChar;
	private readonly filterChangeChar;
	private readonly filterLifeChar;
	private readonly motionChar;

	constructor(
		private readonly platform: LitterRobotPlatform,
		accessory: PlatformAccessory,
		device: LitterRobotDevice,
	) {
		const { Characteristic, Service } = platform.api.hap;

		// Accessory Information
		accessory
			.getService(Service.AccessoryInformation)!
			.setCharacteristic(Characteristic.Manufacturer, "Whisker")
			.setCharacteristic(Characteristic.Model, "Litter Robot 4")
			.setCharacteristic(Characteristic.SerialNumber, device.serial)
			.setCharacteristic(Characteristic.FirmwareRevision, device.firmwareVersion);

		// Clean switch
		const cleanService =
			accessory.getServiceById(Service.Switch, "clean") ?? accessory.addService(Service.Switch, "Clean", "clean");
		this.cleanChar = cleanService.getCharacteristic(Characteristic.On);
		this.cleanChar.onGet((): CharacteristicValue => false);
		this.cleanChar.onSet(async (value: CharacteristicValue) => {
			if (value) {
				try {
					await platform.client.startCleaning(device.serial);
				} catch (error) {
					platform.log.error("Failed to start cleaning cycle:", error);
				}
				setTimeout(() => this.cleanChar.updateValue(false), 500);
			}
		});
		cleanService.setPrimaryService(true);

		// Power switch
		const powerService =
			accessory.getServiceById(Service.Switch, "power") ?? accessory.addService(Service.Switch, "Power", "power");
		this.powerChar = powerService.getCharacteristic(Characteristic.On);
		this.powerChar.onGet((): CharacteristicValue => device.isPoweredOn);
		this.powerChar.onSet(async (value: CharacteristicValue) => {
			try {
				await platform.client.setPower(device.serial, value as boolean);
			} catch (error) {
				platform.log.error("Failed to set power:", error);
			}
		});
		cleanService.addLinkedService(powerService);

		// Panel lock
		const panelLockService =
			accessory.getServiceById(Service.LockMechanism, "panel-lock") ??
			accessory.addService(Service.LockMechanism, "Panel Lock", "panel-lock");
		this.panelLockCurrentChar = panelLockService.getCharacteristic(Characteristic.LockCurrentState);
		this.panelLockCurrentChar.onGet(
			(): CharacteristicValue =>
				device.isKeypadLocked ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED,
		);
		this.panelLockTargetChar = panelLockService.getCharacteristic(Characteristic.LockTargetState);
		this.panelLockTargetChar.onGet(
			(): CharacteristicValue =>
				device.isKeypadLocked ? Characteristic.LockTargetState.SECURED : Characteristic.LockTargetState.UNSECURED,
		);
		this.panelLockTargetChar.onSet(async (value: CharacteristicValue) => {
			try {
				await platform.client.setPanelLock(device.serial, value === Characteristic.LockTargetState.SECURED);
			} catch (error) {
				platform.log.error("Failed to set panel lock:", error);
			}
		});
		cleanService.addLinkedService(panelLockService);

		// Night light
		const nightLightService =
			accessory.getServiceById(Service.Lightbulb, "night-light") ??
			accessory.addService(Service.Lightbulb, "Night Light", "night-light");
		this.nightLightChar = nightLightService.getCharacteristic(Characteristic.On);
		this.nightLightChar.onGet((): CharacteristicValue => device.nightLightEnabled);
		this.nightLightChar.onSet(async (value: CharacteristicValue) => {
			try {
				await platform.client.setNightLight(device.serial, value as boolean);
			} catch (error) {
				platform.log.error("Failed to set night light:", error);
			}
		});
		cleanService.addLinkedService(nightLightService);

		// Occupancy sensor — cat detected
		const occupancyService =
			accessory.getService(Service.OccupancySensor) ?? accessory.addService(Service.OccupancySensor, "Occupancy");
		this.occupancyChar = occupancyService.getCharacteristic(Characteristic.OccupancyDetected);
		this.occupancyChar.onGet(
			(): CharacteristicValue =>
				device.catDetected
					? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
					: Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
		);

		// Filter maintenance — waste drawer
		const filterService =
			accessory.getService(Service.FilterMaintenance) ??
			accessory.addService(Service.FilterMaintenance, "Waste Drawer");
		this.filterChangeChar = filterService.getCharacteristic(Characteristic.FilterChangeIndication);
		this.filterChangeChar.onGet(
			(): CharacteristicValue =>
				device.isDrawerFull
					? Characteristic.FilterChangeIndication.CHANGE_FILTER
					: Characteristic.FilterChangeIndication.FILTER_OK,
		);
		this.filterLifeChar = filterService.getCharacteristic(Characteristic.FilterLifeLevel);
		this.filterLifeChar.onGet((): CharacteristicValue => 100 - device.drawerLevelPercent);

		// Motion sensor — cleaning cycle in progress
		const motionService =
			accessory.getService(Service.MotionSensor) ?? accessory.addService(Service.MotionSensor, "Cleaning");
		this.motionChar = motionService.getCharacteristic(Characteristic.MotionDetected);
		this.motionChar.onGet((): CharacteristicValue => device.isCleaning);
	}

	update(device: LitterRobotDevice): void {
		const { Characteristic } = this.platform.api.hap;

		this.powerChar.updateValue(device.isPoweredOn);
		this.panelLockCurrentChar.updateValue(
			device.isKeypadLocked ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED,
		);
		this.panelLockTargetChar.updateValue(
			device.isKeypadLocked ? Characteristic.LockTargetState.SECURED : Characteristic.LockTargetState.UNSECURED,
		);
		this.nightLightChar.updateValue(device.nightLightEnabled);
		this.occupancyChar.updateValue(
			device.catDetected
				? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
				: Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
		);
		this.filterChangeChar.updateValue(
			device.isDrawerFull
				? Characteristic.FilterChangeIndication.CHANGE_FILTER
				: Characteristic.FilterChangeIndication.FILTER_OK,
		);
		this.filterLifeChar.updateValue(100 - device.drawerLevelPercent);
		this.motionChar.updateValue(device.isCleaning);
	}
}
