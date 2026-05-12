export interface LitterRobotDevice {
	name: string;
	serial: string;
	firmwareVersion: string;
	isPoweredOn: boolean;
	isCleaning: boolean;
	isDrawerFull: boolean;
	drawerLevelPercent: number;
}
