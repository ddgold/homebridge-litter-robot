import { PlatformConfig } from "homebridge";
import { LitterRobotDevice } from "./device.js";

export class LitterRobotClient {
	constructor(private readonly config: PlatformConfig) {}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getDevices(): Promise<LitterRobotDevice[]> {
		// TODO: implement Whisker GraphQL API

		return [];
	}
}
