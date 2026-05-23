# homebridge-litter-robot

A [Homebridge](https://homebridge.io) plugin for the [Litter-Robot 4](https://www.litter-robot.com) by Whisker. Exposes your robot as a HomeKit accessory so you can trigger cleaning cycles, monitor the waste drawer, and control settings from the Home app or automations.

## Requirements

- Homebridge ≥ 2.0
- Node.js ≥ 24
- A Litter-Robot 4 connected to your Whisker account

## Installation

**Via Homebridge UI:**

Go to Plugins → search `@ddgold/homebridge-litter-robot` → Install.

**Via command line:**

```bash
npm install -g @ddgold/homebridge-litter-robot
```

## Configuration

Add the platform to your Homebridge `config.json`:

```json
{
	"platforms": [
		{
			"platform": "LitterRobot",
			"name": "Litter Robot",
			"username": "your@email.com",
			"password": "yourpassword"
		}
	]
}
```

| Field             | Required | Description                                                                                                      |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `username`        | Yes      | Your Whisker account email                                                                                       |
| `password`        | Yes      | Your Whisker account password                                                                                    |
| `showMotionSensor`| No       | Expose the cleaning cycle as a Motion Sensor in HomeKit. Default: `true`                                         |
| `showNightLight`  | No       | `"true"` exposes the night light (On mode), `"auto"` exposes it (Auto mode), `"false"` hides it. Default: `"true"` |
| `showWasteDrawer` | No       | Expose the waste drawer as a Filter Maintenance accessory in HomeKit. Default: `true`                            |
| `pollRate`        | No       | How often (in seconds) to sync device state. Minimum 60, default 300 (5 minutes)                                |

## HomeKit Services

Each Litter-Robot 4 appears as a single accessory with the following services:

### Controls

| Service     | Type              | Description                                                         |
| ----------- | ----------------- | ------------------------------------------------------------------- |
| Clean       | Switch (primary)  | Triggers an immediate cleaning cycle. Auto-resets to off once sent. |
| Night Light | Lightbulb         | Turns the night light on or off. Optional — controlled by `showNightLight`. |

Night Light is nested under the Clean button in the Home app detail view.

### Sensors

| Service      | Type               | Description                                                                       |
| ------------ | ------------------ | --------------------------------------------------------------------------------- |
| Waste Drawer | Filter Maintenance | Shows a change alert when the drawer is full; displays fill level as a percentage. Optional — controlled by `showWasteDrawer`. |
| Cleaning     | Motion Sensor      | Active while a cleaning cycle is in progress. Optional — controlled by `showMotionSensor`. |

## Development

**Setup:**

```bash
npm install
```

`npm install` builds the project and installs a pre-push git hook (via Husky) that runs lint, format check, and build before every push.

Create a `.whiskerCredentials` file in the project root with your email on line 1 and password on line 2:

```
your@email.com
yourpassword
```

**Test script:**

```bash
npm run console -- <command>
```

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `get`                | Fetch and print all devices as JSON |
| `subscribe <serial>` | Stream live device updates          |
| `clean <serial>`     | Trigger an immediate cleaning cycle |
| `help`               | Show available commands             |

## Publishing

1. Bump the version in `package.json` following [semver](https://semver.org):
   - Patch (`0.0.x`) — bug fixes
   - Minor (`0.x.0`) — new features, backwards-compatible
   - Major (`x.0.0`) — breaking changes

2. Publish to npm:

   ```bash
   npm publish
   ```

   Lint, format check, and build run automatically before publishing. Public access is set by default via `publishConfig` in `package.json`.

## Acknowledgements

The Whisker API used by this plugin was reverse-engineered by [Nathan Spencer](https://github.com/natekspencer), whose work on [pylitterbot](https://github.com/natekspencer/pylitterbot) made this possible.

## Disclaimer

This plugin uses the Whisker cloud API, which is not officially supported. It may break without notice if Whisker changes their backend.
