import { API } from "homebridge";
import { LitterRobotPlatform, PLATFORM_NAME, PLUGIN_NAME } from "./platform.js";

export default (api: API) => {
	api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, LitterRobotPlatform);
};
