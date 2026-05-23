# Changelog

## [0.4.0] - 2026-05-23

### Fixed
- Renaming a button (e.g. "Clean") on one Litter Robot no longer renames the same button on other Litter Robots.
- Moving an accessory to a different room in the Home app now persists correctly across page refreshes.

## [0.3.2] - 2026-05-23

### Fixed
- WebSocket error messages now include additional fallback detail for unknown error types.
- Updated README.
- Added homepage and repository URLs to package.

## [0.3.1] - 2026-05-19

### Fixed
- Improved error logging with more descriptive messages.

## [0.3.0] - 2026-05-12

### Added
- Motion sensor is now optional (enabled by default); can be hidden via `showMotionSensor: false`.
- Night light has a new `auto` mode in addition to on/off.

### Changed
- Improved config layout in the Homebridge UI.

## [0.2.0] - 2026-05-11

### Added
- Optional waste drawer level exposed as a Filter Maintenance accessory (`showWasteDrawer`).
- Error shown in Home app when attempting to start a cleaning cycle in an invalid state.

### Fixed
- `isPoweredOn` calculation corrected.

## [0.1.0] - 2026-05-09

### Added
- Real-time state updates via WebSocket subscription.
- Night light control.
- Lint and Prettier enforcement on push and publish.

### Changed
- Reduced accessory surface area to focus on the cleaning cycle switch as the primary control.

## [0.0.1] - 2026-05-08

### Added
- Initial release.
- Litter Robot 4 support via Whisker GraphQL API with Cognito authentication.
- Clean cycle switch, firmware version reporting, and serial number identification.
