# Contributing to K.I.D.S.

Thank you for your interest in contributing to the **Kids Intelligent Dashboard System (K.I.D.S.) Android Collector**!

## Development Guidelines

1. **Clean Architecture & Invariants**:
   - Strictly respect zero-backend guarantees. No external servers or telemetry trackers.
   - Do not request broader OAuth scopes than `drive.file` and `spreadsheets`.
   - On-device ML Kit OCR must remain offline.
2. **Coding Standards**:
   - Follow official Kotlin coding style (`kotlin.code.style=official`).
   - Use Jetpack Compose Material 3 and follow WCAG 2.1 AA accessibility (48dp touch targets, semantic content descriptions).
   - Use Kotlin Version Catalog (`gradle/libs.versions.toml`) for managing all dependencies.
3. **Submitting Changes**:
   - Fork the repository and create a feature branch (`git checkout -b feature/your-feature`).
   - Write comprehensive unit tests in `app/src/test/java/com/kids/collector/`.
   - Ensure `./gradlew test` passes cleanly.
   - Submit a Pull Request referencing the PR template.
