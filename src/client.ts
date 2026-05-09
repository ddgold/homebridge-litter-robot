import { AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserSession } from "amazon-cognito-identity-js";
import { LitterRobotDevice } from "./device.js";

const USER_POOL_ID = "us-east-1_rjhNnZVAm";
const CLIENT_ID = "4552ujeu3aic90nf8qn53levmn";
const GRAPHQL_URL = "https://lr4.iothings.site/graphql";

export class LitterRobotClient {
	private session: CognitoUserSession | null = null;
	private cognitoUser: CognitoUser | null = null;

	constructor() {}

	private getUserId(): string {
		if (!this.session) {
			throw new Error("Failed to ensure valid token, not authorized");
		}

		return this.session.getIdToken().decodePayload()["mid"] as string;
	}

	private async validateToken(): Promise<string> {
		if (!this.session || !this.cognitoUser) {
			throw new Error("Failed to validate token, not authorized");
		}

		const expiration = this.session.getIdToken().decodePayload()["exp"] as number;
		if (expiration - Date.now() / 1000 < 60) {
			const user = this.cognitoUser;
			const currentSession = this.session;
			this.session = await new Promise<CognitoUserSession>((resolve, reject) => {
				user.refreshSession(currentSession.getRefreshToken(), (error: Error | null, session: CognitoUserSession) => {
					if (error) {
						reject(error);
					} else {
						resolve(session);
					}
				});
			});
		}

		return this.session.getIdToken().getJwtToken();
	}

	private async runGraphqlQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
		const token = await this.validateToken();
		const response = await fetch(GRAPHQL_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			throw new Error(`GraphQL HTTP error: ${response.status}`);
		}

		const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
		if (json.errors?.length) {
			throw new Error(`GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
		}
		return json.data as T;
	}

	private async sendCommand(serial: string, command: string, value?: string): Promise<void> {
		await this.runGraphqlQuery<unknown>(
			`mutation sendCommand($serial: String!, $command: String!, $value: String) {
				sendLitterRobot4Command(input: {
					serial: $serial
					command: $command
					value: $value
					commandSource: "homebridge"
				})
			}`,
			{ serial, command, value },
		);
	}

	async connect({ username, password }: { username: string; password: string }): Promise<void> {
		const pool = new CognitoUserPool({
			UserPoolId: USER_POOL_ID,
			ClientId: CLIENT_ID,
		});

		const user = new CognitoUser({
			Username: username,
			Pool: pool,
		});

		const authDetails = new AuthenticationDetails({
			Username: username,
			Password: password,
		});

		this.session = await new Promise<CognitoUserSession>((resolve, reject) => {
			user.authenticateUser(authDetails, {
				onSuccess: (session) => resolve(session),
				onFailure: (error: Error) => reject(error),
			});
		});

		this.cognitoUser = user;
	}

	async getDevices(): Promise<LitterRobotDevice[]> {
		const userId = this.getUserId();

		const data = await this.runGraphqlQuery<{
			getLitterRobot4ByUser: {
				name: string;
				serial: string;
				catDetect: boolean;
				DFILevelPercent: number;
				isDFIFull: boolean;
				isKeypadLockout: boolean;
				nightLightMode: string;
				robotCycleState: string;
				robotStatus: string;
			}[];
		}>(
			`query GetLR4ByUser($userId: String!) {
				getLitterRobot4ByUser(userId: $userId) {
					name
					serial
					catDetect
					DFILevelPercent
					isDFIFull
					isKeypadLockout
					nightLightMode
					robotCycleState
					robotStatus
				}
			}`,
			{ userId },
		);

		return data.getLitterRobot4ByUser.map((robot) => ({
			name: robot.name,
			serial: robot.serial,
			catDetected: robot.catDetect,
			drawerLevelPercent: Math.min(100, Math.max(0, robot.DFILevelPercent ?? 0)),
			isCleaning: !!robot.robotCycleState && robot.robotCycleState !== "",
			isDrawerFull: robot.isDFIFull,
			isKeypadLocked: robot.isKeypadLockout,
			isPoweredOn: !!robot.robotStatus && robot.robotStatus !== "OFF",
			nightLightEnabled: robot.nightLightMode !== "OFF",
		}));
	}

	async startCleaning(serial: string): Promise<void> {
		await this.sendCommand(serial, "cleanCycle");
	}

	async setPower(serial: string, on: boolean): Promise<void> {
		await this.sendCommand(serial, on ? "powerOn" : "powerOff");
	}

	async setPanelLock(serial: string, locked: boolean): Promise<void> {
		await this.sendCommand(serial, "setPanelLockout", locked ? "true" : "false");
	}

	async setNightLight(serial: string, enabled: boolean): Promise<void> {
		await this.sendCommand(serial, enabled ? "nightLightModeOn" : "nightLightModeOff");
	}
}
