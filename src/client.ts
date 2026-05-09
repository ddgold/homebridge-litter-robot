import { AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserSession } from "amazon-cognito-identity-js";
import { LitterRobotDevice } from "./device.js";

const USER_POOL_ID = "us-east-1_rjhNnZVAm";
const CLIENT_ID = "4552ujeu3aic90nf8qn53levmn";
const GRAPHQL_URL = "https://lr4.iothings.site/graphql";
const GRAPHQL_WS_URL = "wss://lr4.iothings.site/graphql/realtime";
const GRAPHQL_WS_HOST = "lr4.iothings.site";

interface LitterRobotRawData {
	name: string;
	serial: string;
	espFirmware: string;
	robotStatus: string;
}

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

	private parseDevice(raw: LitterRobotRawData): LitterRobotDevice {
		return {
			name: raw.name,
			serial: raw.serial,
			firmwareVersion: raw.espFirmware ?? "Unknown",
			isPoweredOn: raw.robotStatus === "ROBOT_POWER_OFF",
			isCleaning: raw.robotStatus === "ROBOT_CLEAN",
		};
	}

	async getDevices(): Promise<LitterRobotDevice[]> {
		const userId = this.getUserId();

		const data = await this.runGraphqlQuery<{ getLitterRobot4ByUser: LitterRobotRawData[] }>(
			`query GetLR4ByUser($userId: String!) {
				getLitterRobot4ByUser(userId: $userId) {
					name
					serial
					espFirmware
					robotStatus
				}
			}`,
			{ userId },
		);

		return data.getLitterRobot4ByUser.map((raw) => this.parseDevice(raw));
	}

	private openWebSocket(token: string): WebSocket {
		const header = Buffer.from(
			JSON.stringify({
				Authorization: `Bearer ${token}`,
				host: GRAPHQL_WS_HOST,
			}),
		).toString("base64");

		const payload = Buffer.from("{}").toString("base64");

		return new WebSocket(`${GRAPHQL_WS_URL}?header=${header}&payload=${payload}`, "graphql-ws");
	}

	private buildSubscriptionMessage(subscriptionId: string, serial: string, token: string): string {
		return JSON.stringify({
			id: subscriptionId,
			type: "start",
			payload: {
				data: JSON.stringify({
					query: `subscription GetLR4BySerial($serial: String!) {
						litterRobot4StateSubscriptionBySerial(serial: $serial) {
							name
							serial
							espFirmware
							robotStatus
						}
					}`,
					variables: { serial },
				}),
				extensions: { authorization: { Authorization: `Bearer ${token}`, host: GRAPHQL_WS_HOST } },
			},
		});
	}

	subscribeToDevice(
		serial: string,
		onUpdate: (device: LitterRobotDevice) => void,
		onLog: (message: string, ...parameters: unknown[]) => void,
		onError: (message: string, ...parameters: unknown[]) => void,
	): () => void {
		let ws: WebSocket | null = null;
		let stopped = false;
		let reconnectDelay = 1_000;
		let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

		const scheduleReconnect = () => {
			if (stopped) return;
			reconnectTimeout = setTimeout(() => void connect(), reconnectDelay);
			reconnectDelay = Math.min(reconnectDelay * 2, 300_000);
		};

		const connect = async () => {
			if (stopped) return;

			let token: string;
			try {
				token = await this.validateToken();
			} catch {
				scheduleReconnect();
				return;
			}

			ws = this.openWebSocket(token);
			const subscriptionId = crypto.randomUUID();

			ws.onopen = () => {
				reconnectDelay = 1_000;
				ws!.send(this.buildSubscriptionMessage(subscriptionId, serial, token));
				onLog(`WebSocket connected for ${serial}`);
			};

			ws.onmessage = (event) => {
				const msg = JSON.parse(event.data as string) as {
					type: string;
					id?: string;
					payload?: {
						data?: {
							litterRobot4StateSubscriptionBySerial?: LitterRobotRawData;
						};
					};
				};
				if (msg.type === "data") {
					const raw = msg.payload?.data?.litterRobot4StateSubscriptionBySerial;
					if (raw) {
						onUpdate(this.parseDevice(raw));
					}
				} else if (msg.type === "error" || msg.type === "complete") {
					scheduleReconnect();
				}
			};

			ws.onerror = (event) => {
				onError(`WebSocket error for ${serial}:`, event);
			};

			ws.onclose = () => {
				if (!stopped) scheduleReconnect();
			};
		};

		void connect();

		return () => {
			stopped = true;
			if (reconnectTimeout !== null) clearTimeout(reconnectTimeout);
			ws?.close();
		};
	}

	async startCleaning(serial: string): Promise<void> {
		await this.sendCommand(serial, "cleanCycle");
	}
}
