# Flutter Dependency Analyzer

A Visual Studio Code extension that helps Flutter developers manage their project dependencies effectively. This extension checks for unused dependencies, outdated dependencies, and provides health scores for each dependency found in the `pubspec.yaml` file.

## Features

- **List Flutter Dependencies**: View all dependencies listed in your `pubspec.yaml`.
- **Check for Unused Dependencies**: Identify and manage dependencies that are no longer being used in your project.
- **Check for Outdated Dependencies**: Quickly find which dependencies need to be updated to their latest versions.
- **List Dependencies with Health Scores**: Get a detailed view of each dependency's health, including:
  - Popularity
  - Health status (Good, Average, Poor, Unknown)
  - Maintenance status

## Usage

1. **Install the Extension**: Search for "Flutter Dependency Analyzer" in the Extensions view (`Ctrl+Shift+X`) and install it.
  
2. **Commands**:

   - **List Flutter Dependencies**:

     - Command: `List Flutter Dependencies`
     - Displays all dependencies found in `pubspec.yaml`.
   - **Check Unused Dependencies**:
     - Command: `Check Unused Dependencies`
     - Identifies dependencies that are not being used in the code.
   - **Check Outdated Dependencies**:
     - Command: `Check Outdated Dependencies`
     - Lists dependencies that are outdated and need updating.
   - **List Dependencies with Health Scores**:
     - Command: `List Flutter Dependencies with Health`
     - Shows dependencies along with their health metrics:
       - **Package**: The name of the dependency
       - **Version**: The version specified in your `pubspec.yaml`
       - **Health**: A textual indicator showing the health status of the dependency (e.g., `[Good]`, `[Average]`, `[Poor]`, `[Unknown]`)
       - **Popularity**: Popularity score of the dependency
       - **Maintenance**: Maintenance status of the dependency

## Example Output

When using the `List Flutter Dependencies with Health` command, you can expect an output similar to the following:


## Requirements

- Visual Studio Code
- A Flutter project with a `pubspec.yaml` file

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window.
3. Search for "Flutter Dependency Analyzer" and click **Install**.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you encounter any bugs or have suggestions for improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
