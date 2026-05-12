import { PlatformConfig } from "homebridge";

export interface LitterRobotConfig extends PlatformConfig {
	username: string;
	password: string;
	pollRate?: number;
	showMotionSensor?: boolean;
	showNightLight?: "true" | "false" | "auto";
	showWasteDrawer?: boolean;
}
