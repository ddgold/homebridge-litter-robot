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

| Field      | Required | Description                                                                      |
| ---------- | -------- | -------------------------------------------------------------------------------- |
| `username` | Yes      | Your Whisker account email                                                       |
| `password` | Yes      | Your Whisker account password                                                    |
| `pollRate` | No       | How often (in seconds) to sync device state. Minimum 60, default 300 (5 minutes) |

## HomeKit Services

Each Litter-Robot 4 appears as a single accessory with the following services:

### Controls

| Service     | Type             | Description                                                         |
| ----------- | ---------------- | ------------------------------------------------------------------- |
| Clean       | Switch (primary) | Triggers an immediate cleaning cycle. Auto-resets to off once sent. |
| Power       | Switch           | Turns the unit on or off                                            |
| Panel Lock  | Switch           | Locks or unlocks the control panel                                  |
| Night Light | Switch           | Turns the night light on or off                                     |

Power, Panel Lock, and Night Light are nested under the Clean button in the Home app detail view.

### Sensors

| Service      | Type               | Description                                                                       |
| ------------ | ------------------ | --------------------------------------------------------------------------------- |
| Occupancy    | Occupancy Sensor   | Active while a cat is detected in the unit                                        |
| Waste Drawer | Filter Maintenance | Shows a change alert when the drawer is full; displays fill level as a percentage |
| Cleaning     | Motion Sensor      | Active while a cleaning cycle is in progress                                      |

## Acknowledgements

The Whisker API used by this plugin was reverse-engineered by [Nathan Spencer](https://github.com/natekspencer), whose work on [pylitterbot](https://github.com/natekspencer/pylitterbot) made this possible.

## Disclaimer

This plugin uses the Whisker cloud API, which is not officially supported. It may break without notice if Whisker changes their backend.
