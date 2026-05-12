export interface LitterRobotDevice {
	name: string;
	serial: string;
	firmwareVersion: string;
	isPoweredOn: boolean;
	isCleaning: boolean;
	nightLightEnabled: boolean;
	isDrawerFull: boolean;
	drawerLevelPercent: number;
}
