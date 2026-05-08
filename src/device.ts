export interface LitterRobotDevice {
	name: string;
	serial: string;
	catDetected: boolean;
	drawerLevelPercent: number;
	isCleaning: boolean;
	isDrawerFull: boolean;
	isKeypadLocked: boolean;
	isPoweredOn: boolean;
	nightLightEnabled: boolean;
}
