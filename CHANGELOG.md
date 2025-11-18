# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Migrated codebase to TypeScript file format (.ts extensions)
- Minimum Node.js version now 16.0.0 (added support for 20.x, 22.x)

## [4.0.0] - 2022-10-24

### Added
- Support for multiple cache stores (local and remote) in configuration

### Changed
- **BREAKING**: Configuration interface restructured - settings now require explicit `enabled: boolean` property instead of implicit undefined/null/object pattern
- **BREAKING**: Requires `@ha-store/redis` 3.x or higher
- Improved coalescing algorithm to prevent redundant remote store queries

### Fixed
- Fixed broken `store.clear('*')` operation for clearing all cache

## [3.2.0] - 2022-06-23

### Added
- Logo added to README and npm package page

### Changed
- Updated all dependencies to latest versions

### Fixed
- Removed `setMaxListeners(Infinity)` call (#116)
- Fixed missing README documentation on npmjs.org package page (#117)
- Event emitter and type definition issues (#113)

## [3.1.0] - 2021-12-20

### Added
- Security policy (SECURITY.md)
- CodeQL automated security scanning workflow
- `cause` attribute to query events (indicates "limit" or "timeout" trigger)
- Support for non-promise resolvers

### Changed
- **BREAKING**: Modified output format of `size()` method
- **BREAKING**: Event payloads for `cacheHit`, `cacheMiss`, and `coalescedHit` now return numbers directly instead of object format
- Complete rewrite of query system for better maintainability
- Replaced native storage library with pure JavaScript implementation for better portability
- Refactored buffer mechanism (removed native LRU dependency)

### Improved
- 4x reduction in memory usage through optimized buffer structure
- Significant performance improvements in speed and memory efficiency

## [3.0.0] - 2021-07-12

### Added
- `getMany()` method for multi-item queries with Promise.allSettled formatting
- TypeScript type definitions
- GitHub Actions CI/CD implementation

### Changed
- **BREAKING**: Separated multi-item query interface from single-item operations
- **BREAKING**: API terminology changes:
  - `batch.tick` → `batch.delay`
  - `batch.max` → `batch.limit`
  - `uniqueParams` → `delimiter`
- **BREAKING**: Removed custom response parser - only itemized objects accepted
- Updated linting configuration and dependencies

## [1.14.1] - 2019-04-08

### Fixed
- Bug fixes and stability improvements

## [1.13.0] - 2019-03-29

### Added
- Feature enhancements and improvements

## [1.12.2] - 2019-03-22

### Fixed
- Performance and stability fixes

## [1.7.1] - 2018-11-14

### Fixed
- Bug fixes and improvements

## [1.5.0] - 2018-10-12

Initial stable release.

---

For more details on each release, see the [releases page](https://github.com/fed135/ha-store/releases).
