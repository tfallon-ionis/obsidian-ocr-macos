// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ocr-cli",
    platforms: [
        .macOS(.v10_15)
    ],
    targets: [
        .executableTarget(
            name: "ocr-cli",
            path: "Sources/ocr-cli"
        )
    ]
)
